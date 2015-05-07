var Vow = require('vow');
module.exports = {
    promisify: function (ctx, fcn) {
        return function () {
            var args = [].slice.call(arguments, 0),
                promise = Vow.promise();

            args.push(function (err, result) {
                if (err) {
                    promise.reject(err);
                } else {
                    promise.fulfill(result);
                }
            });
            fcn.apply(ctx, args);
            return promise;
        };
    }
};
