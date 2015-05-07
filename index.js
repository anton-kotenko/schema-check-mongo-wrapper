var MongoDb = require('mongodb'),
    ConnectionWrapper = require(__dirname + '/lib/connection_wrapper.js'),
    SafeCollectionWrapper = require(__dirname + '/lib/safe_collection.js'),
    CursorWrapper = require(__dirname + '/lib/cursor_wrapper.js');

module.exports = {
    ConnectionWrapper: ConnectionWrapper,
    SafeCollectionWrapper: SafeCollectionWrapper,
    CursorWrapper: CursorWrapper,
    ObjectID: MongoDb.ObjectID.bind(MongoDb)
};
