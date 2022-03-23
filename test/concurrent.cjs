const SQLiteTag = require('../cjs/index.js');

const {get, query, close} = SQLiteTag(
  __dirname + '/counter.db',
  {persistent: true, timeout: 1000}
);

(async () => {
  await query`CREATE TABLE IF NOT EXISTS counter (total INTEGER)`;
  if ((await get`SELECT total FROM counter`) === void 0) {
    await query`PRAGMA journal_mode=WAL`;
    await query`INSERT INTO counter VALUES (0)`;
  }
})();

require('http').createServer(
  async (_, res) => {
    await query`UPDATE counter SET total = total + 1`;
    res.writeHead(200, {'content-type': 'application/json'});
    res.end(JSON.stringify(await get`SELECT total FROM counter`) + '\n');
  }
).listen(8080);

console.log('http://localhost:8080/');

process
  .on('exit', () => {
    close();
    console.log('bye bye');
  })
  .on("SIGTERM", () => {
    close();
    process.exit(0);
  })
  .on("SIGINT", () => {
    close();
    process.exit(0);
  })
  .on("uncaughtException", () => {
    close();
    process.exit(1);
  })
;
