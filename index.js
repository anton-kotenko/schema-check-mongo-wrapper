/**
 * @typedef {Object} MongoDocument
 */
var MongoDb = require('mongodb'),
    ConnectionWrapper = require(__dirname + '/lib/connection_wrapper.js'),
    SafeCollectionWrapper = require(__dirname + '/lib/safe_collection.js'),
    CollectionWrapper = require(__dirname + '/lib/collection_wrapper.js'),
    CursorWrapper = require(__dirname + '/lib/cursor_wrapper.js'),
    DebugCtx = require(__dirname + '/lib/debug_ctx.js'),
    ConnectionConfigProvider = require(__dirname + '/lib/connection_config_provider.js');

module.exports = {
    ConnectionWrapper: ConnectionWrapper,
    SafeCollectionWrapper: SafeCollectionWrapper,
    CollectionWrapper: CollectionWrapper,
    CursorWrapper: CursorWrapper,
    ObjectID: MongoDb.ObjectID.bind(MongoDb),
    DebugCtx: DebugCtx,
    ConnectionConfigProvider: ConnectionConfigProvider
};

