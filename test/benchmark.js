import sqlite3 from 'sqlite3';
import betterSQLite3 from 'better-sqlite3';
import SQLiteTag from 'sqlite-tag';

import SQLiteTagSpawned from '../esm/index.js';

await bench('sqlite3 bindings', () => {
  const db = new sqlite3.Database('./test/bindings.db');
  return {db, ...SQLiteTag(db)};
});

await new Promise($ => setTimeout($, 500));

await bench('better-sqlite3 bindings', () => {
  const db = betterSQLite3('./test/better.db');
  return {db, ...SQLiteTag({
    run(sql, params, callback) {
      try {
        callback(void 0, db.prepare(sql).run(...params));
      }
      catch (error) {
        callback(error);
      }
    },
    get(sql, params, callback) {
      try {
        callback(void 0, db.prepare(sql).get(...params));
      }
      catch (error) {
        callback(error);
      }
    },
    all(sql, params, callback) {
      try {
        callback(void 0, db.prepare(sql).all(...params));
      }
      catch (error) {
        callback(error);
      }
    }
  })};
});

await new Promise($ => setTimeout($, 500));

await bench('sqlite3 spawned', () => {
  return {...SQLiteTagSpawned('./test/spawned.db')};
});

await new Promise($ => setTimeout($, 500));

await bench('sqlite3 spawned persistent', () => {
  const db = SQLiteTagSpawned('./test/spawned.db', {persistent: true});
  return {db, ...db};
});

async function bench(title, init) {
  const bindings = title !== 'sqlite3 spawned';
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
  let rows = await get`SELECT COUNT(info) AS rows FROM lorem`;
  if (bindings)
    rows = JSON.parse(JSON.stringify(rows));
  console.timeEnd('single select return');

  const list = ['Ipsum 2', 'Ipsum 3'];
  console.time('multiple select return');
  let multi = await all`SELECT * FROM lorem WHERE info IN (${list})`;
  if (bindings)
    multi = JSON.parse(JSON.stringify(multi));
  console.timeEnd('multiple select return');

  console.time('select 1K rows');
  let oneK = await all`SELECT * FROM lorem`;
  if (bindings)
    oneK = JSON.parse(JSON.stringify(oneK));
  console.timeEnd('select 1K rows');

  console.time('table removal');
  await query`DROP TABLE ${raw`lorem`}`;
  console.timeEnd('table removal');

  if (db) db.close();

  console.timeEnd('total');
  console.log(rows);
  console.log('');
}

