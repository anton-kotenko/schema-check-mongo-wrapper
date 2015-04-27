/*global describe*/
/*global it*/
/*global after*/
/*global before*/
var TestTools = require(__dirname + '/../tools/tools.js'),
    assert = require('assert'),
    MongoWrapper = require(__dirname + '/../../'),
    DebugCtx = require(__dirname + '/../../lib/debug_ctx.js');

describe('CursorWrapper', function () {
    before(function (done) {
        var collection = TestTools.getCollection();
        collection
            .remove()
            .then(function () {
                return collection.insert({val: 1});
            })
            .then(function () {
                return collection.insert({val: 2});
            })
            .then(function () {
                done();
            })
            .fail(done);
    });

    it('should exists', function () {
        assert(MongoWrapper.CursorWrapper instanceof Function);
    });

    it('should be constructable', function (done) {
        var cursorPromise = TestTools.getCollection()._nativeCollectionPromise
            .then(function (nativeCollection) {
                return nativeCollection.find({});
            }),
            cursor = new MongoWrapper.CursorWrapper(cursorPromise, new DebugCtx());

        cursorPromise.always(function () {
            assert(cursor instanceof MongoWrapper.CursorWrapper);
            assert(cursor._debugCtx instanceof DebugCtx);
            done();
        });
    });

    describe('#toArray', function () {
        it('should work', function (done) {
            TestTools.getCollection().find({}).toArray()
                .then(function (result) {
                    assert(result instanceof Array);
                    assert(result.length === 2);
                    done();
                })
                .fail(done);
        });

        it('should log operation in debug', function (done) {
            var cursor = TestTools.getCollection().find({});

            cursor.toArray().fail(done);
            cursor._debugCtx.once('debug', function (debugMsg) {
                assert(debugMsg.profile.match(/\.toArray\(\)$/));
                done();
            });
        });
    });

    describe('#limit', function () {
        it('should work', function (done) {
            TestTools.getCollection().find().limit(1).toArray()
                .then(function (result) {
                    assert(result instanceof Array);
                    assert(result.length === 1);
                    done();
                })
                .fail(done);
        });

        it('should log operation in debug', function (done) {
            var cursor = TestTools.getCollection().find({});

            cursor.limit(1).toArray().fail(done);
            cursor._debugCtx.once('debug', function (debugMsg) {
                assert(debugMsg.profile.match(/\.limit\(1\)\.toArray\(\)$/));
                done();
            });
        });
    });

    describe('#sort', function () {
        it('should work', function (done) {
            TestTools.getCollection().find().sort({val: 1}).toArray()
                .then(function (result) {
                    assert(result instanceof Array);
                    assert(result.length === 2);
                    assert(result[0].val <= result[0].val);
                    done();
                })
                .fail(done);
        });

        it('should log operation in debug', function (done) {
            var cursor = TestTools.getCollection().find({});

            cursor.sort({_id: 1}).toArray().fail(done);
            cursor._debugCtx.once('debug', function (debugMsg) {
                assert(debugMsg.profile.match(/\.sort\({"_id": 1}\)\.toArray\(\)$/));
                done();
            });
        });
    });

    after(function (done) {
        TestTools.getCollection().drop().always(function () {
            done();
        });
    });
});
