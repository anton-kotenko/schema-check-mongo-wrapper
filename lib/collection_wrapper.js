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
     * @param {ConnectionWrapper} connectionWrapper
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


//proxy most popular methods of Collection transforming
//them from callback-style into promise style
//@see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/collection.html
//for docs to theese methods
[
    'save', 'insert', 'update', 'aggregate', 'count',
    'findOne', 'ensureIndex', 'remove', 'findAndModify',
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
