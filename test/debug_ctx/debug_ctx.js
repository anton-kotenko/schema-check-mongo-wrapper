/*global describe*/
/*global it*/
var DebugCtx = require(__dirname + '/../../lib/debug_ctx.js'),
    TestTools = require(__dirname + '/../tools/tools.js'),
    MongoWrapper = require(__dirname + '/../../'),
    assert = require('assert'),
    Vow = require('vow'),
    EventEmitter = require('events').EventEmitter;

describe('DebugCtx', function () {

    it('should exits', function () {
        assert(DebugCtx instanceof Function);
    });

    it('should be constructable', function () {
        var debugCtx = new DebugCtx(TestTools.getCollection());
        assert(debugCtx instanceof DebugCtx);
    });

    it('should be EventEmitter', function () {
        var debugCtx = new DebugCtx(TestTools.getCollection());
        assert(debugCtx instanceof EventEmitter);
    });

    describe('#log', function () {

        it('should store log info into buffer', function () {
            var debugCtx = new DebugCtx(TestTools.getCollection());
            assert.strictEqual(debugCtx._buf.length, 0);
            debugCtx.log('zzz');
            assert.strictEqual(debugCtx._buf.length, 1);
            assert.strictEqual(debugCtx._buf[0], debugCtx._formatAsMongoShell('zzz'));
            debugCtx.log('zzz', []);
            assert.strictEqual(debugCtx._buf.length, 2);
            assert.strictEqual(debugCtx._buf[1], debugCtx._formatAsMongoShell('zzz', []));
        });

        it('should not be callable after intercept called', function () {
            var debugCtx = new DebugCtx(TestTools.getCollection());
            debugCtx.intercept('count', [], Vow.promise());

            assert.throws(function () {
                debugCtx.log('limit', 1);
            });
        });
    });

    describe('#intercept', function () {

        it('shoud place metod and args in log buffer', function () {
            var debugCtx = new DebugCtx(TestTools.getCollection());
            debugCtx.intercept('zzz', [], Vow.promise());
            assert.strictEqual(debugCtx._buf.pop(), '.zzz()');
        });

        it('should not be callable after intercept called', function () {
            var debugCtx = new DebugCtx(TestTools.getCollection());
            debugCtx.intercept('count', [], Vow.promise());
            assert.throws(function () {
                debugCtx.intercept('find', {id: 123}, Vow.promise());
            });
        });

        it('should emit debug event on promise fulfill', function (done) {
            var debugCtx = new DebugCtx(TestTools.getCollection()),
                promise = Vow.promise();

            debugCtx.intercept('find', {id: 123}, promise);
            debugCtx.once('debug', function (debugMsg) {
                assert(promise.isFulfilled());
                assert(debugMsg.success);
                assert(!debugCtx.error);
                assert.strictEqual(TestTools.getCollection().getCollectionName(), debugMsg.collection);
                assert(debugMsg.time >= 0);
                assert.strictEqual(debugCtx._buf[0], debugMsg.profile);
                done();
            });
            promise.fulfill({});
        });

        it('should emit debug event on promise reject', function (done) {
            var debugCtx = new DebugCtx(TestTools.getCollection()),
                promise = Vow.promise(),
                error = new Error();

            debugCtx.intercept('find', {id: 123}, promise);
            debugCtx.once('debug', function (debugMsg) {
                assert(promise.isRejected());
                assert(!debugMsg.success);
                assert.strictEqual(debugMsg.error, error);
                assert.strictEqual(TestTools.getCollection().getCollectionName(), debugMsg.collection);
                assert(debugMsg.time >= 0);
                assert.strictEqual(debugCtx._buf[0], debugMsg.profile);
                done();
            });
            promise.reject(error);
        });

        it('should return same promise as passed as argument', function () {
            var debugCtx = new DebugCtx(TestTools.getCollection()),
                promise = Vow.promise();

            assert.strictEqual(promise, debugCtx.intercept('find', [{}], promise));
        });

    });

    describe('#_formatAsMongoShell', function () {
        it('should format arguments as method call', function () {
            var debugCtx = new DebugCtx(TestTools.getCollection()),
                emptyArguments = (function () {
                    return arguments;
                })();

            assert.strictEqual('.find()', debugCtx._formatAsMongoShell('find'));
            assert.strictEqual('.find()', debugCtx._formatAsMongoShell('find', []));
            assert.strictEqual('.find()', debugCtx._formatAsMongoShell('find', emptyArguments));

            assert.strictEqual('.find({})', debugCtx._formatAsMongoShell('find', [{}]));
            assert.strictEqual('.find({}, {"zzz": true})', debugCtx._formatAsMongoShell('find', [{}, {zzz: true}]));

        });
    });
    describe('#_makeHumanReadableArgument', function () {
        it('should transform simple values into strings', function () {
            var debugCtx = new DebugCtx(TestTools.getCollection()),
                date = new Date(),
                id = new MongoWrapper.ObjectID();

            assert.strictEqual('1', debugCtx._makeHumanReadableArgument(1));
            assert.strictEqual('"zzzz"', debugCtx._makeHumanReadableArgument('zzzz'));
            assert.strictEqual('null', debugCtx._makeHumanReadableArgument(null));
            assert.strictEqual('NaN', debugCtx._makeHumanReadableArgument(NaN));
            assert.strictEqual('[]', debugCtx._makeHumanReadableArgument([]));
            assert.strictEqual('{}', debugCtx._makeHumanReadableArgument({}));
            assert.strictEqual(
                'ObjectId(\'' + id.valueOf() + '\')',
                debugCtx._makeHumanReadableArgument(id)
            );
            assert.strictEqual(
                'new Date(\'' + date.toISOString() + '\')',
                debugCtx._makeHumanReadableArgument(date)
            );
        });
        it('should transform objects and arrays into strings', function () {
            var debugCtx = new DebugCtx(TestTools.getCollection()),
                date = new Date(),
                id = new MongoWrapper.ObjectID();

            assert.strictEqual(
                debugCtx._makeHumanReadableArgument({
                    a: 1,
                    b: 'zzz',
                    c: id,
                    d: date,
                    e: {f: [1, 2, 3]}
                }),
                '{"a": 1, "b": "zzz", "c": ObjectId(\'' + id.valueOf() + '\'), ' +
                    '"d": new Date(\'' + date.toISOString() + '\'), ' +
                    '"e": {"f": [1, 2, 3]}}'
            );
        });
    });
});
