/*global describe*/
/*global it*/
var MongoUpdate = require(__dirname + '/../../lib/mongo_update.js'),
    MongoWrapper = require(__dirname + '/../../'),
    assert = require('assert');

describe('MongoUpdate', function () {
    it('should exits', function () {
        assert(MongoUpdate);
        assert(MongoUpdate instanceof Function);
    });

    describe('#MongoUpdate', function () {
        it('should be constructable', function () {
            assert(new MongoUpdate({}) instanceof MongoUpdate);
        });

        it('should fail without arguments', function () {
            assert.throws(function () {
                new MongoUpdate(); //jshint ignore:line
            });
        });

        it('should use empty obect as default for second argument', function () {
            var update = new MongoUpdate({});
            assert.deepEqual(update._options, {});
        });

        it('should fail when mixing operator and non operator mode', function () {
            assert.throws(function () {
                new MongoUpdate({$set: {}, zzz: 1}); //jshint ignore:line
            });
        });

        it('should fail on unknow operators', function () {
            assert.throws(function () {
                new MongoUpdate({$qwerty: {}, $set: {}}); //jshint ignore:line
            });
        });
    });

    describe('apply', function () {
        it('should work in operator mode', function () {
            var update = new MongoUpdate({
                    $set: {a: 6, d: [1, 2, 3]},
                    $unset: {b: '', 'c.d': ''},
                    $rename: {c: 'f'},
                    $inc: {'x.y.z': 5}
                }),
                document = {
                    a: 5,
                    b: 7,
                    c: {
                        d: 8
                    }
                };
            assert.strictEqual(document, update.apply(document));
            assert.deepEqual(document, {
                a: 6,
                d: [1, 2, 3],
                f: {},
                x: {y: {z: 5}}
            });
        });

        it('should work in non operator mode', function () {
            var updateValue = {
                    a: 5,
                    b: {
                        c: {
                            d: 'zzz',
                            e: new Date(0)
                        }
                    }
                },
                update = new MongoUpdate(updateValue),
                document = {
                    a: {
                        b: {
                            c: 123,
                            d: {zzz: 1}
                        },
                        e: 123
                    },
                    f: 5
                };
            assert.deepEqual(updateValue, update.apply(document));
        });
    });

    describe('isOperatorUpdate', function () {
        it('should return true on operator update', function () {
            var update = new MongoUpdate({$set: {a: 1, b: 5}});
            assert.strictEqual(true, update.isOperatorUpdate());
        });

        it('should return false on only values update', function () {
            var update = new MongoUpdate({a: 5, b: 3});
            assert.strictEqual(false, update.isOperatorUpdate());
        });
    });

    describe('#_getFieldOwnName', function () {
        it('should return last item in fieldPath', function () {
            var update = new MongoUpdate({});
            assert.strictEqual('zzz', update._getFieldOwnName('asdf.qwert.zzz'));
            assert.strictEqual('zzz', update._getFieldOwnName('zzz'));
        });
    });

    describe('#_findElementContainer', function () {
        it('should return original document on single depth fieldPath', function () {
            var update = new MongoUpdate({}),
                document = {kkk: 123};
            assert.strictEqual(document, update._findElementContainer('', document));
            assert.strictEqual(document, update._findElementContainer('zzz', document));
            assert.strictEqual(document, update._findElementContainer('kkk', document));
        });
        it('should return undefined if element does not found if createMissing is false', function () {
            var update = new MongoUpdate({});
            assert.strictEqual(undefined, update._findElementContainer('zzz.kkk', {}));
            assert.strictEqual(undefined, update._findElementContainer('zzz.kkk.mmm', {}));
            assert.strictEqual(undefined, update._findElementContainer('zzz.kkk.mmm.ppp', {}));
        });
        it('should create container if it does not exits and createMissing is true', function () {
            var update = new MongoUpdate({}),
                document = {},
                container = update._findElementContainer('zzz.kkk', document, true);

            assert.deepEqual({}, container);
            assert.deepEqual({zzz: {}}, document);
            assert.strictEqual(document.zzz, container);
            container = update._findElementContainer('zzz.kkk.mmm', document, true);
            assert.deepEqual({}, container);
            assert.deepEqual({zzz: {kkk: {}}}, document);
            assert.strictEqual(document.zzz.kkk, container);
            container = update._findElementContainer('a.b.c.d', document, true);
            assert.deepEqual({}, container);
            assert.deepEqual({zzz: {kkk: {}}, a: {b: {c: {}}}}, document);
            assert.strictEqual(document.a.b.c, container);
        });
        it('should replace non object items when creating missing path to field', function () {
            var update = new MongoUpdate({}),
                document = {
                    a: 'qwerty',
                    b: ['mmm', 123, {}],
                    c: null,
                    d: 1234,
                    e: new Date(),
                    f: MongoWrapper.ObjectID(),
                    g: new RegExp('/zzz/', 'gi'),
                    h: {
                        a: 'qwerty',
                        b: ['mmm', 123, {}],
                        c: null,
                        d: 1234,
                        e: new Date(),
                        f: MongoWrapper.ObjectID(),
                        g: new RegExp('/zzz/', 'gi')
                    }
                };
            ['a', 'b', 'c', 'd', 'e', 'f', 'g'].forEach(function (key) {
                update._findElementContainer(key + '.child', document, true);
                assert.deepEqual(document[key], {}, 'key failed ' + key);
                update._findElementContainer('h.' + key + '.child', document, true);
                assert.deepEqual(document[key], {}, 'key failed h.' + key);
            });
            assert.deepEqual(document, {
                a: {}, b: {}, c: {},
                d: {}, e: {}, f: {}, g: {},
                h: {
                    a: {}, b: {}, c: {}, d: {},
                    e: {}, f: {}, g: {}
                }
            });
        });
        it('should find containing element for element', function () {
            var update = new MongoUpdate({}),
                document = {
                    a: {
                        b: {
                            c: 123
                        },
                        d: 333
                    },
                    e: 5
                };
            assert.strictEqual(document, update._findElementContainer('e', document));
            assert.strictEqual(document.a, update._findElementContainer('a.d', document));
            assert.strictEqual(document.a, update._findElementContainer('a.b', document));
            assert.strictEqual(document.a.b, update._findElementContainer('a.b.c', document));
            assert.strictEqual(document, update._findElementContainer('f', document));
            assert.strictEqual(document.a, update._findElementContainer('a.g', document));
            assert.strictEqual(document.a.b, update._findElementContainer('a.b.h', document));
        });
    });

    describe('_hasAtLeastOneNonOperator', function () {
        it('should return true if has at least one operator in query, and false otherwize', function () {
            var update = new MongoUpdate({});
            assert.strictEqual(false, update._hasAtLeastOneNonOperator());
            update._update = {$zzz: {}};
            assert.strictEqual(false, update._hasAtLeastOneNonOperator());
            update._update = {$set: {}, asdf: {}};
            assert.strictEqual(true, update._hasAtLeastOneNonOperator());
            update._update = {zzz: {}, asdf: {}};
            assert.strictEqual(true, update._hasAtLeastOneNonOperator());
        });
    });

    describe('_hasAtLeastOneOperator', function () {
        it('should return true if has at least one operator in query, and false otherwize', function () {
            var update = new MongoUpdate({});
            assert.strictEqual(false, update._hasAtLeastOneOperator());
            update._update = {$zzz: {}};
            assert.strictEqual(true, update._hasAtLeastOneOperator());
            update._update = {$set: {}, asdf: {}};
            assert.strictEqual(true, update._hasAtLeastOneOperator());
            update._update = {zzz: {}, asdf: {}};
            assert.strictEqual(false, update._hasAtLeastOneOperator());
        });
    });

    describe('_checkOperators', function () {
        it('should return false, if has at least one unknown operator and true otherwize', function () {
            var update = new MongoUpdate({});

            assert.strictEqual(true, update._checkOperators());

            update = new MongoUpdate(Object.keys(MongoUpdate.prototype._operatorMethods)
                .reduce(function (query, operator) {
                    query[operator] = {};
                    return query;
                }, {}));
            assert.strictEqual(true, update._checkOperators());

            update = new MongoUpdate({});
            update._update = {$set: {}, $zzz: {}};
            assert.strictEqual(false, update._checkOperators());
        });
    });

    describe('#_applyForNonOperatorMode', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._applyForNonOperatorMode && (update._applyForNonOperatorMode instanceof Function));
        });
        it('should replace document with new value', function () {
            var updateValue = {
                    a: 5,
                    b: {
                        c: {
                            d: 'zzz',
                            e: new Date(0)
                        }
                    }
                },
                update = new MongoUpdate(updateValue),
                document = {
                    a: {
                        b: {
                            c: 123,
                            d: {zzz: 1}
                        },
                        e: 123
                    },
                    f: 5
                };
            assert.deepEqual(updateValue, update._applyForNonOperatorMode(document));
        });

        it('should keep _id field value', function () {
            var update,
                document = {
                    b: {},
                    _id: MongoWrapper.ObjectID()
                },
                _id = document._id;

            update = new MongoUpdate({a: 5, b: 3, _id: MongoWrapper.ObjectID()});
            document = update._applyForNonOperatorMode(document);
            assert.deepEqual(document, {a: 5, b: 3, _id: _id});
        });

        it('should fail on multi+upsert update, when actually doing upsert', function () {
            var update = new MongoUpdate({a: 5, b: 3, _id: MongoWrapper.ObjectID()}, {upsert: true, multi: true});
            assert.throws(function () {
                update._applyForOperatorMode({});
            });
        });

        it('should not fail on multi+upsert update, when not actually doing upsert', function () {
            var update = new MongoUpdate({a: 5, b: 3, _id: MongoWrapper.ObjectID()}, {upsert: true, multi: true});
            update._applyForNonOperatorMode({_id: MongoWrapper.ObjectID()});
        });

    });

    describe('#_applyForOperatorMode', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._applyForOperatorMode && (update._applyForOperatorMode instanceof Function));
        });
        it('it should apply all operators', function () {
            var update = new MongoUpdate({
                    $set: {a: 6, d: [1, 2, 3]},
                    $unset: {b: '', 'c.d': ''},
                    $rename: {c: 'f'},
                    $inc: {'x.y.z': 5}
                }),
                document = {
                    a: 5,
                    b: 7,
                    c: {
                        d: 8
                    }
                };
            assert.strictEqual(document, update._applyForOperatorMode(document));
            assert.deepEqual(document, {
                a: 6,
                d: [1, 2, 3],
                f: {},
                x: {y: {z: 5}}
            });
        });
    });


    describe('#_applyOneOperator', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._applyOneOperator && (update._applyOneOperator instanceof Function));
        });
        it('it should apply operator to all fields', function () {
            var update = new MongoUpdate({}),
                document = {
                    b: 7
                };
            assert.strictEqual(document, update._applyOneOperator('$set', {a: 5, 'z.c.f': {k: 123}, b: 4}, document));
            assert.deepEqual(document, {
                a: 5,
                z: {c: {f: {k: 123}}},
                b: 4
            });
        });
    });

    describe('#$set', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._operatorMethods.$set && (update._operatorMethods.$set instanceof Function));
        });
        it('should replace existing items', function () {
            var update = new MongoUpdate({}),
                $set = update._operatorMethods.$set.bind(update),
                document = {
                    a: {
                        b: {
                            c: 123,
                            d: {zzz: 1}
                        },
                        e: 123
                    },
                    f: 5
                };
            assert.strictEqual(document, $set('f', 6, document));
            assert.deepEqual(document.f, 6);
            assert.strictEqual(document, $set('a.e', 5, document));
            assert.deepEqual(document.a.e, 5);
            assert.strictEqual(document, $set('a.b.c', {asdf: 1}, document));
            assert.deepEqual(document.a.b.c, {asdf: 1});
            assert.strictEqual(document, $set('a.b.d', {qwerty: 1}, document));
            assert.deepEqual(document.a.b.d, {qwerty: 1});
            assert.strictEqual(document, $set('a.b', 123, document));
            assert.deepEqual(document.a.b, 123);
            assert.strictEqual(document, $set('a', 'qwerty', document));
            assert.deepEqual(document.a, 'qwerty');

            assert.deepEqual(document, {f: 6, a: 'qwerty'});
        });

        it('should create missing items', function () {
            var update = new MongoUpdate({}),
                $set = update._operatorMethods.$set.bind(update),
                document = {
                    a: {
                        b: {
                            c: 123,
                            d: {zzz: 1}
                        },
                        e: 123
                    },
                    f: 5
                };

            assert.strictEqual(document, $set('g', 555, document));
            assert.strictEqual(document.g, 555);

            assert.strictEqual(document, $set('a.g', 'zzz', document));
            assert.strictEqual(document.a.g, 'zzz');

            assert.strictEqual(document, $set('a.e.g', 123, document));
            assert.strictEqual(document.a.e.g, 123);

            assert.strictEqual(document, $set('a.b.c.g', new Date(0), document));
            assert.deepEqual(document.a.b.c.g, new Date(0));
        });

    });

    describe('#$unset', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._operatorMethods.$unset && (update._operatorMethods.$unset instanceof Function));
        });
        it('should remove existing items', function () {
            var update = new MongoUpdate({}),
                $unset = update._operatorMethods.$unset.bind(update),
                document = {
                    a: {
                        b: {
                            c: 123,
                            d: {zzz: 1}
                        },
                        e: 123
                    },
                    f: 5
                };
            assert.strictEqual(document, $unset('f', null, document));
            assert.strictEqual(document.f, undefined);
            assert.strictEqual(document, $unset('a.e', null, document));
            assert.strictEqual(document.a.e, undefined);
            assert.strictEqual(document, $unset('a.b.c', null, document));
            assert.strictEqual(document.a.b.c, undefined);
            assert.strictEqual(document, $unset('a.b.d', null, document));
            assert.strictEqual(document.a.b.d, undefined);
            assert.strictEqual(document, $unset('a.b', null, document));
            assert.strictEqual(document.a.b, undefined);
            assert.strictEqual(document, $unset('a', null, document));
            assert.strictEqual(document.a, undefined);

            assert.deepEqual(document, {});
        });

        it('should not fail on missing items', function () {
            var update = new MongoUpdate({}),
                $unset = update._operatorMethods.$unset.bind(update),
                document = {
                    a: {
                        b: {
                            c: 123,
                            d: {zzz: 1}
                        },
                        e: 123
                    },
                    f: 5
                };

            assert.strictEqual(document, $unset('g', null, document));
            assert.strictEqual(document.g, undefined);

            assert.strictEqual(document, $unset('g.h', null, document));
            assert.strictEqual(document.g, undefined);

            assert.strictEqual(document, $unset('a.e.g', null, document));
            assert.strictEqual(document.a.e.g, undefined);

            assert.strictEqual(document, $unset('a.b.c.g', null, document));
            assert.deepEqual(document.a.b.c.g, undefined);
        });
    });

    describe('#$rename', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._operatorMethods.$rename && (update._operatorMethods.$rename instanceof Function));
        });
        it('should rename item', function () {
            var update = new MongoUpdate({}),
                $rename = update._operatorMethods.$rename.bind(update),
                document = {
                    a: {
                        b: {
                            c: 123,
                            d: {zzz: 1}
                        },
                        e: 123
                    },
                    f: 5
                };
            assert.strictEqual(document, $rename('f', 'g', document));
            assert.strictEqual(document.f, undefined);
            assert.strictEqual(document.g, 5);
            assert.strictEqual(document, $rename('a.e', 'a.g', document));
            assert.strictEqual(document.a.e, undefined);
            assert.strictEqual(document.a.g, 123);
            assert.strictEqual(document, $rename('a.b.c', 'a.b.g', document));
            assert.strictEqual(document.a.b.c, undefined);
            assert.strictEqual(document.a.b.g, 123);
            assert.strictEqual(document, $rename('a.b.d', 'd', document));
            assert.strictEqual(document.a.b.d, undefined);
            assert.deepEqual(document.d, {zzz: 1});
            assert.strictEqual(document, $rename('g', 'a.b.h', document));
            assert.strictEqual(document.g, undefined);
            assert.strictEqual(document.a.b.h, 5);
        });


        it('should do nothing when source item is missing', function () {
            var update = new MongoUpdate({}),
                $rename = update._operatorMethods.$rename.bind(update),
                document = {
                    a: {
                        b: {
                            c: 123,
                            d: {zzz: 1}
                        },
                        e: 123
                    },
                    f: 5
                };

            assert.strictEqual(document, $rename('g', 'h', document));
            assert.strictEqual(document.g, undefined);
            assert.strictEqual(document.h, undefined);

            assert.strictEqual(document, $rename('g.h', 'q', document));
            assert.strictEqual(document.g, undefined);
            assert.strictEqual(document.q, undefined);

            assert.strictEqual(document, $rename('a.e.g', 'a.e.q', document));
            assert.strictEqual(document.a.e.g, undefined);
            assert.strictEqual(document.a.e.q, undefined);

            assert.strictEqual(document, $rename('a.b.g', 'g', document));
            assert.deepEqual(document.a.b.g, undefined);
            assert.deepEqual(document.g, undefined);
        });

        it('should replace existing item when destination already exists', function () {
            var update = new MongoUpdate({}),
                $rename = update._operatorMethods.$rename.bind(update),
                aFieldRef,
                document = {
                    a: {
                        b: {
                            c: 123,
                            d: {zzz: 1}
                        },
                        e: 123
                    },
                    f: 5,
                    g: 7
                };

            assert.strictEqual(document, $rename('g', 'f', document));
            assert.strictEqual(document.g, undefined);
            assert.strictEqual(document.f, 7);

            aFieldRef = document.a;
            assert.strictEqual(document, $rename('a', 'f', document));
            assert.strictEqual(document.a, undefined);
            assert.strictEqual(document.f, aFieldRef);

            assert.strictEqual(document, $rename('f.e', 'f.b.d', document));
            assert.strictEqual(document.f.e, undefined);
            assert.strictEqual(document.f.b.d, 123);
        });

    });

    describe('#$setOnInsert', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._operatorMethods.$setOnInsert && (update._operatorMethods.$setOnInsert instanceof Function));
        });
        it('should do nothing if not upsert', function () {
            var update = new MongoUpdate({}, {upsert: false}),
                $setOnInsert = update._operatorMethods.$setOnInsert.bind(update),
                document;

            document = $setOnInsert('a', 5, {_id: MongoWrapper.ObjectID(), a: 6});
            assert.deepEqual(document.a, 6);

            document = $setOnInsert('a', 5, {a: 7});
            assert.deepEqual(document.a, 7);
        });

        it('should do nothing if document has _id', function () {
            var update = new MongoUpdate({}, {upsert: false}),
                $setOnInsert = update._operatorMethods.$setOnInsert.bind(update),
                document;

            document = $setOnInsert('a', 5, {_id: MongoWrapper.ObjectID(), a: 6});
            assert.deepEqual(document.a, 6);

            update = new MongoUpdate({}, {upsert: true});
            $setOnInsert = update._operatorMethods.$setOnInsert.bind(update);

            document = $setOnInsert('a', 5, {_id: MongoWrapper.ObjectID(), a: 6});
            assert.deepEqual(document.a, 6);
        });

        it('should set values if upsert and no _id field in document', function () {
            var update = new MongoUpdate({}, {upsert: true}),
                $setOnInsert = update._operatorMethods.$setOnInsert.bind(update),
                document;

            document = $setOnInsert('a', 5, {});
            assert.strictEqual(document.a, 5);

        });

    });

    describe('#$inc', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._operatorMethods.$inc && (update._operatorMethods.$inc instanceof Function));
        });
        it('should change value on increment', function () {
            var update = new MongoUpdate({}),
                $inc = update._operatorMethods.$inc.bind(update),
                document = {a: 5};

            $inc('a', 1, document);
            assert.strictEqual(document.a, 6);

            $inc('a', -1, document);
            assert.strictEqual(document.a, 5);

            $inc('a', 7, document);
            assert.strictEqual(document.a, 12);

            $inc('a', -4, document);
            assert.strictEqual(document.a, 8);

            $inc('a', 0.7, document);
            assert.strictEqual(document.a, 8 + 0.7);
        });

        it('should handle missing value', function () {
            var update = new MongoUpdate({}),
                $inc = update._operatorMethods.$inc.bind(update),
                document = {};

            $inc('a', 1, document);
            assert.strictEqual(document.a, 1);

            $inc('b.c', -1, document);
            assert.strictEqual(document.b.c, -1);

            $inc('d.e.f', 7, document);
            assert.strictEqual(document.d.e.f, 7);
        });

        it('should handle value of non numeric value type', function () {
            var update = new MongoUpdate({}),
                $inc = update._operatorMethods.$inc.bind(update),
                document = {
                    a: '123',
                    b: [],
                    c: {}
                };

            $inc('a', 1, document);
            assert.strictEqual(document.a, 124);

            $inc('b', -1, document);
            assert.strictEqual(document.b, -1);

            $inc('c', 7, document);
            assert.strictEqual(document.c, 7);
        });

        it('should handle value of non numeric increment type', function () {
            var update = new MongoUpdate({}),
                $inc = update._operatorMethods.$inc.bind(update),
                document = {
                    a: 5
                };

            $inc('a', '1', document);
            assert.strictEqual(document.a, 6);

            $inc('a', {}, document);
            assert.strictEqual(document.a, 6);

            $inc('a', [], document);
            assert.strictEqual(document.a, 6);
        });

    });

    describe('#$mul', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._operatorMethods.$mul && (update._operatorMethods.$mul instanceof Function));
        });
        it('should change value on multiplication', function () {
            var update = new MongoUpdate({}),
                $mul = update._operatorMethods.$mul.bind(update),
                document = {a: 5};

            $mul('a', 4, document);
            assert.strictEqual(document.a, 20);

            $mul('a', -1, document);
            assert.strictEqual(document.a, -20);

            $mul('a', 7, document);
            assert.strictEqual(document.a, -140);

            $mul('a', 0.5, document);
            assert.strictEqual(document.a, -140 * 0.5);
        });

        it('should handle missing value', function () {
            var update = new MongoUpdate({}),
                $mul = update._operatorMethods.$mul.bind(update),
                document = {};

            $mul('a', 1, document);
            assert.strictEqual(document.a, 0);

            $mul('b.c', -1, document);
            assert.strictEqual(document.b.c, 0);

            $mul('d.e.f', 7, document);
            assert.strictEqual(document.d.e.f, 0);
        });

        it('should handle value of non numeric value type', function () {
            var update = new MongoUpdate({}),
                $mul = update._operatorMethods.$mul.bind(update),
                document = {
                    a: '10',
                    b: [],
                    c: {}
                };

            $mul('a', 5, document);
            assert.strictEqual(document.a, 50);

            $mul('b', -1, document);
            assert.strictEqual(document.b, 0);

            $mul('c', 7, document);
            assert.strictEqual(document.c, 0);
        });

        it('should handle value of non numeric increment type', function () {
            var update = new MongoUpdate({}),
                $mul = update._operatorMethods.$mul.bind(update),
                document = {
                    a: 5,
                    b: 4
                };

            $mul('a', '2', document);
            assert.strictEqual(document.a, 10);

            $mul('a', {}, document);
            assert.strictEqual(document.a, 0);

            $mul('b', [], document);
            assert.strictEqual(document.b, 0);
        });
    });

    describe('#$pull', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._operatorMethods.$pull && (update._operatorMethods.$pull instanceof Function));
        });

        it('should do nothing if field to update is missing', function () {
            var update = new MongoUpdate({}),
                document = {a: 256, b: [], c: '', d: {}};

            assert.strictEqual(document, update._operatorMethods.$pull.call(update, 'zzz', 123, document));
            assert.strictEqual(undefined, document.zzz);
            assert.strictEqual(document, update._operatorMethods.$pull.call(update, 'a.zzz', 123, document));
            assert.strictEqual(256, document.a);
            assert.strictEqual(document, update._operatorMethods.$pull.call(update, 'b.zzz', 123, document));
            assert.deepEqual([], document.b);
            assert.strictEqual(document, update._operatorMethods.$pull.call(update, 'd.zzz', 123, document));
            assert.deepEqual({}, document.d);

            assert.deepEqual(document, {a: 256, b: [], c: '', d: {}});
        });

        it('should remove all matched items', function () {
            var update = new MongoUpdate({});
            assert.deepEqual(
                {a: [1, 2, 4, 5, 4, 6]},
                update._operatorMethods.$pull.call(update, 'a', 3, {a: [1, 2, 3, 3, 4, 5, 4, 6]}
            ));

            assert.deepEqual(
                {a: [1, 2, 3, 3]},
                update._operatorMethods.$pull.call(update, 'a', {$gt: 3}, {a: [1, 2, 3, 3, 4, 5, 4, 6]}
            ));

        });

        it('should not change array, if there are no matched elements', function () {
            var update = new MongoUpdate({});
            assert.deepEqual(
                {a: [1, 2, 3, 3, 4, 5, 4, 6]},
                update._operatorMethods.$pull.call(update, 'a', 7, {a: [1, 2, 3, 3, 4, 5, 4, 6]}
            ));
        });

        it('shoud not change empty array', function () {
            var update = new MongoUpdate({});
            assert.deepEqual(
                {a: []},
                update._operatorMethods.$pull.call(update, 'a', 3, {a: []}
            ));
        });

        it('should not remove array as whole after last element is removed', function () {
            var update = new MongoUpdate({});
            assert.deepEqual(
                {a: []},
                update._operatorMethods.$pull.call(update, 'a', 3, {a: [3]}
            ));
            assert.deepEqual(
                {a: []},
                update._operatorMethods.$pull.call(update, 'a', 3, {a: [3, 3, 3]}
            ));
        });

    });

    describe('#$addToSet', function () {
        it('should exits', function () {
            var update = new MongoUpdate({});
            assert(update._operatorMethods.$addToSet && (update._operatorMethods.$addToSet instanceof Function));
        });

        it('should add element to array', function () {
            var update = new MongoUpdate({}),
                document = {a: 256, b: [], c: '', d: {}};
            assert.strictEqual(document, update._operatorMethods.$addToSet.call(update, 'b', 123, document));
            assert.deepEqual(document, {a: 256, b: [123], c: '', d: {}});
        });

        it('should create empty array for field if it is missing', function () {
            var update = new MongoUpdate({}),
                document = {a: 256, b: [], c: '', d: {}};

            assert.strictEqual(document, update._operatorMethods.$addToSet.call(update, 'zzz', 123, document));
            assert.deepEqual([123], document.zzz);
            assert.strictEqual(document, update._operatorMethods.$addToSet.call(update, 'a.zzz', 555, document));
            assert.deepEqual({zzz: [555]}, document.a);
            assert.strictEqual(document, update._operatorMethods.$addToSet.call(update, 'b.zzz', 123, document));
            assert.deepEqual({zzz: [123]}, document.b);
            assert.strictEqual(document, update._operatorMethods.$addToSet.call(update, 'd.zzz', {}, document));
            assert.deepEqual({zzz: [{}]}, document.d);

            assert.deepEqual(
                document,
                {
                    zzz: [123],
                    a: {zzz: [555]},
                    b: {zzz: [123]},
                    c: '',
                    d: {zzz: [{}]}
                }
            );
        });

        it('should not add element, if such element already exists', function () {
            var update = new MongoUpdate({});
            assert.deepEqual(
                {a: [1, 2, 3, 3, 4, 5, 4, 6]},
                update._operatorMethods.$addToSet.call(update, 'a', 6, {a: [1, 2, 3, 3, 4, 5, 4, 6]}
            ));
        });

    });

});
