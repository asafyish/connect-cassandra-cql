var util = require('util'),
    oneDay = 86400;

module.exports = function (connect) {
    var Store = connect.session.Store;
    var existingColumnFamilyException = 'Cannot add already existing column family';

    /**
     * Initialize CassandraCqlStore with the given `options`.
     *
     * @param {Object} options
     * @api public
     */
    function CassandraCqlStore(options) {
        Store.call(this, options);
        this.table = options.table || 'connect_session';
        this.ttl = options.ttl;
        this.client = options.client;
        var cql = util.format('CREATE TABLE %s (sid text PRIMARY KEY, session text)', this.table);

        this.client.execute(cql, [], function (err) {
            if (err && err.message.indexOf(existingColumnFamilyException) == -1) {
                throw err;
            }
        });

        this.getSession = util.format('SELECT session FROM %s WHERE sid = ?', this.table);
        this.deleteSession = util.format('DELETE FROM %s WHERE sid = ?', this.table);
    }

    /**
     * Inherit from `Store`.
     */
    CassandraCqlStore.prototype.__proto__ = Store.prototype;

    /**
     * Attempt to fetch session by the given `sid`.
     *
     * @param {String} sid
     * @param {Function} callback
     * @api public
     */
    CassandraCqlStore.prototype.get = function (sid, callback) {
        this.client.executeAsPrepared(this.getSession, [sid], 1, function (err, result) {
            if (err) {
                return callback(err);
            }

            if (!result || !result.rows || result.rows.length !== 1) {

                // Session not found
                return callback();
            }

            var session = result.rows[0].get('session');
            if (!session) {
                return callback();
            }

            return callback(null, JSON.parse(session));
        });
    };

    /**
     * Persist the given `session` object associated with the given `sid`.
     *
     * @param {String} sid
     * @param {Session} session
     * @param {Function} callback
     * @api public
     */
    CassandraCqlStore.prototype.set = function (sid, session, callback) {
        var maxAge = session.cookie.maxAge,
            ttl = this.ttl || ('number' === typeof maxAge ? maxAge / 1000 | 0 : oneDay);

        session = JSON.stringify(session);
        var cql = util.format('UPDATE %s USING TTL %d SET session = ? WHERE sid = ?', this.table, ttl);
        this.client.executeAsPrepared(cql, [session, sid], 0, callback);
    };

    /**
     * Destroy the session associated with the given `sid`.
     *
     * @param {String} sid
     * @param {Function} callback
     * @api public
     */
    CassandraCqlStore.prototype.destroy = function (sid, callback) {
        this.client.executeAsPrepared(this.deleteSession, [sid], 0, callback);
    };

    return CassandraCqlStore;
};