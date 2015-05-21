/**
 * Promise aware wrapper over mongo db native driver, that
 * provides checks for data written to database
 * using json schemas
 */
/**
 * @typedef {Object} ValidateOptions
 * @property {Boolean} [enforceChecks = true]
 * @property {Boolean} [warnOnWrongData = false]
 *
 */
var TV4 = require('tv4'),
    Util = require('util'),
    MongoUpdate = require(__dirname + '/mongo_update.js'),
    MongoQuery = require(__dirname + '/mongo_query.js'),
    CollectionWrapper = require(__dirname + '/collection_wrapper.js'),
    SchemaStorage = require(__dirname + '/schema_storage.js'),
    Vow = require('vow'),
    /**
     * @constructor {SafeCollection}
     * @param {Connection} connectionWrapper
     * @param {String} collectionName
     * @param {Object} [schema]
     * @param {ValidateOptions} [validateOptions]
     */
    SafeCollection = function (connectionWrapper, collectionName, schema, validateOptions) { //jshint ignore: line
        CollectionWrapper.apply(this, arguments);

        this.setCheckEnforcement(false)
            .warnOnWrongData(false);

        if (schema) {
            this.attachSchema(schema);
            if (validateOptions && validateOptions.warnOnWrongData !== undefined) {
                this.warnOnWrongData(Boolean(validateOptions.warnOnWrongData));
            }
            if (validateOptions && validateOptions.enforceChecks !== undefined) {
                this.setCheckEnforcement(Boolean(validateOptions.enforceChecks));
            } else {
                this.setCheckEnforcement(true);
            }
        }
    };

Util.inherits(SafeCollection, CollectionWrapper);

/**
 * Insert document into mongo, but before insert
 * check if it matches schema
 * @see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/collection.html#insert
 * @param {MongoDocument} doc
 * @returns {Vow.promise<MongoDocument[]>} promise to array with inserted documents
 */
SafeCollection.prototype.insert = function (doc) {
    var args = arguments;

    return this.validateWithDefaultSchema(doc)
        .then(function () {
            return this.unsafeInsert.apply(this, args);
        }.bind(this));
};

/**
 * Save document into mongo, but before saving
 * check if it matches schema
 * @see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/collection.html#save
 * @param {MongoDocument} doc
 * @returns {Vow.promise<Number>}
 */
SafeCollection.prototype.save = function (doc) {
    var args = arguments;

    return this.validateWithDefaultSchema(doc)
        .then(function () {
            return this.unsafeSave.apply(this, args);
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
SafeCollection.prototype.update = function (condition, update, options) {
    var that = this;

    options = options || {};

    //short path: avoid excessive find's
    //if there are no schema anyway
    if (!this._schema) {
        return that.unsafeUpdate(condition, update, options);
    }

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
            return that.unsafeUpdate(condition, update, options);
        });
    });
};

/**
 * Same as insert method, but does not validate
 * inserted document anyway
 */
SafeCollection.prototype.unsafeInsert = CollectionWrapper.prototype.insert;

/**
 * Same as update method, but does not validate
 * updated document anyway
 */
SafeCollection.prototype.unsafeUpdate = CollectionWrapper.prototype.update;

/**
 * Same as save method, but does not validate
 * saved document anyway
 */
SafeCollection.prototype.unsafeSave = CollectionWrapper.prototype.save;

/**
 * Validate document doc with schema attached to collection
 * @param {MongoDocument} doc
 * @returns {Vow.Promise<MongoDocument, Error>}
 */
SafeCollection.prototype.validateWithDefaultSchema = function (doc) {
    if (!this._schema) {
        if (this._enforceChecks) {
            return Vow.reject(new Error('No schema for collection with enforced policy check'));
        } else {
            return Vow.fulfill(doc);
        }
    }

    return this.validate(doc, this._schema).always(function (promise) {
        if (this._warningsEnabled && promise.isRejected()) {
            console.log(promise.valueOf());
        }
        if (this._enforceChecks) {
            return promise;
        } else {
            return Vow.fulfill(doc);
        }
    }.bind(this));
};

/**
 * Valdate document with json shema
 * @param {Object} doc
 * @param {Object|String} schema json schema
 * @returns {Vow.Promise<Object, Error>} return document on success
 */
SafeCollection.prototype.validate = function (doc, schema) {
    var promise = Vow.promise(),
        normalizedDoc,
        validationResult;

    try {
        //can not validate not valid json
        //for example mongo's ObjectIds can not
        //be validated in terms of json schema
        //because it is Object
        normalizedDoc = JSON.parse(JSON.stringify(doc));
    } catch (e) {
        promise.reject(new Error('Can not normalize document before validation'));
    }
    validationResult = TV4.validateResult(normalizedDoc, schema);
    if (!validationResult.valid) {
        promise.reject(validationResult.error);
    } else {
        promise.fulfill(doc);
    }
    return promise;
};

/**
 * Attach schema to verify documents
 * @param {Object|String} schema json schema
 * @see http://spacetelescope.github.io/understanding-json-schema/index.html
 * Accept schema or string in the case of string, string is used as
 * url of schema
 * @returns {SafeCollection} return just this
 */
SafeCollection.prototype.attachSchema = function (schema) {
    if (typeof(schema) === 'string') {
        schema = SchemaStorage.getSchema(schema);
    }
    if (!schema) {
        throw  new Error('incorrect/missing schema');
    }
    this._schema = this._injectIdFieldIntoSchema(schema);
    return this;
};

/**
 * Enable/disable warnings about incorrect documents
 * at console
 * @param {Boolean} [enable=false]
 * @returns {SafeCollection} return this to make possible chaining
 */
SafeCollection.prototype.warnOnWrongData = function (enable) {
    this._warningsEnabled = Boolean(enable);
    return this;
};

/**
 * Set enforce checks: make operations
 * to fail if schema is incorrect
 * @param {Boolenan} enforce
 * @returns {SafeCollection} return just this
 */
SafeCollection.prototype.setCheckEnforcement = function (enforce) {
    this._enforceChecks = Boolean(enforce);
    return this;
};

/**
 * Create copy of object to allow it's modification
 * without chanes in original object.
 * Copying is done only at FIRST level.
 * @param {Object} object
 * @returns {Object}
 */
SafeCollection.prototype._copyObject = function (object) {
    return Object.keys(object).reduce(function (copy, key) {
        copy[key] = object[key];
        return copy;
    }, {});
};

/**
 * Transform json shema in way, that it accepts presence of _id field,
 * and validates it to be correct.
 * This is required because mongo collection always have _id field
 * @param {Object} schema
 * @returns {Object}
 */
SafeCollection.prototype._injectIdFieldIntoSchema = function (schema) {
    var schemaCopy;
    if (!(schema instanceof Object)) {
        throw new Error('Incorrect schema');
    }
    if (schema.type !== 'object') {
        throw new Error('Incorrect schema');
    }
    schemaCopy = this._copyObject(schema);
    schemaCopy.properties = this._copyObject(schemaCopy.properties || {});
    schemaCopy.properties._id = {
        type: 'string',
        pattern: '^[0-9a-f]{24}$'
    };
    return schemaCopy;
};

module.exports = SafeCollection;
