import SQLiteTag from '../esm/index.js';

const {all, get, query, raw} = SQLiteTag('./test/sqlite.db');

(async () => {
  console.time('sqlite-tag-spawned');

  console.log('✔', 'table creation');
  await query`CREATE TABLE IF NOT EXISTS ${raw`lorem`} (info TEXT)`;
  await query`DELETE FROM lorem`;

  console.log('✔', 'multiple inserts (no statement)');
  for (let i = 0; i < 9; i++)
    await query`INSERT INTO lorem VALUES (${'Ipsum ' + i})`;

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
  const rows = await all`SELECT rowid AS id, info FROM ${raw`${TABLE}`}`;
  for (let row of rows)
    console.log(' ', row.id + ": " + row.info);


  const utf8 = '¥ · £ · € · $ · ¢ · ₡ · ₢ · ₣ · ₤ · ₥ · ₦ · ₧ · ₨ · ₩ · ₪ · ₫ · ₭ · ₮ · ₯ · ₹';
  console.log('✔', 'Safe utf8');
  await query`INSERT INTO lorem VALUES (${utf8})`;
  console.assert((await get`SELECT info FROM lorem WHERE info = ${utf8}`).info === utf8);


  console.log('✔', 'Error handling');
  try {
    await query`INSERT INTO shenanigans VALUES (1, 2, 3)`;
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

  const {query: ro} = SQLiteTag('./test/sqlite.db', {readonly: true});
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
})();
