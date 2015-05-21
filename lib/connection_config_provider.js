/**
 * Helper class that incapsulates fetching
 * of connection configuration.
 * Default implementaion and interface
 */
var Vow = require('vow'),
    /**
     * @constructor {ConnectionConfigProvider}
     * @param {String} connectionUrl http://docs.mongodb.org/master/reference/connection-string/
     * @param {Object} [connectionOptions={}] http://mongodb.github.io/node-mongodb-native/1.4/driver-articles/mongoclient.html#mongoclient-connect-options
     */
    ConnectionConfigProvider = function (connectionUrl, connectionOptions) {
        this._connectionUrl = connectionUrl;
        this._connectionOptions = connectionOptions;
    };

ConnectionConfigProvider.prototype = {

    /**
     * Get promise to options
     * @returns {Vow.promise<{url: String, options: Object}, Error>}
     */
    get: function () {
        return Vow.fulfill({
            url: this._connectionUrl,
            options: this._connectionOptions
        });
    }
};

/**
 * Create instance of current class applying all
 * arguments to constructor when
 * @param {Array<*>} args
 * jscs crashes here. intentionally write bad jsdoc
 * returns {ConnectionConfigProvider}
 */
ConnectionConfigProvider.create = function (args) {
    //corretcly hanlde case when args is not array but arguments
    args = [].slice.call(args || [], 0);
    args.unshift(null);
    return new (this.bind.apply(this, args))();
};
module.exports = ConnectionConfigProvider;
