/*global describe*/
/*global it*/
var MongoQuery = require(__dirname + '/../../lib/mongo_query.js'),
    MongoWrapper = require(__dirname + '/../../'),
    assert = require('assert');

describe('MongoQuery', function () {
    it('should exits', function () {
        assert(MongoQuery);
        assert(MongoQuery instanceof Function);
    });

    describe('#MongoQuery', function () {
        it('should be constructable', function () {
            assert(new MongoQuery({}) instanceof MongoQuery);
        });

        it('should use empty obect as default query argument', function () {
            var query = new MongoQuery();
            assert.deepEqual(query._query, {});
        });
    });
    describe('#_isOperator', function () {
        it('should return true for mongo operators', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._isOperator('$'));
            assert.strictEqual(true, query._isOperator('zzz$'));
            assert.strictEqual(true, query._isOperator('$aaa'));
        });
        it('should return false for anything other than mongo operators', function () {
            var query = new MongoQuery();
            assert.strictEqual(false, query._isOperator(''));
            assert.strictEqual(false, query._isOperator('zzz'));
            assert.strictEqual(false, query._isOperator('aaa'));
        });
    });

    describe('#_isPlainObject', function () {
        it('shuld return true when argument is just plain object', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._isPlainObject({}));
            assert.strictEqual(true, query._isPlainObject({a: 123}));
            assert.strictEqual(true, query._isPlainObject({b: {}}));
        });
        it('shuld return true when argument is just plain object', function () {
            var query = new MongoQuery();
            assert.strictEqual(false, query._isPlainObject());
            assert.strictEqual(false, query._isPlainObject(undefined));
            assert.strictEqual(false, query._isPlainObject(null));
            assert.strictEqual(false, query._isPlainObject(123));
            assert.strictEqual(false, query._isPlainObject(1.5));
            assert.strictEqual(false, query._isPlainObject('zzzz'));
            assert.strictEqual(false, query._isPlainObject(''));
            assert.strictEqual(false, query._isPlainObject(new Date()));
            assert.strictEqual(false, query._isPlainObject(new RegExp('zzz')));
            assert.strictEqual(false, query._isPlainObject(MongoWrapper.ObjectID()));
            assert.strictEqual(false, query._isPlainObject([]));
            assert.strictEqual(false, query._isPlainObject([1, 2, 3]));
        });
    });
    describe('#_lookupTreeForPlainValues', function () {
        it('should not copy operator values', function () {
            var query = new MongoQuery();
            assert.deepEqual(
                query._lookupTreeForPlainValues({a: 'b', $a: 123, $b: [], $c: 'zzz', $d: {}, $e: {q: 12}}),
                {a: 'b'}
            );
        });
        it('should copy plain non operator items', function () {
            var query = new MongoQuery(),
                id = MongoWrapper.ObjectID();

            assert.deepEqual(
                query._lookupTreeForPlainValues({
                    a: 'b',
                    b: 123,
                    c: new Date(0),
                    d: new RegExp('zz'),
                    e: id,
                    f: null
                }),
                {a: 'b', b: 123, c: new Date(0), d: new RegExp('zz'), e: id, f: null}
            );
        });
        it('should not copy plain empty objects', function () {
            var query = new MongoQuery(),
                id = MongoWrapper.ObjectID();

            assert.deepEqual(
                query._lookupTreeForPlainValues({
                    a: 'b',
                    b: 123,
                    c: new Date(0),
                    d: new RegExp('zz'),
                    e: id,
                    f: null,
                    g: {}
                }),
                {a: 'b', b: 123, c: new Date(0), d: new RegExp('zz'), e: id, f: null}
            );
        });
        it('should not copy objects containing only operators', function () {
            var query = new MongoQuery();
            assert.deepEqual(
                query._lookupTreeForPlainValues({
                    a: {$ne: {}},
                    b: {$eq: 123},
                    c: {$or: [{z: 123}, {x: 321}]}
                }),
                {}
            );
        });
        it('should copy objects non operator content', function () {
            var query = new MongoQuery(),
                id = MongoWrapper.ObjectID();

            assert.deepEqual(
                query._lookupTreeForPlainValues({
                    a: {$ne: {}, a: 'b', b: 123, c: new Date(0)},
                    b: {$eq: 123, a: new RegExp('zz'), b: id},
                    c: {$or: [{z: 123}, {x: 321}], a: null}
                }),
                {
                    a: {a: 'b', b: 123, c: new Date(0)},
                    b: {a: new RegExp('zz'), b: id},
                    c: {a: null}
                }
            );
        });




    });
});
