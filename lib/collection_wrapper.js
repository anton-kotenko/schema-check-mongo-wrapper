/**
 * Promise aware wrapper around mongo db direvers Collection
 */
var Tools = require(__dirname + '/tools.js'),
    CursorWrapper = require(__dirname + '/cursor_wrapper.js'),
    /**
     * @constructor {CollectionWrapper}
     * @param {ConnectionWrapper} connectionWrapper
     * @param {String} collectionName
     */
    CollectionWrapper = function (connectionWrapper, collectionName) {
        this._collectionName = collectionName;
        this._nativeCollectionPromise = connectionWrapper.connect().then(function (connectionWrapper) {
            return connectionWrapper.nativeCollection(collectionName);
        });
    };

CollectionWrapper.prototype = {

    /**
     * @param {MongoQueryDocument} query
     * @param {Object} [options={}]
     * @see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/collection.html#find
     * @returns {CursorWrapper}
     */
    find: function () {
        var args = arguments;
        return new CursorWrapper(this._nativeCollectionPromise.then(function (nativeCollection) {

            return nativeCollection.find.apply(nativeCollection, args);
        }));
    }

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
            args = arguments;

        return this._nativeCollectionPromise.then(function (nativeCollection) {
            return Tools.promisify(nativeCollection, nativeCollection[methodName]).apply(that, args);
        });
    };
});
module.exports = CollectionWrapper;
