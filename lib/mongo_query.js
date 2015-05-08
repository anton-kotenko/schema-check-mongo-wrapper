/**
 * Helper class, that provides tools
 * to work with condition in mongo db language
 */

/**
 * @typedef {Object} MongoQueryDocument
 */
/**
 * @constructor {MongoQuery}
 * @param {MongoQueryDocument} [query={}]
 */
var MongoQuery = function (query) {
    this._query = query || {};
};
MongoQuery.prototype = {

    /**
     * Transform MongoQueryDocument into MongoDocument
     * excluding from this._query all operators
     * @see http://docs.mongodb.org/master/reference/operator/query/
     * leaving only condition defined by direct equalty
     * @returns {MongoDocument}
     */
    getValuesDefinedByEqualityCondition: function () {
        return this._lookupTreeForPlainValues(this._query);
    },

    /**
     * Actually implementation for getValuesDefinedByEqualityCondition
     * done as separate function as it is recursive
     * @param {MongoQueryDocument} tree
     * @returns {MongoDocument}
     */
    _lookupTreeForPlainValues: function (tree) {
        var result = {};
        Object.keys(tree).forEach(function (key) {
            var value = tree[key];
            if (this._isOperator(key)) {
                return;
            }
            if (this._isPlainObject(value)) {
                var subtreeValue = this._lookupTreeForPlainValues(value);
                if (Object.keys(subtreeValue).length) {
                    result[key] = subtreeValue;
                }
                return;
            }
            result[key] = value;
        }, this);
        return result;
    },

    /**
     * Check if string is operator in mongo query language
     * @param {String} string
     * @returns {Boolean}
     */
    _isOperator: function (string) {
        return string.indexOf('$') !== -1;
    },

    /**
     * Check if argument is just simple Object,
     * not one of it's childs
     * @param {*} object
     * @returns {Boolean}
     */
    _isPlainObject: function (object) {
        return Boolean(object && (object.constructor === Object));
    }

};
module.exports = MongoQuery;
