# mongo-wrapper
Wrapper around [native mongodb javascript driver](https://github.com/mongodb/node-mongodb-native), that provides promise based (using [Vow promises](https://github.com/dfilatov/vow)) interface and data validation with [json schemas](http://json-schema.org/).

Library interface is build to be as close as possible to [mongo shell](http://docs.mongodb.org/master/reference/method/). All asyncronous code is hidden in library, except, actually operation on server and/or recieving data.

<img src="https://travis-ci.org/anton-kotenko/mongo-wrapper.svg?branch=develop"/>

##Installation
```npm install git://github.com/anton-kotenko/mongo-wrapper.git ```

or add 
```json
 "mongo-wrapper": "git://github.com/anton-kotenko/mongo-wrapper.git"
```
in package.json

##Api
Library api is implemented in next classes
* ConnectionWrapper
* SafeCollectionWrapper
* CursorWrapper

###ConnectionWrapper
ConnectionWrapper class is analog of native mongo driver's [Db](http://mongodb.github.io/node-mongodb-native/1.4/api-generated/db.html) class, but also hides in itself code required to connect to database server.

###SafeCollectionWrapper

SafeCollectionWrapper is analog of native drivers [Collection](http://mongodb.github.io/node-mongodb-native/1.4/api-generated/collection.html) class, but methods save, insert and update methods, has posibility of checks if inserted/updated data is valid using json schema attached to collection

###CursorWrapper
CursorWrapper wraps [Cursor](http://mongodb.github.io/node-mongodb-native/1.4/api-generated/cursor.html) class.


##Examples

###Simple example

Simple example: connect to database server and run some commands on collection
```javascript
var MongoWrapper = require('./mongo-wrapper'),
    connection = new MongoWrapper.ConnectionWrapper("mongodb://localhost:27017/testdb");
    collection = connection.collection("myCollection");

collection.insert({field: 123})
    .then(function (insertedDoc) {
        console.log('Document', insertedDoc, 'was inserted in collection');
        return collection.count({field: 123});
    }) 
    .then(function(docCount) {
        console.log('We have ', docCount, " documents that matches condition");
        return collection.update({field: 123}, {$set: {field: 543}});
    })
    .then(function (updateCount) {
        console.log(updateCount, ' documents was updated');
        return collection.find().toArray();
    })
    .then(function (documentsArray) {
        console.log('Collection contains next documents', documentsArray);
        return collection.find().sort({_id: 1}).limit(5).toArray();
    })
    .then(function (documentsArray) {
        console.log('First 5 documents from collection, sorted by _id field desc', documentsArray);
    })
    .fail(function (err) {
        console.log("Something fails ", err);
    });
```

### Example validate data

Example how to store data in mongo's collection with validation
```javascript
var MongoWrapper = require('./mongo-wrapper'),                                                        
    connection = new MongoWrapper.ConnectionWrapper("mongodb://localhost:27017/testdb");              
    collection = connection.collection("myCollection");                                               
    //declare schema for object with two fields a (string) and b (integer),
    //both required, and disallow any other fields
    schema = {                                                                                        
        name: 'Schema',                                                                               
        type: 'object',                                                                               
        properties: {                                                                                 
            a: {                                                                                      
                type: 'string'                                                                        
            },                                                                                        
            b: {                                                                                      
                type: 'integer'                                                                       
            }                                                                                         
        },                                                                                            
        required: ['a', 'b'],                                                                         
        additionalProperties: false,                                                                  
    };                                                                                                
                                                                                                      
collection                                                                                            
    .attachSchema(schema) //attach schema to collection. this schema will be used to verify documents on change
    .warnOnWrongData(true) //write messeges on console when "bad" document is processes
    .setCheckEnforcement(true); //disallow to insert documents, that mismatches schema                              

//{field: 123} obviously does not match schema, insert should fail
collection.insert({field: 123})                                                                       
    .fail(function (error) {                                      
        console.log('Can not insert document, it does not match schema', error);                      
        //{a: 'zzz', b: 123} is good document, so insert works
        return collection.insert({a: 'zzz', b: 123});                                                 
    })                                                                                                
    .then(function (insertedDoc) {
        console.log('Document', insertedDoc, 'was inserted in collection');                           
        //trying to add "field" field {$set: {field: 543}} => that's "bad" document,
        //update should fail
        return collection.update({a: 'zzz', b: 123}, {$set: {field: 543}});                           
    })                                                                                                
    .fail(function (error) {
        console.log('Can not update document, it does not match schema', error);  
        //try to remove required field "a" {$unset: {a: ''}} => should fail
        return collection.update({a: 'zzz', b: 123}, {$unset: {a: ''}});                              
    })                                                                                                
    .fail(function (error) {                                                                          
        console.log('Can not update document, it does not match schema', error);
        //just change values of "a" and "b" fields. Should work
        return collection.update({a: 'zzz', b: 123}, {a: 'qwerty', b: 5});                            
    })                                                                                                
    .then(function (updateCount) {                                                                    
        console.log(updateCount, 'documents was updated');                                            
    })                                                                                                
    .fail(function (err) {                                                                            
        console.log("Something fails ", err);                                                         
    });                                                                                               
```
