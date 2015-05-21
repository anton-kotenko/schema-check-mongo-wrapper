/*global describe*/
/*global it*/
/*global after*/
var TestTools = require(__dirname + '/../tools/tools.js'),
    assert = require('assert'),
    Vow = require('vow'),
    MongoWrapper = require(__dirname + '/../../'),
    CollectionWrapper = require(__dirname + '/../../lib/collection_wrapper.js'),
    MongoDb = require('mongodb');

describe('CollectionWrapper', function () {

    it('should exists', function () {
        assert(CollectionWrapper);
    });

    it('should be constructable', function () {
        var connection = TestTools.getConnection(),
            collection = new CollectionWrapper(connection, TestTools.getCollectionName());

        assert(collection instanceof CollectionWrapper);
        assert.strictEqual(collection._collectionName, TestTools.getCollectionName());
        assert(Vow.isPromise(collection._nativeCollectionPromise));
    });

    describe('getCollectionName', function () {
        it('should return collection\'s name', function () {
            var collection = TestTools.getUnsafeCollection();
            assert.strictEqual(collection.getCollectionName(), TestTools.getCollectionName());
        });
    });

    describe('#find', function () {
        it('should return cursor wrapper', function () {
            var rnd = String(Date.now()) + String(Math.random()),
                cursor = TestTools.getUnsafeCollection().find({key: rnd});

            assert(cursor instanceof MongoWrapper.CursorWrapper);
        });
        it('should appear in debug', function (done) {
            var collection = TestTools.getUnsafeCollection(),
                rnd = String(Date.now()) + String(Math.random());

            collection.once('debug', function (debugMsg) {
                assert.strictEqual(
                    debugMsg.profile,
                    MongoWrapper.DebugCtx.prototype._formatAsMongoShell('find', [{key: rnd}]) +
                        MongoWrapper.DebugCtx.prototype._formatAsMongoShell('toArray')
                );
                done();
            });
            collection.find({key: rnd}).toArray();
        });
    });

    describe('#insert', function () {
        it('should work', function (done) {
            var rnd = String(Date.now()) + String(Math.random());
            TestTools.getUnsafeCollection().insert({key: rnd})
                .then(function (result) {
                    assert(result instanceof Array);
                    assert.equal(result.length, 1);
                    assert(result[0] instanceof Object);
                    assert.strictEqual(result[0].key, rnd);
                    assert(result[0]._id instanceof MongoDb.ObjectID);
                    done();
                })
                .fail(done);
        });
        //mongo native driver spoils arguments
        //can not check nothing
        //it('should appear in debug', function (done) {
        //    var collection = TestTools.getUnsafeCollection(),
        //        rnd = String(Date.now()) + String(Math.random());

        //    collection.once('debug', function (debugMsg) {
        //        assert.strictEqual(
        //            debugMsg.profile,
        //            MongoWrapper.DebugCtx.prototype._formatAsMongoShell('insert', [{key: rnd}])
        //        );
        //        done();
        //    });
        //    collection.insert({key: rnd});
        //});

    });

    describe('#save', function () {
        it('should work', function (done) {
            var rnd = String(Date.now()) + String(Math.random());
            TestTools.getUnsafeCollection().save({key: rnd})
                .then(function (result) {
                    assert.strictEqual(result.key, rnd);
                    assert(result._id instanceof MongoDb.ObjectID);
                    done();
                })
                .fail(done);
        });
        //mongo native driver spoils arguments
        //can not check nothing
        //it('should appear in debug', function (done) {
        //    var collection = TestTools.getUnsafeCollection(),
        //        rnd = String(Date.now()) + String(Math.random());

        //    collection.once('debug', function (debugMsg) {
        //        assert.strictEqual(
        //            debugMsg.profile,
        //            MongoWrapper.DebugCtx.prototype._formatAsMongoShell('save', [{key: rnd}])
        //        );
        //        done();
        //    });
        //    collection.save({key: rnd});
        //});

    });

    describe('#update', function () {
        it('should work', function (done) {
            var rnd = String(Date.now()) + String(Math.random());
            TestTools.getUnsafeCollection().update({key: rnd}, {key: rnd})
                .then(function (result) {
                    //result should be number of updated rows
                    //and it should be zero in current situation
                    assert.strictEqual(result, 0);
                    done();
                })
                .fail(done);
        });
        it('should appear in debug', function (done) {
            var collection = TestTools.getUnsafeCollection(),
                rnd = String(Date.now()) + String(Math.random());

            collection.once('debug', function (debugMsg) {
                assert.strictEqual(
                    debugMsg.profile,
                    MongoWrapper.DebugCtx.prototype._formatAsMongoShell('update', [{key: rnd}, {key: rnd}])
                );
                done();
            });
            collection.update({key: rnd}, {key: rnd});
        });

    });

    describe('#count', function () {
        it('should work', function (done) {
            var rnd = String(Date.now()) + String(Math.random());
            TestTools.getUnsafeCollection().count({key: rnd})
                .then(function (result) {
                    //result should be number of found rows
                    //and it should be zero in current situation
                    assert.strictEqual(result, 0);
                    done();
                })
                .fail(done);
        });
        it('should appear in debug', function (done) {
            var collection = TestTools.getUnsafeCollection(),
                rnd = String(Date.now()) + String(Math.random());

            collection.once('debug', function (debugMsg) {
                assert.strictEqual(
                    debugMsg.profile,
                    MongoWrapper.DebugCtx.prototype._formatAsMongoShell('count', [{key: rnd}])
                );
                done();
            });
            collection.count({key: rnd});
        });

    });

    describe('#remove', function () {
        it('should work', function (done) {
            var rnd = String(Date.now()) + String(Math.random());
            TestTools.getUnsafeCollection().remove({key: rnd})
                .then(function (result) {
                    //result should be number of removed rows
                    //and it should be zero in current situation
                    assert.strictEqual(result, 0);
                    done();
                })
                .fail(done);
        });
        it('should appear in debug', function (done) {
            var collection = TestTools.getUnsafeCollection(),
                rnd = String(Date.now()) + String(Math.random());

            collection.once('debug', function (debugMsg) {
                assert.strictEqual(
                    debugMsg.profile,
                    MongoWrapper.DebugCtx.prototype._formatAsMongoShell('remove', [{key: rnd}])
                );
                done();
            });
            collection.remove({key: rnd});
        });
    });

    describe('#aggregate', function () {
        it('should work', function (done) {
            var rnd = String(Date.now()) + String(Math.random());
            TestTools.getUnsafeCollection().aggregate([{$match: {key: rnd}}])
                .then(function (result) {
                    //aggregation in intentionally written in the way
                    //to return empty array
                    assert(result instanceof Array);
                    assert(result.length === 0);
                    done();
                })
                .fail(done);
        });
        it('should appear in debug', function (done) {
            var collection = TestTools.getUnsafeCollection(),
                rnd = String(Date.now()) + String(Math.random());

            collection.once('debug', function (debugMsg) {
                assert.strictEqual(
                    debugMsg.profile,
                    MongoWrapper.DebugCtx.prototype._formatAsMongoShell('aggregate', [[{$match: {key: rnd}}]])
                );
                done();
            });
            collection.aggregate([{$match: {key: rnd}}]);
        });

    });

    describe('#findOne', function () {
        it('should work', function (done) {
            var rnd = String(Date.now()) + String(Math.random());
            TestTools.getUnsafeCollection().findOne({key: rnd})
                .then(function (result) {
                    assert(result === null);
                    done();
                })
                .fail(done);
        });
        it('should appear in debug', function (done) {
            var collection = TestTools.getUnsafeCollection(),
                rnd = String(Date.now()) + String(Math.random());

            collection.once('debug', function (debugMsg) {
                assert(debugMsg.profile.indexOf(
                    '.findOne({"key": "' + rnd + '"})'
                ) !== -1);
                done();
            });
            collection.findOne({key: rnd});
        });

    });

    describe('#findAndModify', function () {
        it('should work', function (done) {
            var rnd = String(Date.now()) + String(Math.random());
            TestTools.getUnsafeCollection().findAndModify({key: rnd}, {}, {zzz: 123}, {})
                .then(function () {
                    done();
                })
                .fail(done);
        });
        it('should appear in debug', function (done) {
            var collection = TestTools.getUnsafeCollection(),
                rnd = String(Date.now()) + String(Math.random());

            collection.once('debug', function (debugMsg) {
                assert(debugMsg.profile.indexOf(
                    '.findAndModify({"key": "' + rnd + '"}, {}, {"zzz": 123})'
                ) !== -1);
                done();
            });
            collection.findAndModify({key: rnd}, {}, {zzz: 123});
        });
    });

    describe('#ensureIndex', function () {
        it('should work', function (done) {
            TestTools.getUnsafeCollection().ensureIndex({zzz: 1})
                .then(function (result) {
                    assert(result);
                    done();
                })
                .fail(done);
        });
        it('should appear in debug', function (done) {
            var collection = TestTools.getUnsafeCollection();
            collection.once('debug', function (debugMsg) {
                assert(debugMsg.profile.match(/\.ensureIndex\(\{"zzz": 1\}\)$/));
                done();
            });
            collection.ensureIndex({zzz: 1});
        });
    });

    describe('#drop', function () {
        it('should work', function (done) {
            TestTools.getUnsafeCollection().drop()
                .then(function (result) {
                    assert(result);
                    done();
                })
                .fail(done);
        });
        it('should appear in debug', function (done) {
            var collection = TestTools.getUnsafeCollection();
            collection.once('debug', function (debugMsg) {
                assert(debugMsg.profile.match(/\.drop\(\)$/));
                done();
            });
            collection.drop();
        });
    });

    describe('#_getNewDebugCtx', function () {
        it('should create and return new debug context', function () {
            var collection = TestTools.getUnsafeCollection(),
                debugCtx = collection._getNewDebugCtx();

            assert(debugCtx instanceof MongoWrapper.DebugCtx);
        });

        it('should reemit debug events on debug ctx', function (done) {
            var collection = TestTools.getUnsafeCollection(),
                debugCtx = collection._getNewDebugCtx(),
                debugMsg = {};

            collection.once('debug', function (eventData) {
                assert.strictEqual(eventData, debugMsg);
                done();
            });
            debugCtx.emit('debug', debugMsg);
        });
    });

    after(function (done) {
        TestTools.getUnsafeCollection().drop().always(function () {
            done();
        });
    });

});
