import { bench, run } from "mitata";
import { createRequire } from "module";

// DB https://github.com/jpwhite3/northwind-SQLite3/blob/master/Northwind_large.sqlite.zip
const db = createRequire(import.meta.url)("better-sqlite3")(
  "/tmp/northwind.sqlite"
);

{
  // const sql = db.prepare(`SELECT * FROM "Order"`);

  bench('SELECT * FROM "Order" (objects)', async () => {
    await db.prepare(`SELECT * FROM "Order"`).all();
  });

  // bench('SELECT * FROM "Order" (nothing)', () => {
  //   sql.run();
  // });
}

{
  // const sql = db.prepare(`SELECT * FROM "Product"`);

  bench('SELECT * FROM "Product" (objects)', async () => {
    await db.prepare(`SELECT * FROM "Product"`).all();
  });

  // bench('SELECT * FROM "Product" (nothing)', () => {
  //   sql.run();
  // });
}

{
  // const sql = db.prepare(`SELECT * FROM "OrderDetail"`);

  bench('SELECT * FROM "OrderDetail" (objects)', async () => {
    await db.prepare(`SELECT * FROM "OrderDetail" LIMIT 10000`).all();
  });

  // bench('SELECT * FROM "OrderDetail" (nothing)', () => {
  //   sql.run();
  // });
}

run({ gc: true });
