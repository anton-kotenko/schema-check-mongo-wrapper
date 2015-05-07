var Tools = require(__dirname + '/tools.js'),
    CursorWrapper = require(__dirname + '/cursor_wrapper.js'),
    CollectionWrapper = function (connectionWrapper, collectionName) {
        this._collectionName = collectionName;
        this._nativeCollectionPromise = connectionWrapper.connect().then(function (connectionWrapper) {
            return connectionWrapper.nativeCollection(collectionName);
        });
    };

CollectionWrapper.prototype = {

    /**
     * @returns {CursorWrapper}
     */
    find: function () {
        var args = arguments;
        return new CursorWrapper(this._nativeCollectionPromise.then(function (nativeCollection) {

            return nativeCollection.find.apply(nativeCollection, args);
        }));
    }

};

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
