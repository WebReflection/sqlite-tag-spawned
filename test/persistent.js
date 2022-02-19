import SQLiteTag from '../esm/index.js';

const {all, get, query, close} = SQLiteTag('./test/sqlite.db', {persistent: true, timeout: 1000});

console.assert(void 0 === await get`SELECT * FROM lorem LIMIT ${0}`);

console.time('persistent get');
const row = await get`SELECT * FROM lorem`;
console.timeEnd('persistent get');

console.time('persistent all');
const rows = await all`SELECT * FROM lorem`;
console.timeEnd('persistent all');

console.assert('[{"1":1}]' === await query`SELECT 1`);

console.assert(JSON.stringify(rows[0]) === JSON.stringify(row));

try {
  await query`SHENANIGANS`;
  console.assert(!'nope');
}
catch (o_O) {
  console.assert(o_O instanceof Error);
}

close();
