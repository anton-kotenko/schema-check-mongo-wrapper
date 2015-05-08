/**
 * Promise aware wrapper over mongo db native driver, that
 * provides checks for data written to database
 * using json schemas
 */
var TV4 = require('tv4'),
    Util = require('util'),
    MongoUpdate = require(__dirname + '/mongo_update.js'),
    MongoQuery = require(__dirname + '/mongo_query.js'),
    CollectionWrapper = require(__dirname + '/collection_wrapper.js'),
    Vow = require('vow'),
    /**
     * @constructor {SafeCollectionWrapper}
     * @param {ConnectionWrapper} connectionWrapper
     * @param {String} collectionName
     */
    SafeCollectionWrapper = function (connectionWrapper, collectionName) { //jshint ignore: line
        CollectionWrapper.apply(this, arguments);
    };

Util.inherits(SafeCollectionWrapper, CollectionWrapper);

/**
 * Insert document into mongo, but before insert
 * check if it matches schema
 * @see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/collection.html#insert
 * @param {MongoDocument} doc
 * @returns {Vow.promise<MongoDocument[]>} promise to array with inserted documents
 */
SafeCollectionWrapper.prototype.safeInsert = function (doc) {
    var args = arguments;
    return this.validateDoc(doc)
        .then(function () {
            return this.insert.apply(this, args);
        }.bind(this));
};

/**
 * Save document into mongo, but before saving
 * check if it matches schema
 * @see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/collection.html#save
 * @param {MongoDocument} doc
 * @returns {Vow.promise<Number>}
 */
SafeCollectionWrapper.prototype.safeSave = function (doc) {
    var args = arguments;
    return this.validateDoc(doc)
        .then(function () {
            return this.save.apply(this, args);
        }.bind(this));
};

/**
 * Update document into mongo, but before saving
 * check if it matches schema
 * @see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/collection.html#update
 * @param {MongoQueryDocument} condition
 * @param {MongoUpdateDocument} update
 * @param {MongoUpdateOptions} [options={}]
 * @returns {Vow.promise<Number, Error>}
 */
SafeCollectionWrapper.prototype.safeUpdate = function (condition, update, options) {
    var that = this;
    options = options || {};

    return this.find(condition).toArray().then(function (results) {
        var resultsToValidate = results.slice(0, options.multi ? undefined : 1),
            mongoQuery = new MongoQuery(condition),
            mongoUpdate = new MongoUpdate(update, options);

        if (!resultsToValidate.length) {
            if (options.upsert) {
                //@see http://docs.mongodb.org/master/reference/method/db.collection.update/#upsert-option
                //how upsert forms value
                if (mongoUpdate.isOperatorUpdate()) {
                    resultsToValidate = [mongoQuery.getValuesDefinedByEqualityCondition()];
                } else {
                    resultsToValidate = [{}];
                }
            } else {
                //we change nothing, so return 0
                return 0;
            }
        }

        return Vow.all(resultsToValidate.map(function (oneDoc) {
            var updatedDoc = mongoUpdate.apply(oneDoc);
            return that.validateDoc(updatedDoc);
        })).then(function () {
            return that.update(condition, update, options);
        });
    });
};

/**
 * Validate document doc with schema attached to collection
 * @param {MongoDocument} doc
 * @returns {Vow.Promise<MongoDocument, Error>}
 */
SafeCollectionWrapper.prototype.validateDoc = function (doc) {
    var schemaDecl = SafeCollectionWrapper.getCollectionDecl(this._collectionName),
        promise;
    if (schemaDecl.enforce && !schemaDecl.schema) {
        return Vow.reject(new Error('No schema for collection with enforced policy check'));
    }
    promise = Vow.promise();
    try {
        //can not validate not valid json
        //for example mongo's ObjectIds can not
        //be validated in terms of json schema
        //because it is Object
        doc = JSON.parse(JSON.stringify(doc));
    } catch (e) {
        promise.reject(new Error());
    }
    if (!TV4.validate(doc, schemaDecl.schema)) {
        promise.reject(new Error());
    } else {
        promise.fulfill(doc);
    }
    return promise;
};

SafeCollectionWrapper.setDefaultEnforceValidationPolicy = function (enforce) {
    this._enforceValidationPolicy = Boolean(enforce);
};

SafeCollectionWrapper.getDefaultEnforceValidaionPolicy = function () {
    return Boolean(this._enforceValidationPolicy);
};

SafeCollectionWrapper.declCollection = function (collectionName, jsonSchema, enforce) {
    //FIXME auto enshure _id field;
    enforce = enforce === undefined ? this.getDefaultEnforceValidaionPolicy() : Boolean(enforce);
    this._cache = this._cache || {};
    this._cache[collectionName] = {
        schema: this._injectIdFieldIntoSchema(jsonSchema),
        enforce: enforce
    };
};
SafeCollectionWrapper._copyObject = function (object) {
    return Object.keys(object).reduce(function (copy, key) {
        copy[key] = object[key];
        return copy;
    }, {});
};

SafeCollectionWrapper._injectIdFieldIntoSchema = function (schema) {
    var schemaCopy;
    if (!(schema instanceof Object)) {
        throw new Error();
    }
    if (schema.type !== 'object') {
        throw new Error();
    }
    schemaCopy = this._copyObject(schema);
    schemaCopy.properties = this._copyObject(schemaCopy.properties || {});
    schemaCopy.properties._id = {
        type: 'string',
        patter: '^[0-9a-f]{24}$'
    };
    return schemaCopy;
};

SafeCollectionWrapper.getCollectionDecl = function (collectionName) {
    var schemaDecl = (this._cache || {})[collectionName];
    if (!schemaDecl) {
        schemaDecl = {
            enforce: this.getDefaultEnforceValidaionPolicy()
        };
    }
    return schemaDecl;
};
module.exports = SafeCollectionWrapper;
