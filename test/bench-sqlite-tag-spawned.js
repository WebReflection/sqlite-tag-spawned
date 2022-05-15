import { bench, run } from "mitata";
import SQLiteTagSpawned from '../esm/index.js';

// DB https://github.com/jpwhite3/northwind-SQLite3/blob/master/Northwind_large.sqlite.zip
const db = SQLiteTagSpawned('/tmp/northwind.sqlite', {
  persistent: true
});

/*
console.time('bootstrap');
await Promise.all([
  db.all`SELECT * FROM "OrderDetail"`,
  db.all`SELECT * FROM "OrderDetail"`
]).then(() => console.timeEnd('bootstrap'));
*/

bench('SELECT * FROM "Order" (objects)', async () => {
  await db.all`SELECT * FROM "Order"`;
});

bench('SELECT * FROM "Product" (objects)', async () => {
  await db.all`SELECT * FROM "Product"`;
});

bench('SELECT * FROM "OrderDetail" (objects)', async () => {
  await db.all`SELECT * FROM "OrderDetail" LIMIT 10000`;
});

run({ gc: true });
