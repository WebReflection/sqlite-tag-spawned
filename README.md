# sqlite-tag-spawned

[![build status](https://github.com/WebReflection/sqlite-tag-spawned/actions/workflows/node.js.yml/badge.svg)](https://github.com/WebReflection/sqlite-tag-spawned/actions) [![Coverage Status](https://coveralls.io/repos/github/WebReflection/sqlite-tag-spawned/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/sqlite-tag-spawned?branch=main)

The same [sqlite-tag](https://github.com/WebReflection/sqlite-tag#readme) ease but without the native [sqlite3](https://www.npmjs.com/package/sqlite3) dependency, aiming to replace [dblite](https://github.com/WebReflection/dblite#readme).

```js
import SQLiteTagSpawned from 'sqlite-tag-spawned';
// const SQLiteTagSpawned = require('sqlite-tag-spawned');

const {query, get, all, raw} = SQLiteTagSpawned('./db.sql');

await query`CREATE TABLE IF NOT EXISTS names (
  id INTEGER PRIMARY KEY,
  name TEXT
)`;

for (let i = 0; i < 2; i++)
  await query`INSERT INTO names (name) VALUES (${'Name' + i})`;

await get`SELECT name FROM names`;
// { name: 'Name0' }

await all`SELECT * FROM names`;
// [ { id: 1, name: 'Name0' }, { id: 2, name: 'Name1' } ]
```

### Differently from dblite

  * each query is a spawn call
  * transactions are not possible due previous point
  * performance still similar to sqlite3 native module
