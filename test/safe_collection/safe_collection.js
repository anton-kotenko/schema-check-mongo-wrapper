/*global describe*/
/*global it*/
/*global after,beforeEach*/
var MongoWrapper = require(__dirname + '/../../'),
    SafeCollection = MongoWrapper.SafeCollection,
    CollectionWrapper = require(__dirname + '/../../lib/collection_wrapper.js'),
    TestTools = require(__dirname + '/../tools/tools.js'),
    assert = require('assert'),
    TV4 = require('tv4'),
    Vow = require('vow');

describe('SafeCollection', function () {

    it('should exists', function () {
        assert(SafeCollection);
    });

    it('should be constructable', function () {
        var connection = TestTools.getConnection(),
            collection = new SafeCollection(connection, TestTools.getCollectionName());

        assert(collection instanceof SafeCollection);
        assert(collection instanceof CollectionWrapper);
        assert.strictEqual(collection._collectionName, TestTools.getCollectionName());

        collection = new SafeCollection(connection, TestTools.getCollectionName(), TestTools.getSchema());
        assert(collection._schema);
        assert.strictEqual(collection._enforceChecks, true);
        assert.strictEqual(collection._warningsEnabled, false);

        MongoWrapper.SchemaStorage.addSchema('http://my.schema.uri', TestTools.getSchema());
        collection = new SafeCollection(connection, TestTools.getCollectionName(), 'http://my.schema.uri');
        assert(collection._schema);
        TV4.dropSchemas();

        collection = new SafeCollection(
            connection,
            TestTools.getCollectionName(),
            TestTools.getSchema(),
            {}
        );

        assert(collection._schema);
        assert.strictEqual(collection._enforceChecks, true);
        assert.strictEqual(collection._warningsEnabled, false);

        collection = new SafeCollection(
            connection,
            TestTools.getCollectionName(),
            TestTools.getSchema(),
            {
                enforceChecks: false
            }
        );

        assert(collection._schema);
        assert.strictEqual(collection._enforceChecks, false);
        assert.strictEqual(collection._warningsEnabled, false);

        collection = new SafeCollection(
            connection,
            TestTools.getCollectionName(),
            TestTools.getSchema(),
            {
                enforceChecks: false,
                warnOnWrongData: true
            }
        );

        assert(collection._schema);
        assert.strictEqual(collection._enforceChecks, false);
        assert.strictEqual(collection._warningsEnabled, true);
    });

    describe('#attachSchema', function () {
        var collection = TestTools.getCollection();

        it('should return this', function () {
            assert.strictEqual(collection, collection.attachSchema(TestTools.getSchema()));
        });

        it('should store schema into _schema field', function () {
            collection.attachSchema(TestTools.getSchema());
            assert(collection._schema);
        });

        it('should transform attached schema to contain _id field', function () {
            collection.attachSchema(TestTools.getSchema());
            assert.deepEqual(
                collection._injectIdFieldIntoSchema(TestTools.getSchema()),
                collection._schema
            );
        });
        it('should fail if argument is not object/string', function () {
            assert.throws(function () {
                collection.attachSchema();
            });
        });
        it('should fail if argument is url and no schema defined for url', function () {
            assert.throws(function () {
                collection.attachSchema('http://url.for.missing.schema');
            });
        });
        it('should attach schema by url', function () {
            MongoWrapper.SchemaStorage.addSchema('http://schema.url', TestTools.getSchema());
            collection.attachSchema('http://schema.url');
            assert(collection._schema);
            TV4.dropSchemas();
        });
    });

    describe('#warnOnWrongData', function () {
        var collection = TestTools.getCollection();

        it('should return this', function () {
            assert.strictEqual(collection, collection.warnOnWrongData(true));
            assert.strictEqual(collection, collection.warnOnWrongData(false));
        });

        it('should update _warningsEnabled field', function () {
            collection.warnOnWrongData(true);
            assert.strictEqual(collection._warningsEnabled, true);
            collection.warnOnWrongData(false);
            assert.strictEqual(collection._warningsEnabled, false);
        });

    });

    describe('#setCheckEnforcement', function () {
        var collection = TestTools.getCollection();
        it('should return this', function () {
            assert.strictEqual(collection, collection.setCheckEnforcement());
            assert.strictEqual(collection, collection.setCheckEnforcement(true));
            assert.strictEqual(collection, collection.setCheckEnforcement(false));
        });
        it('should set _enforceChecks field', function () {
            collection.setCheckEnforcement(false);
            assert.equal(collection._enforceChecks, false);
            collection.setCheckEnforcement();
            assert.equal(collection._enforceChecks, false);
            collection.setCheckEnforcement(true);
            assert.equal(collection._enforceChecks, true);
            collection.setCheckEnforcement('zzz');
            assert.equal(collection._enforceChecks, true);
        });
    });

    describe('#validateWithDefaultSchema', function () {
        it('should fail if no schema but enforcement is enabled', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, 'zzz');

            collection
                .setCheckEnforcement(true);

            collection.validateWithDefaultSchema({}).always(function (promise) {
                if (promise.isRejected()) {
                    done();
                } else {
                    done(new Error());
                }
            });
        });

        it('should not validate document if enforcement is disabled', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, 'zzz');

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(false);

            collection.validateWithDefaultSchema({})
                .always(function (promise) {
                    assert(promise.isFulfilled());
                    return collection.validateWithDefaultSchema({a: 'zzz', b: 1});
                })
                .always(function (promise) {
                    assert(promise.isFulfilled());
                    done(promise.isRejected() ? promise.valueOf() : undefined);
                });
        });

        it('should validate correct document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 123};

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.validateWithDefaultSchema(document)
                .then(function (result) {
                    assert.deepEqual(result, document);
                    done();
                })
                .fail(done);
        });

        it('should not validate incorrect document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 'zzz'};

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.validateWithDefaultSchema(document).always(function (promise) {
                if (promise.isRejected()) {
                    done();
                } else {
                    done(new Error());
                }
            });
        });

        it('should write warnings to console if warnings are enabled', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 'zzz'},
                consoleLogOriginal = console.log,
                warningWrittenFlag = false;

            console.log = function () {
                warningWrittenFlag = true;
                return consoleLogOriginal.apply(this, arguments);
            };

            collection
                .attachSchema(TestTools.getSchema())
                .warnOnWrongData(true);

            collection.validateWithDefaultSchema(document).always(function () {
                console.log = consoleLogOriginal;
                assert(warningWrittenFlag);
                done();
            });
        });
    });

    describe('#validate', function () {
        it('should not validate incorrect documents', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 'zzz'};

            collection.validate(document, TestTools.getSchema())
                .always(function (promise) {
                    if (promise.isRejected()) {
                        assert(promise.valueOf() instanceof Error);
                        done();
                    } else {
                        done(new Error());
                    }
                });
        });

        it('should validate correct document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 5};

            collection.validate(document, TestTools.getSchema())
                .always(function (promise) {
                    if (promise.isFulfilled()) {
                        assert.strictEqual(promise.valueOf(), document);
                        done();
                    } else {
                        done(promise.valueOf());
                    }
                }).fail(done);
        });
    });

    describe('#insert', function () {
        it('should insert correct document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 1234, _id: MongoWrapper.ObjectID()};

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.insert(document)
                .then(function (result) {
                    assert(result instanceof Array);
                    assert.strictEqual(result.length, 1);
                    assert.deepEqual(result[0], document);
                    return collection.find({_id: document._id}).toArray();
                })
                .then(function (result) {
                    assert(result instanceof Array);
                    assert.strictEqual(result.length, 1);
                    assert.deepEqual(result[0], document);
                    done();
                })
                .fail(done);
        });

        it('should not insert correct document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: '1234', _id: MongoWrapper.ObjectID()};

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.insert(document)
                .always(function (promise) {
                    if (promise.isFulfilled()) {
                        done(new Error());
                        return Vow.reject();
                    }
                    return collection.find({_id: document._id}).toArray();
                })
                .then(function (result) {
                    assert(result instanceof Array);
                    assert.strictEqual(result.length, 0);
                    done();
                });
        });
    });

    describe('#unsafeInsert', function () {
        it('shoud be the same as CollectionWrapper.insert', function () {
            var collection = TestTools.getCollection();
            assert.strictEqual(collection.unsafeInsert, CollectionWrapper.prototype.insert);
        });
    });

    describe('#save', function () {
        it('should insert correct document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 1234, _id: MongoWrapper.ObjectID()};

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.save(document)
                .then(function (result) {
                    assert.strictEqual(result, 1);
                    return collection.find({_id: document._id}).toArray();
                })
                .then(function (result) {
                    assert(result instanceof Array);
                    assert.strictEqual(result.length, 1);
                    assert.deepEqual(result[0], document);
                    done();
                })
                .fail(done);
        });

        it('should not insert correct document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: '1234', _id: MongoWrapper.ObjectID()};

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.save(document)
                .always(function (promise) {
                    if (promise.isFulfilled()) {
                        done(new Error());
                        return Vow.reject();
                    }
                    return collection.find({_id: document._id}).toArray();
                })
                .then(function (result) {
                    assert(result instanceof Array);
                    assert.strictEqual(result.length, 0);
                    done();
                });
        });
    });

    describe('#unsafeSave', function () {
        it('shoud be the same as CollectionWrapper.save', function () {
            var collection = TestTools.getCollection();
            assert.strictEqual(collection.unsafeSave, CollectionWrapper.prototype.save);
        });
    });

    describe('#update', function () {
        beforeEach(function (done) {
            TestTools.getCollection().drop()
                .always(function () {
                    done();
                });
        });

        it('should do nothing if nothing to update and no upsert option', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName());

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.update({_id: 123}, {has: 'no meaning'})
                .then(function (result) {
                    assert.strictEqual(result, 0);
                    collection.count()
                        .then(function (count) {
                            assert.strictEqual(count, 0);
                            done();
                        })
                        .fail(done);
                })
                .fail(done);
        });

        it('should insert correct document on upsert', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName());

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.update({_id: 123}, {a: 'zzz', b: 123}, {upsert: true})
                .then(function (result) {
                    assert.strictEqual(result, 1);
                    collection.find().toArray()
                        .then(function (data) {
                            assert(data instanceof Array);
                            assert.strictEqual(data.length, 1);
                            assert.deepEqual(data[0].a, 'zzz');
                            assert.deepEqual(data[0].b, 123);
                            done();
                        })
                        .fail(done);
                })
                .fail(done);
        });

        it('should not upsert incorrect document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName());

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.update({_id: 123}, {has: 'no meaning'}, {upsert: true})
                .then(function () {
                    done(new Error());
                })
                .fail(function () {
                    collection.count()
                        .then(function (count) {
                            assert.strictEqual(count, 0);
                            done();
                        })
                        .fail(done);
                });
        });

        it('should not update incorrect document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName()),
                document = {_id: MongoWrapper.ObjectID(), a: 'zzz', b: 123};

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.insert(document).then(function () {
                collection.update({_id: document._id}, {$set: {b: 'qwerrty'}})
                    .then(function () {
                        done(new Error());
                    })
                    .fail(function () {
                        collection.count({_id: document._id, b: 'qwerrty'})
                            .then(function (count) {
                                assert.strictEqual(count, 0);
                                done();
                            })
                            .fail(done);
                    });
            }).fail(done);
        });

        it('should not do nonthing if any of documents in multi mode is incorrect', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollection(connection, TestTools.getCollectionName());

            collection
                .attachSchema(TestTools.getSchema())
                .setCheckEnforcement(true);

            collection.insert({a: 'zzz', b: 123})
                .then(function () {
                    //intentionally insert bad document
                    //FIXME use unsafe methods
                    return collection.unsafeInsert({a: 'zzz', b: 'qwertyu'});
                })
                .then(function () {
                    collection.update({a: 'zzz'}, {$set: {a: 'asdf'}}, {multi: true})
                        .then(function () {
                            done(new Error());
                        })
                        .fail(function () {
                            collection.count({a: 'asdf'})
                                .then(function (count) {
                                    assert.strictEqual(count, 0);
                                    done();
                                })
                                .fail(done);
                        });
                }).fail(done);
        });

        //@see http://docs.mongodb.org/master/reference/method/db.collection.update/#upsert-option
        //for details what is tesing here
        it(
            'should use values from query condition when building document for upserting if update' +
                ' contatins operators',
            function (done) {
                var connection = TestTools.getConnection(),
                    collection = new SafeCollection(connection, TestTools.getCollectionName());

                collection
                    .attachSchema(TestTools.getSchema())
                    .setCheckEnforcement(true);

                collection.update({a: 'zzz'}, {$set: {b: 5}}, {upsert: true})
                    .then(function (count) {
                        assert.strictEqual(count, 1);
                        collection.count({a: 'zzz', b: 5})
                            .then(function (count) {
                                assert.strictEqual(count, 1);
                                done();
                            })
                            .fail(done);
                    }).fail(done);
            }
        );

        it(
            'should not use value from query when building document for upserting if update ' +
            ' does not contain operators',
            function (done) {
                var connection = TestTools.getConnection(),
                    collection = new SafeCollection(connection, TestTools.getCollectionName());

                collection
                    .attachSchema(TestTools.getSchema())
                    .setCheckEnforcement(true);

                collection.update({zzz: 'zzz'}, {a: 'qwerty', b: 5}, {upsert: true})
                    .then(function (count) {
                        assert.strictEqual(count, 1);
                        collection.count({a: 'qwerty', b: 5, zzz: {$exists: false}})
                            .then(function (count) {
                                assert.strictEqual(count, 1);
                                done();
                            })
                            .fail(done);
                    }).fail(done);
            }
        );
    });

    describe('#unsafeUpdate', function () {
        it('shoud be the same as CollectionWrapper.update', function () {
            var collection = TestTools.getCollection();
            assert.strictEqual(collection.unsafeUpdate, CollectionWrapper.prototype.update);
        });
    });

    describe('#_copyObject', function () {
        var collection = TestTools.getCollection(),
            object = {a: {}, b: 1, c: 'zzz', d: []};

        assert.deepEqual({}, collection._copyObject({}));
        assert.deepEqual(object, collection._copyObject(object));
        assert(object !== collection._copyObject(object));
    });

    describe('#_injectIdFieldIntoSchema', function () {
        var collection = TestTools.getCollection();

        it('should fail on incorrect schema', function () {
            assert.throws(function () {
                collection._injectIdFieldIntoSchema(undefined);
            });
            assert.throws(function () {
                collection._injectIdFieldIntoSchema(null);
            });
            assert.throws(function () {
                collection._injectIdFieldIntoSchema({});
            });
            assert.throws(function () {
                collection._injectIdFieldIntoSchema({type: 'zzz'});
            });
        });

        it('should add _id into properties', function () {
            assert.deepEqual(
                {
                    type: 'object',
                    properties: {
                        _id: {
                            type: 'string',
                            pattern: '^[0-9a-f]{24}$'
                        }
                    }
                },
                collection._injectIdFieldIntoSchema({
                    type: 'object'
                })
            );
            assert.deepEqual(
                {
                    type: 'object',
                    name: 'Some schema',
                    properties: {
                        zzz: {
                            type: 'object'
                        },
                        _id: {
                            type: 'string',
                            pattern: '^[0-9a-f]{24}$'
                        }
                    },
                    require: ['zzz'],
                    additionalProperties: false
                },
                collection._injectIdFieldIntoSchema({
                    type: 'object',
                    name: 'Some schema',
                    properties: {
                        zzz: {
                            type: 'object'
                        }
                    },
                    require: ['zzz'],
                    additionalProperties: false
                })
            );
        });
    });

    after(function (done) {
        TestTools.getCollection().drop()
            .always(function () {
                done();
            });
    });

});
