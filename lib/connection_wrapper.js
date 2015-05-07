var MongoDb = require('mongodb'),
    Vow = require('vow'),
    SafeCollectionWrapper = require(__dirname + '/safe_collection.js'),
    ConnectionWrapper = function (connectionUrl, connectionOptions) {
        this._connectionUrl = connectionUrl;
        this._connectionOptions = connectionOptions;
    };

ConnectionWrapper.prototype = {

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
    collection: function (collectionName) {
        return new SafeCollectionWrapper(this, collectionName);
    },

    nativeCollection: function (collectionName) {
        if (!this._db) {
            throw new Error('not connected');
        }
        return this._db.collection(collectionName);
    }

};

ConnectionWrapper.get = function (connectionUrl, connectionOptions) {
    var cacheKey = connectionUrl + JSON.stringify(connectionOptions);
    this._cache = this._cache || {};
    if (!this._cache[cacheKey]) {
        this._cache[cacheKey] = new ConnectionWrapper(connectionUrl, connectionOptions);
    }
    return this._cache[cacheKey];
};
module.exports = ConnectionWrapper;

