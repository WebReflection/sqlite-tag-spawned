import sqlite3 from 'sqlite3';
import SQLiteTag from 'sqlite-tag';

import SQLiteTagSpawned from '../esm/index.js';

await bench('sqlite3 bindings', () => {
  const db = new sqlite3.Database('./test/bindings.db');
  return {db, ...SQLiteTag(db)};
});

await new Promise($ => setTimeout($, 500));

await bench('sqlite3 spawned', () => {
  return {...SQLiteTagSpawned('./test/spawned.db')};
});

async function bench(title, init) {
  console.log(`\x1b[1m${title}\x1b[0m`);
  console.time('total');

  console.time('initialization');
  const {db, all, get, query, raw, transaction} = init();
  console.timeEnd('initialization');

  console.time('table creation');
  await query`CREATE TABLE lorem (info TEXT)`;
  console.timeEnd('table creation');

  console.time('1K inserts (transaction)');
  // TODO: make this use best approach for sqlite3
  const insert = transaction();
  for (let i = 0; i < 1000; i++)
    insert`INSERT INTO lorem VALUES (${'Ipsum ' + i})`;
  await insert.commit();
  console.timeEnd('1K inserts (transaction)');

  console.time('single select return');
  const rows = await get`SELECT COUNT(info) AS rows FROM lorem`;
  console.timeEnd('single select return');

  const list = ['Ipsum 2', 'Ipsum 3'];
  console.time('multiple select return');
  await all`SELECT * FROM lorem WHERE info IN (${list})`;
  console.timeEnd('multiple select return');

  console.time('select 1K rows');
  await all`SELECT * FROM lorem`;
  console.timeEnd('select 1K rows');

  console.time('table removal');
  await query`DROP TABLE ${raw`lorem`}`;
  console.timeEnd('table removal');

  if (db) db.close();

  console.timeEnd('total');
  console.log(rows);
  console.log('');
}

