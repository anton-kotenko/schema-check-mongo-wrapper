/**
 * Promise aware wrapper around native mongo db driver collection
 */
var MongoDb = require('mongodb'),
    Vow = require('vow'),
    SafeCollectionWrapper = require(__dirname + '/safe_collection.js'),
    /**
     * @constructor {ConnectionWrapper}
     * @param {String} connectionUrl http://docs.mongodb.org/master/reference/connection-string/
     * @param {Object} [connectionOptions={}] http://mongodb.github.io/node-mongodb-native/1.4/driver-articles/mongoclient.html#mongoclient-connect-options
     */
    ConnectionWrapper = function (connectionUrl, connectionOptions) {
        this._connectionUrl = connectionUrl;
        this._connectionOptions = connectionOptions || {};
    };

ConnectionWrapper.prototype = {

    /**
     * Connect to mongo server.
     * @returns {Vow.promise<ConnectionWrapper>} return promise to this
     */
    connect: function () {
        var that = this,
            domainAwarePromise = Vow.promise();

        if (!this._connectionPromise) {
            this._connectionPromise = Vow.promise();
            MongoDb.MongoClient.connect(this._connectionUrl, this._connectionOptions, function (err, db) {
                if (err || !db) {
                    that._connectionPromise.reject(err);
                } else {
                    that._db = db;
                    that._connectionPromise.fulfill(that);
                    db.on('close', function () {
                        db.close();
                        that._connectionPromise.reject(new Error('connection refused'));
                    });
                }
            });
        }

        domainAwarePromise.sync(this._connectionPromise);
        return domainAwarePromise;
    },

    /**
     * Get collection by name
     * @param {String} collectionName
     * @returns {SafeCollectionWrapper}
     */
    collection: function (collectionName) {
        return new SafeCollectionWrapper(this, collectionName);
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
 * @returns {ConnectionWrapper}
 */
ConnectionWrapper.get = function (connectionUrl, connectionOptions) {
    var cacheKey = connectionUrl + JSON.stringify(connectionOptions || {});
    this._cache = this._cache || {};
    if (!this._cache[cacheKey]) {
        this._cache[cacheKey] = new ConnectionWrapper(connectionUrl, connectionOptions);
    }
    return this._cache[cacheKey];
};
module.exports = ConnectionWrapper;

