var MongoQuery = function (query) {
    this._query = query || {};
};
MongoQuery.prototype = {

    getValuesDefinedByEqualityCondition: function () {
        return this._lookupTreeForPlainValues(this._query);
    },

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

    _isOperator: function (string) {
        return string.indexOf('$') !== -1;
    },

    _isPlainObject: function (object) {
        return Boolean(object && (object.constructor === Object));
    }

};
module.exports = MongoQuery;
