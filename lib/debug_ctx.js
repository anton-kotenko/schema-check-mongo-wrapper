/**
 * Helper block used to collect mongo method calls, their
 * arguments and timings
 */
/**
 * @typedef {Object} DebugCtxMessage
 * @property {Boolean} success
 * @property {Error} [error]
 * @property {Number} time (in milliseconds)
 * @property {String} collection collection name
 * @property {String} method calls formatted as mongo shell
 */
/**
 * @event {DebugCtx#debug}
 * @type {DebugCtxMessage}
 */
var EventEmitter = require('events').EventEmitter,
    assert = require('assert'),
    Util = require('util'),
    MongoDb = require('mongodb'),
    /**
     * Debug data collector class
     * @constructor {DebugCtx}
     * @param {CollectionWrapper} collection
     * @emits {DebugCtx#debug}
     */
    DebugCtx = function (collection) {
        this._collection = collection;
        this._buf = [];
        this._alreadyUsed = false;
        EventEmitter.call(this);
    };

Util.inherits(DebugCtx, EventEmitter);

/**
 * Log method invocation
 * @param {String} method
 * @param {*[]|*} args
 */
DebugCtx.prototype.log = function (method, args) {
    assert(!this._alreadyUsed);
    this._buf.push(this._formatAsMongoShell(method, args));
};

/**
 * Log method invocation, and log
 * execution time and status, by
 * handling promise fulfill/reject.
 * This is though as last thing, that
 * debug context should do
 * @param {String} method
 * @param {*[]|*} args
 * @param {Vow.Promise} promise
 * @returns {Vow.Promise} just promise argument of fuction
 */
DebugCtx.prototype.intercept = function (method, args, promise) {
    var that = this,
        startTime = Date.now();

    assert(!this._alreadyUsed);
    this.log(method, args);
    this._alreadyUsed = true;


    promise.always(function () {
        that.emit('debug', {
            success: promise.isFulfilled(),
            time: Date.now() - startTime,
            collection: that._collection.getCollectionName(),
            profile: that._buf.join(''),
            error: promise.isRejected() && promise.valueOf()
        });
    }).done();
    return promise;
};

/**
 * Format logged method calls into string.
 * String has same format, as in mongo shell
 * example:
 * .find({uid: 123})
 * (db.COLLECTION is omitted)
 * @param {String} method
 * @param {*[]|*} args method arguments
 * @returns {String}
 */
DebugCtx.prototype._formatAsMongoShell = function (method, args) {
    if (!(args instanceof Array)) {
        if (args && (args.constructor === arguments.constructor)) {
            args = [].slice.call(args, 0);
        } else if (args === undefined) {
            args = [];
        } else {
            args = [args];
        }
    }
    return '.' + method + '(' + args.map(this._makeHumanReadableArgument, this).join(', ') + ')';
};

/**
 * Format argument of function as it was written in code.
 * For example: ObjectID("zzzz") transform into string "ObjectID('zzzz')"
 * @param {*} value
 * @returns {String}
 */
DebugCtx.prototype._makeHumanReadableArgument = function (value) {
    if (value === null) {
        return 'null';
    } else if (value === undefined) {
        return '';
    } else if (value.constructor === Object) {
        return '{' + Object.keys(value)
            .map(function (key) {
                return '"' + key + '": ' + this._makeHumanReadableArgument(value[key]);
            }, this)
            .join(', ') + '}';
    } else if (value instanceof Array) {
        return '[' + value.map(this._makeHumanReadableArgument, this).join(', ') + ']';
    } else if (value instanceof MongoDb.ObjectID) {
        return 'ObjectId(\'' + value.valueOf() + '\')';
    } else if (value instanceof Date) {
        return 'new Date(\'' + value.toISOString() + '\')';
    } else if (typeof (value) === 'string') {
        return JSON.stringify(value);
    } else if (typeof (value) === 'number') {
        return value.toString();
    }
    return value.valueOf().toString();
};

module.exports = DebugCtx;
