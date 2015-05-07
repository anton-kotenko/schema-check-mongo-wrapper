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
    describe('#find', function () {
        it('should return cursor wrapper', function () {
            var cursor = TestTools.getUnsafeCollection().find({});
            assert(cursor instanceof MongoWrapper.CursorWrapper);
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
    });

    after(function (done) {
        TestTools.getUnsafeCollection().drop().always(function () {
            done();
        });
    });

});
