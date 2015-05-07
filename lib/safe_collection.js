var TV4 = require('tv4'),
    Util = require('util'),
    MongoUpdate = require(__dirname + '/mongo_update.js'),
    MongoQuery = require(__dirname + '/mongo_query.js'),
    CollectionWrapper = require(__dirname + '/collection_wrapper.js'),
    Vow = require('vow'),
    SafeCollectionWrapper = function (connectionWrapper, collectionName) { //jshint ignore: line
        CollectionWrapper.apply(this, arguments);
    };

Util.inherits(SafeCollectionWrapper, CollectionWrapper);

SafeCollectionWrapper.prototype.safeInsert = function (doc) {
    return this.validateDoc(doc)
        .then(function () {
            return this.insert(doc);
        }.bind(this));
};

SafeCollectionWrapper.prototype.safeSave = function (doc) {
    return this.validateDoc(doc)
        .then(function () {
            return this.save(doc);
        }.bind(this));
};

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