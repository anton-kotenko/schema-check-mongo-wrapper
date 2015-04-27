/*global describe*/
/*global it*/

var TestTools = require(__dirname + '/../tools/tools.js'),
    ConnectionConfigProvider = require(__dirname + '/../../').ConnectionConfigProvider,
    assert = require('assert'),
    Util = require('util'),
    Vow = require('vow');

describe('ConnectionConfigProvider', function () {
    it('should exits', function () {
        assert(ConnectionConfigProvider instanceof Function);
    });
    describe('#get', function () {

        it('should return promise', function () {
            var url = TestTools.getMongoUrl(),
                options = TestTools.getMongoOptions(),
                configProvider = new ConnectionConfigProvider(url, options);

            assert(Vow.isPromise(configProvider.get()));
        });
        it('it should fulfill promise with correct value', function (done) {
            var url = TestTools.getMongoUrl(),
                options = TestTools.getMongoOptions(),
                configProvider = new ConnectionConfigProvider(url, options);

            configProvider.get()
                .then(function (config) {
                    assert.deepEqual(config, {
                        url: url,
                        options: options
                    });
                    done();
                })
                .fail(done);
        });
    });
    describe('#create', function () {
        it('should create instance of ConnectionConfigProvider', function () {
            var arg1 = {},
                arg2 = {},
                inst = ConnectionConfigProvider.create([arg1, arg2]);

            assert(inst instanceof ConnectionConfigProvider);
            assert.strictEqual(inst._connectionUrl, arg1);
            assert.strictEqual(inst._connectionOptions, arg2);
        });
        it('should correctly work with children classes', function () {
            var Child = function () {
                    this._args = [].slice.call(arguments, 0);
                },
                instance;

            Util.inherits(Child, ConnectionConfigProvider);
            Child.create = ConnectionConfigProvider.create;

            instance = Child.create([1, 5, 'zzz', {}]);
            assert(instance instanceof ConnectionConfigProvider);
            assert.deepEqual(instance._args, [1, 5, 'zzz', {}]);
        });

    });
});
