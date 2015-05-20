var MongoWrapper = require(__dirname + '/../../'),
    CollectionWrapper = require(__dirname + '/../../lib/collection_wrapper.js');

module.exports = {
    getMongoUrl: function () {
        return process.env.MONGO_DATABASE || 'mongodb://127.0.0.1/test';
    },
    getMongoOptions: function () {
        return process.env.MONGO_OPTIONS || {};
    },
    getConnection: function () {
        var mongoUrl = this.getMongoUrl(),
            mongoOptions = this.getMongoOptions();

        return new MongoWrapper.Connection(mongoUrl, mongoOptions);
    },
    getCollectionName: function () {
        return 'zzz';
    },
    getCollection: function () {
        return this.getConnection().collection(this.getCollectionName());
    },
    getUnsafeCollection: function () {
        var connection = this.getConnection();
        return new CollectionWrapper(connection, this.getCollectionName());
    },
    getSchema: function () {
        return {
            title: 'Example schema',
            type: 'object',
            properties: {
                'a': {
                    type: 'string'
                },
                'b': {
                    type: 'integer'
                },
                '_id': {
                    type: 'string',
                    patter: '^[0-9a-f]{24}$'
                }
            },
            required: ['a', 'b'],
            additionalProperties: false
        };
    }
};
