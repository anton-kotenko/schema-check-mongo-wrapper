/*global describe*/
/*global it*/
var TestTools = require(__dirname + '/../tools/tools.js'),
    Vow = require('vow'),
    Domain = require('domain'),
    assert = require('assert'),
    MongoWrapper = require(__dirname + '/../../'),
    ConnectionConfigProvider = MongoWrapper.ConnectionConfigProvider;

describe('Connection', function () {
    it('should exists', function () {
        assert(MongoWrapper.Connection instanceof Object);
    });
    it('should be constructable', function () {
        var mongoUrl = TestTools.getMongoUrl(),
            mongoOptions = TestTools.getMongoOptions(),
            instance = new MongoWrapper.Connection(mongoUrl, mongoOptions);
        assert(instance._connectionConfig instanceof ConnectionConfigProvider);
        assert.strictEqual(instance._connectionPromise, undefined);
    });
    describe('#connect', function () {
        it('should exits', function () {
            assert(TestTools.getConnection().connect instanceof Function);
        });
        it('should return promise', function () {
            assert(Vow.isPromise(TestTools.getConnection().connect()));
        });
        it('should connect to database', function (done) {
            var instance = TestTools.getConnection(),
                promise = instance.connect();

            promise.then(function (conn) {
                assert.strictEqual(conn, instance);
                done();
            }).fail(done);
        });
        it('should return correct promise for correct domain', function (done) {
            var instance = TestTools.getConnection(),
                domain1 = Domain.create(),
                domain2 = Domain.create(),
                p1, p2;

            p1 = domain1.run(function () {
                return instance.connect();
            });
            p2 = domain2.run(function () {
                return instance.connect();
            });
            p1.then(function () {
                assert.strictEqual(process.domain, domain1);
            });

            p2.then(function () {
                assert.strictEqual(process.domain, domain2);
            });

            Vow.allResolved([p2, p2]).spread(function (p1, p2) {
                done(p1.isRejected() && p1.valueOf() || p2.isRejected() && p2.valueOf() || undefined);
            });
        });
        it('should save mongo database after connection', function (done) {
            TestTools.getConnection().connect().then(function (instance) {
                assert(instance._db);
                done();
            }).fail(done);
        });
    });
    describe('#collection', function () {
        it('should return CollectionWrapper', function () {
            var collection = TestTools.getConnection().collection('zzz');
            assert(collection instanceof MongoWrapper.SafeCollection);
        });
        it('should pass schema and validation options arguments to collection constructor', function () {
            var collection = TestTools.getConnection().collection(
                TestTools.getCollectionName(),
                TestTools.getSchema()
            );
            assert(collection._schema);
            assert.strictEqual(collection._enforceChecks, true);
            assert.strictEqual(collection._warningsEnabled, false);

            collection = TestTools.getConnection().collection(
                TestTools.getCollectionName(),
                TestTools.getSchema(),
                {}
            );
            assert(collection._schema);
            assert.strictEqual(collection._enforceChecks, true);
            assert.strictEqual(collection._warningsEnabled, false);

            collection = TestTools.getConnection().collection(
                TestTools.getCollectionName(),
                TestTools.getSchema(),
                {
                    enforceChecks: false
                }
            );
            assert(collection._schema);
            assert.strictEqual(collection._enforceChecks, false);
            assert.strictEqual(collection._warningsEnabled, false);

            collection = TestTools.getConnection().collection(
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
    });
    describe('#nativeCollection', function () {
        it('should return native mongo collection', function (done) {
            TestTools.getConnection().connect().then(function (instance) {
                assert(instance.nativeCollection('zzz'));
                done();
            });
        });
        it('should throw exception if not connected', function (done) {
            var instance = TestTools.getConnection();
            try {
                instance.nativeCollection('ZZZ');
            } catch (e) {
                assert(e);
                return done();
            }
            done(new Error());
        });
        it('should throw exception on incorrect argument', function (done) {
            TestTools.getConnection().connect().then(function (instance) {
                try {
                    instance.nativeCollection();
                } catch (e) {
                    return done();
                }
                done(new Error());
            }).fail(done);
        });
    });
});
describe('Connection#get', function () {
    it('should create instance of connection wrapper', function () {
        var instance = MongoWrapper.Connection.get(TestTools.getMongoUrl(), TestTools.getMongoOptions());
        assert(instance instanceof MongoWrapper.Connection);
    });
    it('should be cached', function () {
        var instance1 = MongoWrapper.Connection.get(TestTools.getMongoUrl(), TestTools.getMongoOptions()),
            instance2 = MongoWrapper.Connection.get(TestTools.getMongoUrl(), TestTools.getMongoOptions());

        assert.strictEqual(instance1, instance2);
    });
    it('should be cached per connection+options', function () {
        var instance1 = MongoWrapper.Connection.get('mongodb://127.0.0.1:27017/test1', {}),
            instance2 = MongoWrapper.Connection.get('mongodb://127.0.0.1:27017/test2', {}),
            instance3 = MongoWrapper.Connection.get('mongodb://127.0.0.1:27017/test1', {server: {poolSize: 4}}),
            instance4 = MongoWrapper.Connection.get('mongodb://127.0.0.1:27017/test2', {server: {poolSize: 4}});
        assert(instance1 !== instance2 && instance2 !== instance3 && instance3 !== instance4 &&
            instance2 !== instance4 && instance1 !== instance3 && instance1 !== instance4);
    });
});
