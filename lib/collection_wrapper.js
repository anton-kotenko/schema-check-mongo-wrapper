/**
 * Promise aware wrapper around mongo db direvers Collection
 */
var Tools = require(__dirname + '/tools.js'),
    CursorWrapper = require(__dirname + '/cursor_wrapper.js'),
    DebugCtx = require(__dirname + '/debug_ctx.js'),
    EventEmitter = require('events').EventEmitter,
    Util = require('util'),
    /**
     * @constructor {CollectionWrapper}
     * @param {Connection} connectionWrapper
     * @param {String} collectionName
     * @emits {DebugCtx#debug}
     */
    CollectionWrapper = function (connectionWrapper, collectionName) {
        this._collectionName = collectionName;
        this._nativeCollectionPromise = connectionWrapper.connect().then(function (connectionWrapper) {
            return connectionWrapper.nativeCollection(collectionName);
        });
    };

Util.inherits(CollectionWrapper, EventEmitter);

/**
 * Return collection's name
 * @returns {String}
 */
CollectionWrapper.prototype.getCollectionName = function () {
    return this._collectionName;
};

/**
 * @param {MongoQueryDocument} query
 * @param {Object} [options={}]
 * @see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/collection.html#find
 * @returns {CursorWrapper}
 */
CollectionWrapper.prototype.find = function () {
    var args = arguments,
        debugCtx = this._getNewDebugCtx(),
        cursor = new CursorWrapper(this._nativeCollectionPromise.then(function (nativeCollection) {

            return nativeCollection.find.apply(nativeCollection, args);
        }), debugCtx);

    debugCtx.log('find', arguments);
    return cursor;
};

CollectionWrapper.prototype.insert = function () {
    var args = arguments,
        debugCtx = this._getNewDebugCtx(),
        that = this;

    return this._nativeCollectionPromise.then(function (nativeCollection) {
        var promise = Tools.promisify(nativeCollection, nativeCollection.insert)
            .apply(that, args)
            .then(function (result) {
                return result.ops;
            });
        return debugCtx.intercept('insert', args, promise);
    });
};

CollectionWrapper.prototype.save = function () {
    var args = arguments,
        debugCtx = this._getNewDebugCtx(),
        that = this;

    return this._nativeCollectionPromise.then(function (nativeCollection) {
        var promise = Tools.promisify(nativeCollection, nativeCollection.save)
            .apply(that, args)
            .then(function (result) {
                //when save operation work as insert
                //result contains ops array, and should return inserted document
                //if save operation work as update/upsert
                //it should return count of processed documents
                if (result.ops) {
                    return result.ops[0];
                } else {
                    return result.result.n;
                }
            });
        return debugCtx.intercept('save', args, promise);
    });
};

CollectionWrapper.prototype.update = function () {
    var args = arguments,
        debugCtx = this._getNewDebugCtx(),
        that = this;

    return this._nativeCollectionPromise.then(function (nativeCollection) {
        var promise = Tools.promisify(nativeCollection, nativeCollection.update)
            .apply(that, args)
            .then(function (result) {
                return result.result.n;
            });
        return debugCtx.intercept('update', args, promise);
    });
};

CollectionWrapper.prototype.remove = function () {
    var args = arguments,
        debugCtx = this._getNewDebugCtx(),
        that = this;

    return this._nativeCollectionPromise.then(function (nativeCollection) {
        var promise = Tools.promisify(nativeCollection, nativeCollection.remove)
            .apply(that, args)
            .then(function (result) {
                return result.result.n;
            });
        return debugCtx.intercept('remove', args, promise);
    });
};

//proxy most popular methods of Collection transforming
//them from callback-style into promise style
//@see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/collection.html
//for docs to theese methods
[
    'aggregate', 'count',
    'findOne', 'ensureIndex', 'findAndModify',
    'drop'
].forEach(function (methodName) {
    CollectionWrapper.prototype[methodName] = function () {
        var that = this,
            args = arguments,
            debugCtx = this._getNewDebugCtx();

        return this._nativeCollectionPromise.then(function (nativeCollection) {
            var promise = Tools.promisify(nativeCollection, nativeCollection[methodName]).apply(that, args);
            return debugCtx.intercept(methodName, args, promise);
        });
    };
});

/**
 * Create new debug context for logging
 * operations on mongo db
 * @returns {DebugCtx}
 */
CollectionWrapper.prototype._getNewDebugCtx = function () {
    var debugCtx = new DebugCtx(this);
    debugCtx.once('debug', this.emit.bind(this, 'debug'));
    return debugCtx;
};

module.exports = CollectionWrapper;
