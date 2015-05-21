var TV4 = require('tv4');

module.exports = {

    addSchema: function (uri, schema) {
        return TV4.addSchema(uri, schema);
    },

    getSchema: function (uri) {
        return TV4.getSchema(uri);
    }

};
