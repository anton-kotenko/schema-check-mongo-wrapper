/**
 * Helper class, that provides tools
 * to work with condition in mongo db language
 */

/**
 * @typedef {Object} MongoQueryDocument
 */

var assert = require('assert'),
    /**
     * @constructor {MongoQuery}
     * @param {MongoQueryDocument} [query={}]
     */
    MongoQuery = function (query) {
        this._query = query || {};
    };

MongoQuery.prototype = {

    /**
     * Check document to match query
     * @param {MongoDocument} document
     * @returns {Boolean}
     */
    match: function (document) {
        return this._match(this._query, document);
    },

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
     * Handle part of query, that corresponds one of operators
     * used at top level of condition (as for now only logical operators)
     * @param {String} operator
     * @param {Object|Object[]} operatorArgs arguments for operator;
     * @param {MongoDocument} document
     * @returns {Boolean}
     * @throws {Error} if operator is unknown
     */
    _matchTopLevelOperator: function (operator, operatorArgs, document) {
        if (this._logicalOperators[operator] === undefined) {
            throw new Error('operator ' + operator + ' is not implemented');
        }
        return this._logicalOperators[operator].call(this, operatorArgs, document);
    },

    /**
     * Handle checks like {fieldName: value/operator}
     * @param {String} field field or fields joined with . symbol (as it's common in mongo}
     * @param {*} subcondition  value to check, actual type depends on what user wants to check
     * @param {MongoDocument} document
     */
    _matchFieldCondition: function (field, subcondition, document) {
        var subdocument = this._findElement(field, document);
        assert(!this._isOperator(field));
        if (this._isPlainObject(subcondition) && this._hasAtLeastOneOperator(subcondition)) {
            return Object.keys(subcondition).every(function (key) {
                assert(this._operators[key], 'opertor ' + key + ' is not implemented');
                return this._operators[key].call(this, subcondition[key], subdocument);
            }, this);
        } else {
            return this._operators.$eq.call(this, subcondition, subdocument);
        }
    },

    /**
     * Check if document matches to condition
     * actually implementaion for match method
     * @param {MongoQueryDocument} condition
     * @param {MongoDocument} document
     */
    _match: function (condition, document) {
        return Object.keys(condition).every(function (field) {
            var subcondition = condition[field];
            if (this._isOperator(field)) {
                return this._matchTopLevelOperator(field, subcondition, document);
            } else {
                return this._matchFieldCondition(field, subcondition, document);
            }
        }, this);
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
    },

    /**
     * Check if condition uses at least one operator
     * to define changes
     * @returns {Boolean}
     */
    _hasAtLeastOneOperator: function (condition) {
        return Object.keys(condition || {}).some(function (key) {
            return key.indexOf('$') !== -1;
        });
    },

    /**
     * Check if argument is plain and emtpy (without any keys) object
     * @param {*} object
     * @returns {Boolean}
     */
    _isEmptyObject: function (object) {
        return this._isPlainObject(object) && (Object.keys(object).length === 0);
    },

    /**
     * Helper method: used to find element by fieldPath argument
     * @param {String} fieldPath element name or set of element names joined with '.' symbol, forming
     * path to element in document
     * @param {MongoDocument} document Important: used by reference
     * @returns {MongoDocument}
     */
    _findElement: function (fieldPath, document) {
        return fieldPath.split('.').reduce(function (subdocument, pathPart) {
            if (subdocument === undefined || subdocument === null ||
                !this._isPlainObject(subdocument)) {
                return undefined;
            } else {
                return subdocument[pathPart];
            }
        }.bind(this), document);
    },

    /**
     * Logical query operators.
     * Placed separately from other operators, as they are used
     * in different way
     * @see http://docs.mongodb.org/master/reference/operator/query/#logical
     * has next signature
     * @param {MongoQueryDocument[]|MongoQueryDocument} condition
     * @param {MongoDocument}
     * @returns {Boolean}
     * @throws {Error} if query is wrong in some way
     */
    _logicalOperators: {
        $and: function (condition, document) {
            if (!(condition instanceof Array) || condition.length < 1) {
                throw new Error('$and operator requires nonempty array as argument');
            }
            return condition.every(function (subcondition) {
                return this._match(subcondition, document);
            }, this);
        },

        $or: function (condition, document) {
            if (!(condition instanceof Array) || condition.length < 1) {
                throw new Error('$or operator requires nonempty array as argument');
            }
            return condition.some(function (subcondition) {
                return this._match(subcondition, document);
            }, this);
        },

        $nor: function (condition, document) {
            if (!(condition instanceof Array) || condition.length < 1) {
                throw new Error('$and operator requires nonempty array as argument');
            }
            return condition.every(function (subcondition) {
                return !this._match(subcondition, document);
            }, this);
        },

        $not: function (condition, document) {
            return !this._match(condition, document);
        }
    },

    /**
     * Query operators implementaion
     * @see http://docs.mongodb.org/master/reference/operator/query/
     * has next signature
     * @param {*} condition may be of any type depending on operator
     * @param {MongoDocument}
     * @returns {Boolean}
     * @throws {Error} if query is wrong in some way
     */
    _operators: {
        $eq: function (condition, document) {
            if (this._isPlainObject(condition)) {
                if (!this._isPlainObject(document)) {
                    return false;
                }
                if (Object.keys(condition).length !== Object.keys(document).length) {
                    return false;
                }
                return Object.keys(condition).every(function (key) {
                    return this._operators.$eq.call(this, condition[key], document[key]);
                }, this);
            }
            if (condition instanceof Array) {
                if (!(document instanceof Array) || document.length !== condition.length) {
                    return false;
                }
                return condition.every(function (subcondition, i) {
                    return this._operators.$eq.call(this, subcondition, document[i]);
                }, this);
            }
            if (condition instanceof Date) {
                return condition.valueOf() === document.valueOf();
            }

            return condition === document;
        },

        $lt: function (condition, document) {
            return condition > document;
        },

        $gt: function (condition, document) {
            return condition < document;
        }
    }

};
module.exports = MongoQuery;
