/*global describe*/
/*global it*/
/*global after,beforeEach,afterEach*/
var MongoWrapper = require(__dirname + '/../../'),
    SafeCollectionWrapper = MongoWrapper.SafeCollectionWrapper,
    CollectionWrapper = require(__dirname + '/../../lib/collection_wrapper.js'),
    TestTools = require(__dirname + '/../tools/tools.js'),
    assert = require('assert'),
    Vow = require('vow');

describe('SafeCollectionWrapper', function () {
    it('should exists', function () {
        assert(SafeCollectionWrapper);
    });
    it('should be constructable', function () {
        var connection = TestTools.getConnection(),
            collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName());

        assert(collection instanceof SafeCollectionWrapper);
        assert(collection instanceof CollectionWrapper);
        assert.strictEqual(collection._collectionName, TestTools.getCollectionName());
    });

    describe('#getDefaultEnforceValidaionPolicy,setDefaultEnforceValidationPolicy', function () {
        beforeEach(function () {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
        });
        it('should use false as default policy, if it was not changed', function () {
            assert.strictEqual(false, SafeCollectionWrapper.getDefaultEnforceValidaionPolicy());
        });

        it('should get default policy in from place, where it was stored by getDefaultEnforceValidaionPolicy',
            function () {
                SafeCollectionWrapper.setDefaultEnforceValidationPolicy(false);
                assert.strictEqual(SafeCollectionWrapper.getDefaultEnforceValidaionPolicy(), false);

                SafeCollectionWrapper.setDefaultEnforceValidationPolicy(true);
                assert.strictEqual(SafeCollectionWrapper.getDefaultEnforceValidaionPolicy(), true);
            }
        );
        after(function () {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
        });
    });

    describe('#getCollectionDecl,#declCollection', function () {
        beforeEach(function () {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
            SafeCollectionWrapper._cache = undefined;
        });

        it('should return default policy for collections without declaration', function () {
            SafeCollectionWrapper.setDefaultEnforceValidationPolicy(false);
            assert.deepEqual(
                {
                    enforce: false
                },
                SafeCollectionWrapper.getCollectionDecl(TestTools.getCollectionName())
            );
            SafeCollectionWrapper.setDefaultEnforceValidationPolicy(true);
            assert.deepEqual(
                {
                    enforce: true
                },
                SafeCollectionWrapper.getCollectionDecl(TestTools.getCollectionName())
            );
        });

        it('should use default enforcement policy used at decl name as default', function () {
            var schema = TestTools.getSchema();
            SafeCollectionWrapper.setDefaultEnforceValidationPolicy(false);
            SafeCollectionWrapper.declCollection('zzz', schema);
            assert.deepEqual(
                {enforce: false, schema: schema},
                SafeCollectionWrapper.getCollectionDecl('zzz')
            );
            SafeCollectionWrapper.setDefaultEnforceValidationPolicy(true);
            assert.deepEqual(
                {enforce: false, schema: schema},
                SafeCollectionWrapper.getCollectionDecl('zzz')
            );

            SafeCollectionWrapper.declCollection('aaa', schema);
            assert.deepEqual(
                {enforce: true, schema: schema},
                SafeCollectionWrapper.getCollectionDecl('aaa')
            );

            SafeCollectionWrapper.setDefaultEnforceValidationPolicy(false);
            assert.deepEqual(
                {enforce: true, schema: schema},
                SafeCollectionWrapper.getCollectionDecl('aaa')
            );
        });

        it('should store/fetch schema and policy', function () {
            var propertyField = {
                    '_id': {
                        type: 'string',
                        patter: '^[0-9a-f]{24}$'
                    }
                },
                schema1 = {title: 'test1', type: 'object', properties: propertyField},
                schema2 = {title: 'test2', type: 'object', properties: propertyField},
                schema3 = {title: 'test3', type: 'object', properties: propertyField},
                schema4 = {title: 'test4', type: 'object', properties: propertyField};

            SafeCollectionWrapper.declCollection('coll1', schema1, true);
            assert.deepEqual(
                {enforce: true, schema: schema1},
                SafeCollectionWrapper.getCollectionDecl('coll1')
            );

            SafeCollectionWrapper.declCollection('coll2', schema2, false);
            assert.deepEqual(
                {enforce: false, schema: schema2},
                SafeCollectionWrapper.getCollectionDecl('coll2')
            );

            SafeCollectionWrapper.declCollection('coll3', schema3, true);
            assert.deepEqual(
                {enforce: true, schema: schema3},
                SafeCollectionWrapper.getCollectionDecl('coll3')
            );

            SafeCollectionWrapper.declCollection('coll4', schema4, false);
            assert.deepEqual(
                {enforce: false, schema: schema4},
                SafeCollectionWrapper.getCollectionDecl('coll4')
            );

        });

        afterEach(function () {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
            SafeCollectionWrapper._cache = undefined;
        });
    });

    describe('#validateDoc', function () {
        beforeEach(function () {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
            SafeCollectionWrapper._cache = undefined;
        });

        it('should fail if no schema but enforcement is enabled', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollectionWrapper(connection, 'zzz');

            SafeCollectionWrapper.setDefaultEnforceValidationPolicy(true);
            collection.validateDoc({}).always(function (promise) {
                if (promise.isRejected()) {
                    done();
                } else {
                    done(new Error());
                }
            });
        });

        it('should validate correct document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 123};

            SafeCollectionWrapper.declCollection(
                TestTools.getCollectionName(),
                TestTools.getSchema(),
                true
            );
            collection.validateDoc(document)
                .then(function (result) {
                    assert.deepEqual(result, document);
                    done();
                })
                .fail(done);

        });
        it('should not validate incorrect document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 'zzz'};

            SafeCollectionWrapper.declCollection(
                TestTools.getCollectionName(),
                TestTools.getSchema(),
                true
            );
            collection.validateDoc(document).always(function (promise) {
                if (promise.isRejected()) {
                    done();
                } else {
                    done(new Error());
                }
            });

        });

        after(function () {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
            SafeCollectionWrapper._cache = undefined;
        });
    });

    describe('#safeInsert', function () {
        beforeEach(function () {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
            SafeCollectionWrapper._cache = undefined;
        });
        it('should insert correct document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 1234, _id: MongoWrapper.ObjectID()};

            SafeCollectionWrapper.declCollection(
                TestTools.getCollectionName(),
                TestTools.getSchema(),
                true
            );
            collection.safeInsert(document)
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
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: '1234', _id: MongoWrapper.ObjectID()};

            SafeCollectionWrapper.declCollection(
                TestTools.getCollectionName(),
                TestTools.getSchema(),
                true
            );
            collection.safeInsert(document)
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

        after(function () {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
            SafeCollectionWrapper._cache = undefined;
        });

    });

    describe('#safeSave', function () {
        beforeEach(function () {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
            SafeCollectionWrapper._cache = undefined;
        });
        it('should insert correct document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: 1234, _id: MongoWrapper.ObjectID()};

            SafeCollectionWrapper.declCollection(
                TestTools.getCollectionName(),
                TestTools.getSchema(),
                true
            );
            collection.safeSave(document)
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
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName()),
                document = {a: 'zzz', b: '1234', _id: MongoWrapper.ObjectID()};

            SafeCollectionWrapper.declCollection(
                TestTools.getCollectionName(),
                TestTools.getSchema(),
                true
            );
            collection.safeSave(document)
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

        after(function () {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
            SafeCollectionWrapper._cache = undefined;
        });

    });

    describe('#safeUpdate', function () {
        beforeEach(function (done) {
            SafeCollectionWrapper._enforceValidationPolicy = undefined;
            SafeCollectionWrapper._cache = undefined;
            SafeCollectionWrapper.declCollection(
                TestTools.getCollectionName(),
                TestTools.getSchema(),
                true
            );
            TestTools.getCollection().drop().always(function () {
                done();
            });
        });

        it('should do nothing if nothing to update and no upsert option', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName());

            collection.safeUpdate({_id: 123}, {has: 'no meaning'})
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
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName());

            collection.safeUpdate({_id: 123}, {a: 'zzz', b: 123}, {upsert: true})
                .then(function (result) {
                    assert.strictEqual(result, 1);
                    collection.find().toArray()
                        .then(function (data) {
                            assert(data instanceof Array);
                            assert.strictEqual(data.length, 1);
                            assert.deepEqual(data[0], {_id: 123, a: 'zzz', b: 123});
                            done();
                        })
                        .fail(done);
                })
                .fail(done);
        });
        it('should not upsert incorrect document', function (done) {
            var connection = TestTools.getConnection(),
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName());

            collection.safeUpdate({_id: 123}, {has: 'no meaning'}, {upsert: true})
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
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName()),
                document = {_id: MongoWrapper.ObjectID(), a: 'zzz', b: 123};

            collection.safeInsert(document).then(function () {
                collection.safeUpdate({_id: document._id}, {$set: {b: 'qwerrty'}})
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
                collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName());

            collection.safeInsert({a: 'zzz', b: 123})
                .then(function () {
                    //intentionally insert bad document
                    return collection.insert({a: 'zzz', b: 'qwertyu'});
                })
                .then(function () {
                    collection.safeUpdate({a: 'zzz'}, {$set: {a: 'asdf'}}, {multi: true})
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
                    collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName());

                collection.safeUpdate({a: 'zzz'}, {$set: {b: 5}}, {upsert: true})
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
                    collection = new SafeCollectionWrapper(connection, TestTools.getCollectionName());

                collection.safeUpdate({zzz: 'zzz'}, {a: 'qwerty', b: 5}, {upsert: true})
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

    after(function (done) {
        SafeCollectionWrapper._enforceValidationPolicy = undefined;
        SafeCollectionWrapper._cache = undefined;
        TestTools.getCollection().drop().always(function () {
            done();
        });
    });

});
