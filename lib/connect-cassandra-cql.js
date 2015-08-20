var util = require('util'),
    oneDay = 86400;

module.exports = function (connectOrSession) {
    var Store;
    var existingColumnFamilyException = 'Cannot add already existing column family';

    if (connectOrSession.session && connectOrSession.session.Store) {
        // Express 3
        Store = connectOrSession.session.Store;
    } else if (connectOrSession.Store) {
        // Express 4
        Store = connectOrSession.Store;
    } else {
        throw new Error('The supplied parameter is neither Express3 object or Express4 session object.');
    }

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
        this.readConsistency = options.readConsistency || 1;
        this.writeConsistency = options.writeConsistency || 0;

        var cql = util.format('CREATE TABLE IF NOT EXISTS %s (sid text PRIMARY KEY, session text)', this.table);

        // There is no point in using a prepared statement because this happens once
        this.client.execute(cql, function (err) {
            if (err && err.message.indexOf(existingColumnFamilyException) === -1) {

                // Some kind of error have occurred while trying to connect to cassandra
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
        this.client.execute(this.getSession, [sid], {consistency: this.readConsistency, prepare: true}, function (err, result) {
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
            ttl = this.ttl || ('number' === typeof maxAge ? maxAge / 1000 | 0 : oneDay),
            cql = util.format('UPDATE %s USING TTL %d SET session = ? WHERE sid = ?', this.table, ttl);

        this.client.execute(cql, [JSON.stringify(session), sid], {consistency: this.writeConsistency, prepare: true}, callback);
    };

    /**
     * Destroy the session associated with the given `sid`.
     *
     * @param {String} sid
     * @param {Function} callback
     * @api public
     */
    CassandraCqlStore.prototype.destroy = function (sid, callback) {
        this.client.execute(this.deleteSession, [sid], {consistency: this.writeConsistency, prepare: true}, callback);
    };

    return CassandraCqlStore;
};
