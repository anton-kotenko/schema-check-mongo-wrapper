var Tools = require(__dirname + '/tools.js'),
    CursorWrapper = function (nativeCursorPromise) {
        this._cursorPromise = nativeCursorPromise;
    };

CursorWrapper.prototype = {
    toArray: function () {
        return this._cursorPromise.then(function (nativeCursor) {
            return Tools.promisify(nativeCursor, nativeCursor.toArray)();
        });
    }
};

module.exports = CursorWrapper;
