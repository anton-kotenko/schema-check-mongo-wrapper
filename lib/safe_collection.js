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
SafeCollectionWrapper.prototype.insert = function (doc) {
    var args = arguments;
    return this.validateWithDefaultSchema(doc)
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
SafeCollectionWrapper.prototype.save = function (doc) {
    var args = arguments;
    return this.validateWithDefaultSchema(doc)
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
SafeCollectionWrapper.prototype.update = function (condition, update, options) {
    var that = this,
        base = CollectionWrapper.prototype.update;

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
            return that.validateWithDefaultSchema(updatedDoc);
        })).then(function () {
            return base.call(that, condition, update, options);
        });
    });
};

SafeCollectionWrapper.prototype.unsafeInsert = function () {
    return CollectionWrapper.insert.apply(this, arguments);
};

SafeCollectionWrapper.prototype.unsafeUpdate = function () {
    return CollectionWrapper.update.apply(this, arguments);
};

SafeCollectionWrapper.prototype.unsafeSave = function () {
    return CollectionWrapper.save.apply(this, arguments);
};

/**
 * Validate document doc with schema attached to collection
 * @param {MongoDocument} doc
 * @returns {Vow.Promise<MongoDocument, Error>}
 */
SafeCollectionWrapper.prototype.validateWithDefaultSchema = function (doc) {
    if (!this._schema) {
        if (this._enforceChecks) {
            return Vow.reject(new Error('No schema for collection with enforced policy check'));
        } else {
            return Vow.fulfill(doc);
        }
    }
    return this.validate(doc, this._schema);
};

SafeCollectionWrapper.prototype.validate = function (doc, schema) {
    var promise = Vow.promise();
    try {
        //can not validate not valid json
        //for example mongo's ObjectIds can not
        //be validated in terms of json schema
        //because it is Object
        doc = JSON.parse(JSON.stringify(doc));
    } catch (e) {
        promise.reject(new Error());
    }
    if (!TV4.validate(doc, schema)) {
        console.log('rejected!!!!!!', doc, schema, TV4.error);
        promise.reject(new Error());
    } else {
        promise.fulfill(doc);
    }
    return promise;
};

SafeCollectionWrapper.prototype.attachSchema = function (schema) {
    this._schema = this._injectIdFieldIntoSchema(schema);
};

SafeCollectionWrapper.prototype.setCheckEnforcement = function (enforce) {
    this._enforceChecks = Boolean(enforce);
};

SafeCollectionWrapper.prototype._copyObject = function (object) {
    return Object.keys(object).reduce(function (copy, key) {
        copy[key] = object[key];
        return copy;
    }, {});
};

SafeCollectionWrapper.prototype._injectIdFieldIntoSchema = function (schema) {
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

module.exports = SafeCollectionWrapper;
