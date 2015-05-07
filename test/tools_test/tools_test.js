/*global describe*/
/*global it*/
var Tools = require(__dirname + '/../../lib/tools.js'),
    Vow = require('vow'),
    assert = require('assert');

describe('Tools', function () {
    describe('#promisify', function () {
        it('should exists', function () {
            assert(Tools.promisify instanceof Function);
        });
        it('should rerturn function', function () {
            var result = Tools.promisify({}, function () {});
            assert(result instanceof Function);
        });
        it('generated function should call original function', function (done) {
            var originalFcn = function () {
                done();
            };
            Tools.promisify({}, originalFcn)();
        });
        it('generated function should return promise on call', function () {
            var result = Tools.promisify({}, function () {})();
            assert(Vow.isPromise(result));
        });
        it('original function should be called every time original is called', function () {
            var i, doneCount,
                originalFcn = function () {
                    doneCount++;
                };
            for (i = 0, doneCount = 0; i < 10; i++) {
                Tools.promisify({}, originalFcn)();
            }
            assert.strictEqual(doneCount, i);
        });
        it('generated function should be called in correct context', function (done) {
            var ctx = {},
                originalFcn = function () {
                    assert.strictEqual(ctx, this);
                    done();
                };
            Tools.promisify(ctx, originalFcn).call(null);
        });
        it('generated function should proxy arguments to original when called', function () {
            var args = [],
                i;

            for (i = 0; i < 10; i++) {
                args[i] = String(Math.random());
            }
            args[i++] = {};
            args[i++] = [];

            Tools.promisify({}, function () {
                var originalFunctionArgs = arguments;
                assert.strictEqual(arguments.length === args.length + 1);
                args.forEach(function (argument, i) {
                    assert.strictEqual(argument, originalFunctionArgs[i]);
                });
            });
        });

        it('generated function should add callback to arguments of original function', function () {
            var args = [1, 2, 3];
            Tools.promisify({}, function () {
                var lastArg = arguments[arguments.length - 1];
                assert.strictEqual(arguments.length, args.length + 1);
                assert(lastArg instanceof Function);
            }).apply(this, args);
        });

        it('returned promise should be fulfilled on callback call', function (done) {
            var result = {qqq: 1234};
            Tools.promisify({}, function (callback) {
                callback(null, result);
            })().then(function (fulfilledValue) {
                assert.strictEqual(fulfilledValue, result);
                done();
            }).fail(done);
        });

        it('returned promise should be rejected on callback call with error argument', function (done) {
            var error = new Error();
            Tools.promisify({}, function (callback) {
                callback(error);
            })().then(function () {
                done(new Error('promise should not be fulfilled'));
            }).fail(function (rejectReason) {
                assert.strictEqual(error, rejectReason);
                done();
            });
        });


    });
});
