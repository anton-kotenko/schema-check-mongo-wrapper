/**
 * Promise aware wrapper around native mongo db driver collection
 */
var MongoDb = require('mongodb'),
    Vow = require('vow'),
    SafeCollection = require(__dirname + '/safe_collection.js'),
    ConnectionConfigProvider = require(__dirname + '/connection_config_provider.js'),
    /**
     * @constructor {Connection}
     * @param {String|ConnectionConfigProvider} connectionUrl http://docs.mongodb.org/master/reference/connection-string/
     * @param {Object} [connectionOptions={}] http://mongodb.github.io/node-mongodb-native/1.4/driver-articles/mongoclient.html#mongoclient-connect-options
     */
    Connection = function (connectionUrl) {
        if (connectionUrl instanceof ConnectionConfigProvider) {
            this._connectionConfig = connectionUrl;
        } else {
            this._connectionConfig = ConnectionConfigProvider.create(arguments);
        }

    };

Connection.prototype = {

    /**
     * Connect to mongo server. Actually wrapper around _connect method
     * that provides caching and fixes domain (https://nodejs.org/api/domain.html)
     * @returns {Vow.promise<Connection>} return promise to this
     */
    connect: function () {

        if (!this._connectionPromise) {
            this._connectionPromise = this._connectionConfig.get().then(function (config) {
                return this._connect(config.url, config.options);
            }.bind(this));
        }
        return this._connectionPromise;
    },

    _connect: function (connectionUrl, connectionOptions) {
        var promise = Vow.promise(),
            that = this;

        MongoDb.MongoClient.connect(connectionUrl, connectionOptions, function (err, db) {
            if (err || !db) {
                promise.reject(err);
            } else {
                that._db = db;
                promise.fulfill(that);
                db.on('close', function () {
                    db.close();
                    promise.reject(new Error('connection refused'));
                });
            }
        });
        return promise;
    },

    /**
     * Get collection by name
     * @param {String} collectionName
     * @param {Object} [schema]
     * @param {ValidateOptions} [validateOptions]
     * @returns {SafeCollection}
     */
    collection: function (collectionName, schema, validateOptions) {
        return new SafeCollection(this, collectionName, schema, validateOptions);
    },

    /**
     * Get native mongo driver collection
     * @param {String} collectionName
     * @returns {Collection}
     */
    nativeCollection: function (collectionName) {
        if (!this._db) {
            throw new Error('not connected');
        }
        return this._db.collection(collectionName);
    }

};

/**
 * Get connection to mongo server. Function caches connections per pair connectionUrl + connectionOptions
 * @param {String} connectionUrl http://docs.mongodb.org/master/reference/connection-string/
 * @param {Object} [connectionOptions={}] http://mongodb.github.io/node-mongodb-native/1.4/driver-articles/mongoclient.html#mongoclient-connect-options
 * @returns {Connection}
 */
Connection.get = function (connectionUrl, connectionOptions) {
    var cacheKey = connectionUrl + JSON.stringify(connectionOptions || {});
    this._cache = this._cache || {};
    if (!this._cache[cacheKey]) {
        this._cache[cacheKey] = new Connection(connectionUrl, connectionOptions);
    }
    return this._cache[cacheKey];
};
module.exports = Connection;

