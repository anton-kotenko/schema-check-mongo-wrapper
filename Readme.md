# mongo-wrapper
Wrapper around [native mongodb javascript driver](https://github.com/mongodb/node-mongodb-native), that provides promise based (using [Vow promises](https://github.com/dfilatov/vow)) interface and data validation with [json schemas](http://json-schema.org/).

Library interface is build to be as close as possible to [mongo shell](http://docs.mongodb.org/master/reference/method/). All asyncronous code is hidden in library, except, actually operation on server and/or recieving data.

Additional feature - data validation before save is implemented in new methods of collection. General rule - they has safe prefix (safeInsert, safeUpdate, safeSave). Schemas are declared per collection.

<img src="https://travis-ci.org/anton-kotenko/mongo-wrapper.svg?branch=develop"/>

##Installation
```npm install git://github.com/anton-kotenko/mongo-wrapper.git ```

or add 
```json
 "mongo-wrapper": "git://github.com/anton-kotenko/mongo-wrapper.git"
```
in package.json



