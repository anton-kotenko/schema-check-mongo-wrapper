/**
 * Wrapper around mongo's Cursor
 */
var Tools = require(__dirname + '/tools.js'),
    /**
     * @param {Vow.Promsie<Cursor>} nativeCursorPromise
     * @param {DebugCtx} debugCtx
     */
    CursorWrapper = function (nativeCursorPromise, debugCtx) {
        this._cursorPromise = nativeCursorPromise;
        this._debugCtx = debugCtx;
    };

CursorWrapper.prototype = {

    /**
     * Fetch all data from cursor in form of array
     * @returns {Vow.Promise<Object[]}
     */
    toArray: function () {
        var promise = this._cursorPromise.then(function (nativeCursor) {
            return Tools.promisify(nativeCursor, nativeCursor.toArray)();
        });
        if (this._debugCtx) {
            this._debugCtx.intercept('toArray', [], promise);
        }
        return promise;
    },

    /**
     * Set sorting direction on cursor
     * @see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/cursor.html#sort
     * @param {Object} sort
     * @returns {CursorWrapper} return this
     */
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

    /**
     * Set limit of rows to fetch on cursor
     * @see http://mongodb.github.io/node-mongodb-native/1.4/api-generated/cursor.html#limit
     * @param {Number} limit
     * @returns {CursorWrapper} return this
     */
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
