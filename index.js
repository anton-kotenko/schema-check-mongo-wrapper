/**
 * @typedef {Object} MongoDocument
 */
var MongoDb = require('mongodb'),
    Connection = require(__dirname + '/lib/connection.js'),
    SafeCollection = require(__dirname + '/lib/safe_collection.js'),
    CollectionWrapper = require(__dirname + '/lib/collection_wrapper.js'),
    CursorWrapper = require(__dirname + '/lib/cursor_wrapper.js'),
    DebugCtx = require(__dirname + '/lib/debug_ctx.js'),
    ConnectionConfigProvider = require(__dirname + '/lib/connection_config_provider.js'),
    SchemaStorage = require(__dirname + '/lib/schema_storage.js');

module.exports = {
    Connection: Connection,
    SafeCollection: SafeCollection,
    CollectionWrapper: CollectionWrapper,
    CursorWrapper: CursorWrapper,
    ObjectID: MongoDb.ObjectID.bind(MongoDb),
    DebugCtx: DebugCtx,
    ConnectionConfigProvider: ConnectionConfigProvider,
    SchemaStorage: SchemaStorage
};

