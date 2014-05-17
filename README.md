# connect-cassandra-cql
Session store for connect using Cassandra CQL3 binary protocol.

## Installation
```
npm install connect-cassandra-cql
```

## Usage
Express 4
```javascript
var express = require('express'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    CassandraCqlStore = require('connect-cassandra-cql')(session),
    Client = require('node-cassandra-cql').Client;

var client = new Client({hosts: ['localhost'], keyspace: 'myKeyspace'});
var config = {client: client};

var app = express();
app.use(cookieParser());
app.use(session({secret: 'keyboard-cat', store: new CassandraCqlStore(config)));
```

Express 3
```javascript
var express = require('express'),
    CassandraCqlStore = require('connect-cassandra-cql')(express),
    Client = require('node-cassandra-cql').Client;

var client = new Client({hosts: ['localhost'], keyspace: 'myKeyspace'});
var config = {client: client};

var app = express();
app.use(express.cookieParser());
app.use(express.session({secret: 'keyboard-cat', store: new CassandraCqlStore(config)));
```
config is an object with these keys:
```
client: node-cassandra-cql object. mandatory.
ttl: how long, in seconds, to save the session. if the session cookie have maxAge, it will be used, otherwise, 86400 (one day).
table: the table name to use. defaults to 'connect_session'.
readConsistency: cassandra read consistency, defaults to 1.
writeConsistency: cassandra write consistency, defaults to any.
```

## License

connect-cassandra-cql is distributed under the [MIT license](https://raw.github.com/asafyish/connect-cassandra-cql/master/LICENSE).