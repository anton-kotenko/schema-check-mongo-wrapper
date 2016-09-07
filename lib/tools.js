/**
 * Helper module, that transformes
 * callback style function into promise style
 */
var Vow = require('vow');
var Domain = require('domain');
module.exports = {

    /**
     * @param {Object} ctx context, that should be used when function is called
     * @param {Function} fcn callback style function: last argument is callback
     * with first argument is error, and second is success value
     * @returns {Function} function, that when invoked, invokes fcn in ctx context
     * proxying arguments to fcn, but does not requires callback argument. Instead
     * it returns promise
     */
    promisify: function (ctx, fcn) {
        var domain = Domain.active;
        return function () {
            var args = [].slice.call(arguments, 0),
                promise = Vow.promise(), 
                cb = function (err, result) {
                    if (err) {
                        promise.reject(err);
                    } else {
                        promise.fulfill(result);
                    }
                };

            if (domain) {
                cb = domain.bind(cb);
            }
            args.push(cb);
            fcn.apply(ctx, args);
            return promise;
        };
    }
};
