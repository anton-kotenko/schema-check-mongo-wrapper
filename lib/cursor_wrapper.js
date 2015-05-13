//FIXME jsdoc, tests
var Tools = require(__dirname + '/tools.js'),
    CursorWrapper = function (nativeCursorPromise, debugCtx) {
        this._cursorPromise = nativeCursorPromise;
        this._debugCtx = debugCtx;
    };

CursorWrapper.prototype = {

    toArray: function () {
        var promise = this._cursorPromise.then(function (nativeCursor) {
            return Tools.promisify(nativeCursor, nativeCursor.toArray)();
        });
        if (this._debugCtx) {
            this._debugCtx.intercept('toArray', [], promise);
        }
        return promise;
    },

    sort: function () {
        var args = arguments;

        if (this._debugCtx) {
            this._debugCtx.log('sort', arguments);
        }
        this._cursorPromise = this._cursorPromise.then(function (nativeCursor) {
            return nativeCursor.sort.apply(nativeCursor, args);
        });
        return this;
    },

    limit: function () {
        var args = arguments;

        if (this._debugCtx) {
            this._debugCtx.log('limit', arguments);
        }
        this._cursorPromise = this._cursorPromise.then(function (nativeCursor) {
            return nativeCursor.limit.apply(nativeCursor, args);
        });
        return this;
    }
    
};

module.exports = CursorWrapper;
