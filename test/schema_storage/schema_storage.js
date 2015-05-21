/*global describe*/
/*global it*/
var assert = require('assert'),
    TV4 = require('tv4'),
    MongoWrapper = require(__dirname + '/../../');

describe('SchemaStorage', function () {

    it('should exists', function () {
        assert(MongoWrapper.SchemaStorage);
        assert(MongoWrapper.SchemaStorage.getSchema instanceof Function);
        assert(MongoWrapper.SchemaStorage.addSchema instanceof Function);
    });

    describe('#addSchema', function () {
        it('should work', function () {
            var schema = {};
            MongoWrapper.SchemaStorage.addSchema('http://zzz', schema);
            assert.deepEqual(schema, TV4.getSchema('http://zzz'));
        });
    });

    describe('#getSchema', function () {
        it('should work', function () {
            var schema = {};
            TV4.addSchema('http://qwerty', schema);
            assert.deepEqual(schema, MongoWrapper.SchemaStorage.getSchema('http://qwerty'));
        });
    });

});

