var MongoUpdate = function (update, options) {
    this._update = update;
    this._options = options || {};
    if (!this._update) {
        throw new Error('incorrect update');
    }
    if (this._hasAtLeastOneOperator()) {
        if (this._hasAtLeastOneNonOperator()) {
            //@see http://docs.mongodb.org/master/reference/method/db.collection.update/#db.collection.update
            //mongo update can not contain operator parts and non operator parts
            throw new Error('incorrect update');
        } else {
            this._operatorMode = true;
        }
    } else {
        this._operatorMode = false;
    }
    if (this._operatorMode && !this._checkOperators()) {
        throw new Error('unknown operators in update');
    }
};
MongoUpdate.prototype = {

    apply: function (document) {
        if (this._operatorMode) {
            return this._applyForOperatorMode(document);
        } else {
            return this._applyForNonOperatorMode(document);
        }
    },

    isOperatorUpdate: function () {
        return this._operatorMode;
    },

    _hasAtLeastOneOperator: function () {
        return Object.keys(this._update).some(function (key) {
            return key.indexOf('$') !== -1;
        });
    },

    _hasAtLeastOneNonOperator: function () {
        return Object.keys(this._update).some(function (key) {
            return key.indexOf('$') === -1;
        });
    },

    _checkOperators: function () {
        return Object.keys(this._update).every(function (operator) {
            return this._operatorMethods[operator];
        }, this);
    },

    _applyForNonOperatorMode: function (document) {
        var newDocument;

        if (this._options.upsert && this._options.multi && !document._id) {
            //@see http://docs.mongodb.org/master/reference/method/db.collection.update/#db.collection.update
            throw new Error('Can not apply full document replace in upsert + multy mode when creating new document');
        }

        //TODO Deep copy should be used
        newDocument = Object.keys(this._update).reduce(function (newDocument, key) {
            newDocument[key] = this._update[key];
            return newDocument;
        }.bind(this), {});
        //@see http://docs.mongodb.org/master/reference/method/db.collection.update/#db.collection.update
        //When replacing document as whole _id should be saved
        if (document._id) {
            newDocument._id = document._id;
        }
        return newDocument;
    },

    _applyForOperatorMode: function (document) {
        return Object.keys(this._update).reduce(function (document, operator) {
            return this._applyOneOperator(operator, this._update[operator], document);
        }.bind(this), document || {});
    },

    _applyOneOperator: function (operator, operatorArgument, document) {
        return Object.keys(operatorArgument).reduce(function (document, fieldPath) {
            return this._operatorMethods[operator].call(this, fieldPath, operatorArgument[fieldPath], document);
        }.bind(this), document);
    },

    _findElementContainer: function (fieldPath, document, createMissing) {
        return fieldPath.split('.').slice(0, -1).reduce(function (subdocument, pathPart) {
            if (subdocument === undefined) {
                return subdocument;
            }

            //tricky way to check if subdocument[pathPart]
            //is missing or it is not simple object (not Array, Date, Regexp, not mongo ObejctId, DBRef, Binary)
            if (subdocument === null ||
                !subdocument[pathPart] ||
                subdocument[pathPart].constructor !== Object) {
                if (createMissing) {

                    subdocument[pathPart] = {};
                    return subdocument[pathPart];
                } else {
                    return undefined;
                }
            } else {
                return subdocument[pathPart];
            }
        }, document);
    },

    _getFieldOwnName: function (fieldPath) {
        return fieldPath.split('.').pop();
    },

    _operatorMethods: {

        $setOnInsert: function (field, fieldValue, document) {
            if (document._id === undefined && this._options.upsert) {
                document = this._operatorMethods.$set.call(this, field, fieldValue, document);
            }
            return document;
        },

        $set: function (field, fieldValue, document) {
            var fieldContainer = this._findElementContainer(field, document, true);
            fieldContainer[this._getFieldOwnName(field)] = fieldValue;
            return document;
        },

        $unset: function (field, fieldValue, document) {
            var fieldContainer = this._findElementContainer(field, document);
            if (fieldContainer) {
                delete fieldContainer[this._getFieldOwnName(field)];
            }
            return document;
        },

        $rename: function (field, fieldValue, document) {
            var fieldContainer = this._findElementContainer(field, document),
                fieldOwnName = this._getFieldOwnName(field),
                value = fieldContainer && fieldContainer[fieldOwnName];

            if (value !== undefined) {
                delete fieldContainer[fieldOwnName];
                document = this._operatorMethods.$set.call(this, fieldValue, value, document);
            }
            return document;
        },

        $inc: function (field, fieldValue, document) {
            var fieldContainer = this._findElementContainer(field, document, true),
                originalValue,
                fieldOwnName = this._getFieldOwnName(field);

            if (fieldContainer) {
                originalValue = Number(fieldContainer[fieldOwnName]) || 0;
                fieldContainer[fieldOwnName] = originalValue + (Number(fieldValue) || 0);
            }
            return document;
        },

        $mul: function (field, fieldValue, document) {
            var fieldContainer = this._findElementContainer(field, document, true),
                originalValue,
                fieldOwnName = this._getFieldOwnName(field);

            if (fieldContainer) {
                originalValue = Number(fieldContainer[fieldOwnName]) || 0;
                fieldContainer[fieldOwnName] = originalValue * (Number(fieldValue) || 0);
            }
            return document;
        }

    }

};
module.exports = MongoUpdate;
