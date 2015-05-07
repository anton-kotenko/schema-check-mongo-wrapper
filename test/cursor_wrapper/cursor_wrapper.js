/*global describe*/
/*global it*/
/*global after*/
var TestTools = require(__dirname + '/../tools/tools.js'),
    assert = require('assert'),
    MongoWrapper = require(__dirname + '/../../');

describe('CursorWrapper', function () {
    it('should exists', function () {
        assert(MongoWrapper.CursorWrapper);
    });
    describe('#toArray', function () {
        it('should work', function (done) {
            TestTools.getCollection().find({}).toArray()
                .then(function (result) {
                    assert(result instanceof Array);
                    assert(result.length >= 0);
                    done();
                })
                .fail(done);
        });
    });

    after(function (done) {
        TestTools.getCollection().drop().always(function () {
            done();
        });
    });
});
