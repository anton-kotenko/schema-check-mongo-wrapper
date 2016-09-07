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

    describe('match', function () {
        it('should call _math with query equals to _query', function () {
            var query = new MongoQuery(),
                doc = {};

            query._match = function (query, document) {
                assert.strictEqual(this._query, query);
                assert.strictEqual(document, doc);
            };
            query.match(doc);
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
        it('should return false when argument is not plain object', function () {
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
            assert.strictEqual(false, query._isPlainObject(new (function () {}) ()));
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

    describe('#_findElement', function () {
        it('should return undefined on empty document', function () {
            var query = new MongoQuery();

            assert.strictEqual(undefined, query._findElement('', {}));
            assert.strictEqual(undefined, query._findElement('a', {}));
            assert.strictEqual(undefined, query._findElement('a.b', {}));
            assert.strictEqual(undefined, query._findElement('a.b.c', {}));
        });
        it('should return undefined on noexistent element with depth equals 1', function () {
            var query = new MongoQuery();

            assert.strictEqual(undefined, query._findElement('c', {a: 1, b: 2}));
            assert.strictEqual(undefined, query._findElement('d', {a: 1, b: 2}));
        });
        it('should return item on existent element with depth equals 1', function () {
            var query = new MongoQuery();

            assert.strictEqual(1, query._findElement('a', {a: 1, b: 2}));
            assert.strictEqual(2, query._findElement('b', {a: 1, b: 2}));
            assert.deepEqual({}, query._findElement('c', {a: 1, b: 2, c: {}}));
        });
        it('should return undefined on nonexistet item with depth equals 2', function () {
            var query = new MongoQuery();

            assert.strictEqual(undefined, query._findElement('a.d', {a: {b: 1, c: 2}, b: 2}));
            assert.strictEqual(undefined, query._findElement('b.d', {a: 1, b: {a: {}, c: []}}));
        });
        it('should return undefined when there are no parent for item', function () {
            var query = new MongoQuery();

            assert.strictEqual(undefined, query._findElement('a.b', {b: {b: 1, c: 2}, c: 2}));
            assert.strictEqual(undefined, query._findElement('d.e', {b: {b: 1, c: 2}, c: 2}));
        });
        it('should return undefined when fetching item from non object', function () {
            var query = new MongoQuery();

            assert.strictEqual(undefined, query._findElement('a.b', {a: 1}));
            assert.strictEqual(undefined, query._findElement('a.b', {a: 'zzz'}));
            assert.strictEqual(undefined, query._findElement('a.b', {a: new Date(0)}));
            assert.strictEqual(undefined, query._findElement('a.b', {a: []}));
            assert.strictEqual(undefined, query._findElement('a.b', {a: null}));
            assert.strictEqual(undefined, query._findElement('a.b', {a: MongoWrapper.ObjectID()}));
        });
        it('should return item when fetching existent item with depth 2', function () {
            var query = new MongoQuery(),
                id = MongoWrapper.ObjectID();

            assert.strictEqual(1, query._findElement('a.b', {a: {b: 1}}));
            assert.strictEqual('zzz', query._findElement('b.c', {b: {c: 'zzz'}}));
            assert.deepEqual(new Date(0), query._findElement('c.d', {c: {d: new Date(0)}}));
            assert.deepEqual([], query._findElement('d.e', {d: {e: []}}));
            assert.strictEqual(null, query._findElement('e.f', {e: {f: null}}));
            assert.strictEqual(id, query._findElement('f.g', {f: {g: id}}));

        });
    });

    describe('#_match', function () {
        it('should match any document if condition is empty object', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._match({}, {}));
            assert.strictEqual(true, query._match({}, {_id: MongoWrapper.ObjectID(), zzz: 1, b: {data: new Date()}}));
        });
        it('should join subconditions with conjunction operator', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._match({a: 1}, {a: 1, b: 2, c: 5}));
            assert.strictEqual(false, query._match({a: 2}, {a: 1, b: 2, c: 5}));
            assert.strictEqual(false, query._match({a: 1, b: 5}, {a: 1, b: 2, c: 5}));
            assert.strictEqual(true, query._match({a: 1, b: 2}, {a: 1, b: 2, c: 5}));
        });
        it('should call _matchTopLevelOperator when processing operator', function () {
            var query = new MongoQuery(),
                args = [],
                condition = {a: 'qwerty', $nor: args, b: 123, $and: args, $or: [], zzz: 5},
                doc = {a: 'qwerty', b: 123, zzz: 5},
                actualCalls = [],
                fakeFcn = function (operator, args, document) {
                    actualCalls.push({operator: operator, args: args, document: document});
                    return true;
                };

            query._matchTopLevelOperator = fakeFcn;
            query._match(condition, doc);
            assert.strictEqual(
                Object.keys(condition).filter(function (key) {
                    return key.indexOf('$') !== -1;
                }).length,
                actualCalls.length
            );
            actualCalls.forEach(function (oneCall) {
                assert(condition[oneCall.operator]);
                assert.strictEqual(condition[oneCall.operator], oneCall.args);
                assert.strictEqual(doc, oneCall.document);
            });
        });
        it('should call _matchFieldCondition when processing simple equality condition', function () {
            var query = new MongoQuery(),
                condition = {a: 'qwerty', b: 123, zzz: 5},
                doc = {a: 'qwerty', b: 123, zzz: 5, qwerty: 4, aaa: 3},
                actualCalls = [],
                fakeFcn = function (field, value, document) {
                    actualCalls.push({field: field, value: value, document: document});
                    return true;
                };

            query._matchFieldCondition = fakeFcn;
            query._match(condition, doc);
            assert.strictEqual(
                Object.keys(condition).filter(function (key) {
                    return key.indexOf('$') === -1;
                }).length,
                actualCalls.length
            );
            actualCalls.forEach(function (oneCall) {
                assert(condition[oneCall.field]);
                assert.strictEqual(condition[oneCall.field], oneCall.value);
                assert.strictEqual(doc, oneCall.document);
            });
        });
    });

    describe('#_matchFieldCondition', function () {
        it('should fail when using field as operator', function () {
            var query = new MongoQuery();
            assert.throws(function () {
                query._matchFieldCondition('$eq', {}, {});
            });
        });
        it('should verify equality for single value - non operator condition', function () {
            var query = new MongoQuery();

            assert.strictEqual(true, query._matchFieldCondition('a', 5, {a: 5}));
            assert.strictEqual(false, query._matchFieldCondition('a', 4, {a: 5}));
            assert.strictEqual(false, query._matchFieldCondition('a', {}, {a: 5}));
            assert.strictEqual(true, query._matchFieldCondition('a', {}, {a: {}}));
            assert.strictEqual(true, query._matchFieldCondition('a', {}, {a: {}}));
            assert.strictEqual(false, query._matchFieldCondition('a', 'zzz', {a: 'qwerty'}));
            assert.strictEqual(true, query._matchFieldCondition('a', 'zzz', {a: 'zzz'}));
        });

        it('should correctly handle condition with empty object', function () {
            var query = new MongoQuery();
            assert.strictEqual(false, query._matchFieldCondition('a', {}, {a: 1}));
            assert.strictEqual(true, query._matchFieldCondition('a', {}, {a: {}}));
        });

        it('should correctly handle condition with object containing value', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._matchFieldCondition('a', {b: 123}, {a: {b: 123}}));
            assert.strictEqual(false, query._matchFieldCondition('a', {b: 123}, {a: {b: 123, c: 555}}));
            assert.strictEqual(false, query._matchFieldCondition('a', {b: 123}, {a: 5}));
            assert.strictEqual(false, query._matchFieldCondition('a', {b: 123}, {a: {c: 5}}));
        });


        it('should verify apply operator check', function () {
            var query = new MongoQuery();

            assert.strictEqual(true, query._matchFieldCondition('a', {$eq: 5}, {a: 5}));
            assert.strictEqual(false, query._matchFieldCondition('a', {$eq: 4}, {a: 5}));
            assert.strictEqual(false, query._matchFieldCondition('a', {$gt: 5}, {a: 5}));
            assert.strictEqual(true, query._matchFieldCondition('a', {$gt: 4}, {a: 5}));
        });

        it('should correctly handle condition with empty object using $eq operator', function () {
            var query = new MongoQuery();
            assert.strictEqual(false, query._matchFieldCondition('a', {$eq: {}}, {a: 1}));
            assert.strictEqual(true, query._matchFieldCondition('a', {$eq: {}}, {a: {}}));
        });

        it('should join subcondition with conjunction operator', function () {
            var query = new MongoQuery();

            assert.strictEqual(true, query._matchFieldCondition('a', {$eq: 5, $gt: 3}, {a: 5}));
            assert.strictEqual(false, query._matchFieldCondition('a', {$eq: 4, $gt: 3}, {a: 5}));
            assert.strictEqual(false, query._matchFieldCondition('a', {$eq: 5, $lt: 3}, {a: 5}));
            assert.strictEqual(false, query._matchFieldCondition('a', {$eq: 4, $lt: 3}, {a: 5}));
        });

        it('should fail on unknow operator', function () {
            var query = new MongoQuery();
            assert.throws(function () {
                query._matchFieldCondition('a', {$zzz: 5}, {});
            });
        });

        it('should disallow to mix operators and plain values', function () {
            var query = new MongoQuery();
            assert.throws(function () {
                query._matchFieldCondition('a', {zzz: 5, $eq: 1}, {});
                query._matchFieldCondition('a', {zzz: 5, $eq: 2}, {a: {}});
            });
        });
    });

    describe('_matchTopLevelOperator', function () {
        it('should work only with logical operators', function () {
            var query = new MongoQuery();
            assert.throws(query._matchTopLevelOperator.bind(query, 'zz', [], {}));
            assert.throws(query._matchTopLevelOperator.bind(query, '$zz', [], {}));
        });
        it('should call correct operator method operator method for $and', function () {
            var query = new MongoQuery(),
                calledOperator = null,
                fakeOperator = function (definedAsOperator, callTimeArgs,
                    callTimeDocument, acutualArgs, actualDocument) {
                    assert.strictEqual(callTimeArgs, acutualArgs);
                    assert.strictEqual(callTimeDocument, actualDocument);
                    calledOperator = definedAsOperator;
                };

            //do not spoil prototype
            query._logicalOperators = {};

            Object.keys(query._logicalOperators).forEach(function (operator) {
                var args = {},
                    document = {};

                query._logicalOperators[operator] = fakeOperator.bind(query, operator, args, document);
                query._matchTopLevelOperator(operator, args, document);
                assert.strictEqual(operator, calledOperator);
            });
        });
    });

    describe('#$eq', function () {
        it('should correctly check equality of primitive values', function () {
            var query = new MongoQuery(),
                id = MongoWrapper.ObjectID(),
                id1 = MongoWrapper.ObjectID(id),
                id2 = MongoWrapper.ObjectID();

            assert.strictEqual(true, query._operators.$eq.call(query, 1, 1));
            assert.strictEqual(false, query._operators.$eq.call(query, 1, 2));
            assert.strictEqual(true, query._operators.$eq.call(query, 'zz', 'zz'));
            assert.strictEqual(false, query._operators.$eq.call(query, 'zz', 'zzz'));
            assert.strictEqual(true, query._operators.$eq.call(query, new Date(0), new Date(0)));
            assert.strictEqual(false, query._operators.$eq.call(query, new Date(0), new Date(1)));
            assert.strictEqual(true, query._operators.$eq.call(query, true, true));
            assert.strictEqual(true, query._operators.$eq.call(query, false, false));
            assert.strictEqual(false, query._operators.$eq.call(query, true, false));
            assert.strictEqual(true, query._operators.$eq.call(query, null, null));
            assert.strictEqual(false, query._operators.$eq.call(query, null, true));
            assert.strictEqual(false, query._operators.$eq.call(query, null, 1));
            assert.strictEqual(false, query._operators.$eq.call(query, null, 'zzz'));
            assert.strictEqual(false, query._operators.$eq.call(query, null, {}));
            assert.strictEqual(true, query._operators.$eq.call(query, id, id));
            assert.strictEqual(true, query._operators.$eq.call(query, id, id1));
            assert.strictEqual(false, query._operators.$eq.call(query, id, id2));
            assert.strictEqual(false, query._operators.$eq.call(query, id1, id2));
        });
        it('should correctly compare arrays (including values ordering)', function () {
            var query = new MongoQuery(),
                id = MongoWrapper.ObjectID();

            assert.strictEqual(true, query._operators.$eq.call(query, [], []));
            assert.strictEqual(false, query._operators.$eq.call(query, [], {}));
            assert.strictEqual(false, query._operators.$eq.call(query, [], 1));
            assert.strictEqual(false, query._operators.$eq.call(query, [], 'zzz'));
            assert.strictEqual(false, query._operators.$eq.call(query, 1, []));
            assert.strictEqual(false, query._operators.$eq.call(query, 'zzz', []));
            assert.strictEqual(false, query._operators.$eq.call(query, {}, []));
            assert.strictEqual(true, query._operators.$eq.call(query, [1, 'zzz', id], [1, 'zzz', id]));
            assert.strictEqual(false, query._operators.$eq.call(query, [1, 'zzz'], [1, 'zzz', id]));
            assert.strictEqual(false, query._operators.$eq.call(query, [1, 'zzz', id], [1, 'zzz']));
            assert.strictEqual(false, query._operators.$eq.call(query, ['zzz', 1, id], [1, 'zzz', id]));
            assert.strictEqual(false, query._operators.$eq.call(query, ['zzz', id, 1], [1, 'zzz', id]));
            assert.strictEqual(false, query._operators.$eq.call(query, ['zzz', id], [1, 'zzz', id]));
            assert.strictEqual(false, query._operators.$eq.call(query, [id], [1, 'zzz', id]));
            assert.strictEqual(false, query._operators.$eq.call(query, [], [1, 'zzz', id]));
        });
        it('should correctly compare plain objects', function () {
            var query = new MongoQuery(),
                id = MongoWrapper.ObjectID();

            assert.strictEqual(true, query._operators.$eq.call(query, {}, {}));
            assert.strictEqual(false, query._operators.$eq.call(query, [], {}));
            assert.strictEqual(false, query._operators.$eq.call(query, {}, 1));
            assert.strictEqual(false, query._operators.$eq.call(query, {}, 'zzz'));
            assert.strictEqual(false, query._operators.$eq.call(query, 1, {}));
            assert.strictEqual(false, query._operators.$eq.call(query, 'zzz', {}));
            assert.strictEqual(false, query._operators.$eq.call(query, {}, []));
            assert.strictEqual(true, query._operators.$eq.call(
                query,
                {a: 1, b: 'zzz', c: id},
                {a: 1, b: 'zzz', c: id}
            ));
            assert.strictEqual(false, query._operators.$eq.call(
                query,
                {a: 'zzz', b: 1, c: id},
                {a: 1, b: 'zzz', c: id}
            ));
            assert.strictEqual(false, query._operators.$eq.call(
                query,
                {a: 'zzz', b: id, c: 1},
                {a: 1, b: 'zzz', c: id}
            ));
            assert.strictEqual(false, query._operators.$eq.call(
                query,
                {a: 'zzz', b: id, c: 1},
                {a: 'zzz', b: id}
            ));
            assert.strictEqual(false, query._operators.$eq.call(
                query,
                {a: 'zzz', b: id, c: 1},
                {a: 'zzz', b: id, d: 1}
            ));
        });
        it('should work recursively for objects and for arrays', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._operators.$eq.call(
                query,
                {a: {b: 1, c: 2}, b: [1, 2, 3]},
                {a: {b: 1, c: 2}, b: [1, 2, 3]}
            ));
            assert.strictEqual(false, query._operators.$eq.call(
                query,
                {a: {b: 2, c: 2}, b: [1, 2, 3]},
                {a: {b: 1, c: 2}, b: [1, 2, 3]}
            ));
            assert.strictEqual(false, query._operators.$eq.call(
                query,
                {a: {b: 1, c: 2}, b: [2, 3]},
                {a: {b: 1, c: 2}, b: [1, 2, 3]}
            ));
            assert.strictEqual(false, query._operators.$eq.call(
                query,
                {a: {}, b: [2, 3]},
                {a: {b: 1, c: 2}, b: [1, 2, 3]}
            ));
            assert.strictEqual(true, query._operators.$eq.call(
                query,
                [{b: 1, c: 2}, [1, 2, 3]],
                [{b: 1, c: 2}, [1, 2, 3]]
            ));
            assert.strictEqual(false, query._operators.$eq.call(
                query,
                [{b: 1, d: null}, [1, 2, 3]],
                [{b: 1, c: 2}, [1, 2, 3]]
            ));
            assert.strictEqual(false, query._operators.$eq.call(
                query,
                [{b: 1, c: 2}, [1, 3]],
                [{b: 1, c: 2}, [1, 2, 3]]
            ));
            assert.strictEqual(false, query._operators.$eq.call(
                query,
                [{c: 2}, []],
                [{b: 1, c: 2}, [1, 2, 3]]
            ));

        });
    });

    describe('#$lt', function () {
        it('should return true when value is less then condition', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._operators.$lt.call(query, 5, 3));
            assert.strictEqual(true, query._operators.$lt.call(query, 5, 1e-3));
            assert.strictEqual(false, query._operators.$lt.call(query, 5, 6));
            assert.strictEqual(false, query._operators.$lt.call(query, 5, 10.5));
            assert.strictEqual(false, query._operators.$lt.call(query, 5, 5));
            //TODO write more test when different types are compared
        });
    });

    describe('#$gt', function () {
        it('should return true when value is greater then condition', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._operators.$gt.call(query, 5, 6));
            assert.strictEqual(true, query._operators.$gt.call(query, 5, 7.1));
            assert.strictEqual(false, query._operators.$gt.call(query, 5, 4));
            assert.strictEqual(false, query._operators.$gt.call(query, 5, 2.2));
            assert.strictEqual(false, query._operators.$gt.call(query, 5, 5));
            //TODO write more test when different types are compared
        });
    });

    describe('$and', function () {
        it('should fail on incorrect condition', function () {
            var query = new MongoQuery();
            assert.throws(function () {
                query._logicalOperators.$and.call(query, {}, {});
            });
            assert.throws(function () {
                query._logicalOperators.$and.call(query, null, {});
            });
            assert.throws(function () {
                query._logicalOperators.$and.call(query, [], {});
            });
        });
        it('should join subconditions with conjunction', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._logicalOperators.$and.call(query, [{a: 1}], {a: 1}));
            assert.strictEqual(false, query._logicalOperators.$and.call(query, [{a: 1}], {b: 1}));
            assert.strictEqual(false, query._logicalOperators.$and.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {a: 1}
            ));
            assert.strictEqual(false, query._logicalOperators.$and.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {b: 2}
            ));
            assert.strictEqual(true, query._logicalOperators.$and.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {a: 1, b: 2}
            ));
            assert.strictEqual(false, query._logicalOperators.$and.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {a: 6, b: 7}
            ));
        });
    });

    describe('$or', function () {
        it('should fail on incorrect condition', function () {
            var query = new MongoQuery();
            assert.throws(function () {
                query._logicalOperators.$or.call(query, {}, {});
            });
            assert.throws(function () {
                query._logicalOperators.$or.call(query, null, {});
            });
            assert.throws(function () {
                query._logicalOperators.$or.call(query, [], {});
            });
        });
        it('should join subconditions with disjunction', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._logicalOperators.$or.call(query, [{a: 1}], {a: 1}));
            assert.strictEqual(false, query._logicalOperators.$or.call(query, [{a: 1}], {b: 1}));
            assert.strictEqual(true, query._logicalOperators.$or.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {a: 1}
            ));
            assert.strictEqual(true, query._logicalOperators.$or.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {b: 2}
            ));
            assert.strictEqual(true, query._logicalOperators.$or.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {a: 1, b: 2}
            ));
            assert.strictEqual(false, query._logicalOperators.$or.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {a: 6, b: 7}
            ));
        });
    });

    describe('$nor', function () {
        it('should fail on incorrect condition', function () {
            var query = new MongoQuery();
            assert.throws(function () {
                query._logicalOperators.$nor.call(query, {}, {});
            });
            assert.throws(function () {
                query._logicalOperators.$nor.call(query, null, {});
            });
            assert.throws(function () {
                query._logicalOperators.$nor.call(query, [], {});
            });
        });
        it('should return true only when all conditions mismatches', function () {
            var query = new MongoQuery();
            assert.strictEqual(false, query._logicalOperators.$nor.call(query, [{a: 1}], {a: 1}));
            assert.strictEqual(true, query._logicalOperators.$nor.call(query, [{a: 1}], {b: 1}));
            assert.strictEqual(false, query._logicalOperators.$nor.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {a: 1}
            ));
            assert.strictEqual(false, query._logicalOperators.$nor.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {b: 2}
            ));
            assert.strictEqual(false, query._logicalOperators.$nor.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {a: 1, b: 2}
            ));
            assert.strictEqual(true, query._logicalOperators.$nor.call(
                query,
                [{a: {$eq: 1}}, {b: {$eq: 2}}],
                {a: 6, b: 7}
            ));
        });
    });

    describe('$not', function () {
        it('should invert value of argument condition', function () {
            var query = new MongoQuery();
            assert.strictEqual(true, query._logicalOperators.$not.call(query, {a: 1}, {a: 2}));
            assert.strictEqual(true, query._logicalOperators.$not.call(query, {a: {$eq: 2}}, {a: 1}));
            assert.strictEqual(true, query._logicalOperators.$not.call(query, {a: {$gt: 5}}, {a: 0}));
            assert.strictEqual(false, query._logicalOperators.$not.call(query, {a: 1}, {a: 1}));
            assert.strictEqual(false, query._logicalOperators.$not.call(query, {a: {$eq: 2}}, {a: 2}));
            assert.strictEqual(false, query._logicalOperators.$not.call(query, {}, {a: 123, b: []}));
            assert.strictEqual(false, query._logicalOperators.$not.call(query, {a: {$eq: []}}, {a: []}));
        });
    });

});
