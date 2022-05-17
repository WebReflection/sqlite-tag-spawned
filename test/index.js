import SQLiteTag from '../esm/index.js';
import {array2sql, sql2array} from '../esm/utils.js';

const {all, get, query, raw, transaction, close} = SQLiteTag('./test/sqlite.db', {timeout: 1000});

console.time('sqlite-tag-spawned');

console.log('✔', 'table creation');
await query`CREATE TABLE IF NOT EXISTS bin_data (id INTEGER PRIMARY KEY, data BLOB)`;
console.log('✔', 'inserting blobs');
const one_two_three = new Uint8Array([1, 2, 3]);
await query`INSERT INTO bin_data (data) VALUES (${one_two_three})`;
await query`INSERT INTO bin_data (data) VALUES (${one_two_three.buffer})`;

const asBuffer = hex => Buffer.from(hex, 'hex');
const resumed = asBuffer((await get`SELECT hex(data) AS data FROM bin_data`).data);
console.assert([].join.call(resumed) === [].join.call(one_two_three) && '1,2,3' === [].join.call(one_two_three));
await query`DELETE FROM bin_data`;
await query`INSERT INTO bin_data (data) VALUES (${resumed})`;
const re_resumed = asBuffer((await get`SELECT hex(data) AS data FROM bin_data`).data);
console.assert([].join.call(re_resumed) === [].join.call(one_two_three));
console.log('✔', 'getting blobs');

await query`CREATE TABLE IF NOT EXISTS ${raw`lorem`} (info TEXT)`;
if (!globalThis.DO_NOT_DELETE_FROM)
  await query`DELETE FROM lorem`;

console.log('✔', 'getting nothing from DB');
console.log(
  ' ',
  await get`SELECT * FROM lorem WHERE info=${'test'}` === void 0,
  (await all`SELECT * FROM lorem WHERE info=${'test'}`).length === 0
);

console.log('✔', 'transaction');
const insert = transaction();
for (let i = 0; i < 9; i++)
  insert`INSERT INTO lorem VALUES (${'Ipsum ' + i})`;
await insert.commit();

console.log('✔', 'SQL null');
await query`INSERT INTO lorem VALUES (${null})`;

console.log('✔', 'SQL null via undefined');
await query`INSERT INTO lorem VALUES (${void 0})`;

console.log('✔', 'SQL dates');
await query`INSERT INTO lorem VALUES (${new Date})`;

console.log('✔', 'Single row');
const row = await get`
  SELECT rowid AS id, info
  FROM ${raw`lorem`}
  WHERE info = ${'Ipsum 5'}
`;
console.log(' ', row.id + ": " + row.info);

console.log('✔', 'Multiple rows');
const TABLE = 'lorem';
const rows = await all`SELECT rowid AS id, info FROM ${raw`${TABLE}`} LIMIT ${0}, ${20}`;
for (let row of rows)
  console.log(' ', row.id + ": " + row.info);

const utf8 = '¥ · £ · € · $ · ¢ · ₡ · ₢ · ₣ · ₤ · ₥ · ₦ · ₧ · ₨ · ₩ · ₪ · ₫ · ₭ · ₮ · ₯ · ₹';
console.log('✔', 'Safe utf8');
await query`INSERT INTO lorem VALUES (${utf8})`;
console.assert((await get`SELECT info FROM lorem WHERE info = ${utf8}`).info === utf8);

console.log('✔', 'IN clause');
console.log(' ', await all`SELECT * FROM lorem WHERE info IN (${['Ipsum 2', 'Ipsum 3']})`);

console.log('✔', 'Temporary db as :memory:');
console.log(' ', await SQLiteTag(':memory:').query`.databases`);

console.log('✔', 'Error handling');
try {
  await query`INSERT INTO shenanigans VALUES (1, 2, 3)`;
}
catch ({message}) {
  console.log(' ', message);
}

console.log('✔', 'Empty SQL in transaction');
try {
  const empty = transaction();
  empty``;
  await empty.commit();
}
catch ({message}) {
  console.log(' ', message);
}

console.log('✔', 'SQL injection safe');
try {
  await query`INSERT INTO shenanigans VALUES (?, ${2}, ${3})`;
}
catch ({message}) {
  console.log(' ', message);
}

console.log('✔', 'SQL syntax');
try {
  await query`SHENANIGANS`;
}
catch({message}) {
  console.log(' ', message);
}

console.log('✔', 'SQL values');
try {
  await query`INSERT INTO lorem VALUES (${{no:'pe'}})`;
}
catch({message}) {
  console.log(' ', message);
}

console.log('✔', 'SQL invalid numbers');
try {
  await query`INSERT INTO lorem VALUES (${Infinity})`;
}
catch({message}) {
  console.log(' ', message);
}

console.log('✔', 'SQL invalid empty query');
try {
  await query``;
}
catch({message}) {
  console.log(' ', message);
}

const {query: ro} = SQLiteTag('./test/sqlite.db', {readonly: true, timeout: 1000});
console.log('✔', 'Readonly mode');
try {
  await ro`INSERT INTO lorem VALUES (${'nope'})`;
}
catch({message}) {
  console.log(' ', message);
}

console.log('✔', 'Non SQL query');
console.log(' ', await ro`.databases`);

console.timeEnd('sqlite-tag-spawned');

const array = sql2array('SELECT * FROM table WHERE value = @value AND age = ${age} LIMIT 1');
console.assert(
  JSON.stringify(array) === '["SELECT * FROM table WHERE value = ","value"," AND age = ","age"," LIMIT 1"]',
  'sql2array does not produces the expected result'
);

console.assert(array2sql(array, {value: {}, age: {}}) === '', 'invalid values should not pass');

console.assert(
  array2sql(array, {value: 'test', age: 123}) ===
  "SELECT * FROM table WHERE value = 'test' AND age = 123 LIMIT 1",
  'array2sql does not produce the expected result'
);

close();

import('./persistent.js');
