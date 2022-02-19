'use strict';
const {spawn} = require('child_process');
const {randomUUID} = require('crypto');
const {tmpdir} = require('os');
const {join} = require('path');

const {error, raw, sql} = require('./utils.js');

const UNIQUE_ID = randomUUID();
const UNIQUE_ID_LINE = `[{"_":"${UNIQUE_ID}"}]\n`;
const UNIQUE_ID_REGEXP = new RegExp(
  '^' + UNIQUE_ID_LINE.replace(/[{}[\]]/g, '\\$&')
);

const {isArray} = Array;
const {parse} = JSON;
const {defineProperty} = Object;

const noop = () => {};

const defaultExec = (res, rej, type, bin, args, opts) => {
  const out = [];

  const {stdout, stderr} = spawn(bin, args, opts).on(
    'close',
    code => {
      if (errored || code !== 0) {
        if (code !== 0)
          error(rej, 'busy DB or query too slow');
        return;
      }

      const result = out.join('').trim();
      if (type === 'query')
        res(result);
      else {
        const json = parse(result || '[]');
        res(type === 'get' && isArray(json) ? json.shift() : json);
      }
    }
  );

  stdout.on('data', data => { out.push(data); });

  let errored = false;
  stderr.on('data', data => {
    errored = true;
    error(rej, ''.trim.call(data));
  });
};

const interactiveExec = (bin, db, timeout) => {
  const {stdin, stdout, stderr} = spawn(bin, [db]);
  stdin.write('.mode json\n');
  if (timeout)
    stdin.write(`.timeout ${timeout}\n`);
  let next = Promise.resolve();
  return (res, rej, type, _, args) => {
    if (type === 'close') {
      stdin.write('.quit\n');
      next = null;
    }
    else if (next) {
      next = next.then(
        () => new Promise(done => {
          let out = '';
          let error = false;
          const $ = data => {
            out += data;
            let process = false;
            while (out.endsWith(UNIQUE_ID_LINE)) {
              process = true;
              out = out.slice(0, -UNIQUE_ID_LINE.length);
            }
            if (process) {
              while (out.startsWith(UNIQUE_ID_LINE))
                out = out.slice(UNIQUE_ID_LINE.length);
              dropListeners();
              if (type === 'query')
                res(out);
              else {
                const json = parse(out || '[]');
                res(type === 'get' ? json.shift() : json);
              }
              done();
            }
          };
          const _ = data => {
            error = true;
            dropListeners();
            rej(new Error(data));
            done();
          };
          const dropListeners = () => {
            stdout.removeListener('data', $);
            stderr.removeListener('data', _);
          };
          stdout.on('data', $);
          stderr.on('data', _);
          stdin.write(`${args[args.length - 1]};\n`);
          stdin.write(`SELECT '${UNIQUE_ID}' as _;\n`);
        })
      );
    }
  };
};

/**
 * Returns a template literal tag function usable to await `get`, `all`, or
 * `query` SQL statements. The tag will return a Promise with results.
 * In case of `all`, an Array is always resolved, if no error occurs, while with
 * `get` the result or undefined is returned instead. The `query` returns whatever
 * output the spawned command produced.
 * @param {string} type the query type
 * @param {string} bin the sqlite3 executable
 * @param {function} exec the logic to spawn and parse the output
 * @param {string[]} args spawned arguments for sqlite3
 * @param {object} opts spawned options
 * @returns {function}
 */
const sqlite = (type, bin, exec, args, opts) => (..._) => new Promise((res, rej) => {
  let query = sql(rej, _);
  if (!query.length)
    return;
  if (
    type === 'get' &&
    /^SELECT\s+/i.test(query) &&
    !/\s+LIMIT\s+\d+$/i.test(query)
  ) {
    query += ' LIMIT 1';
  }
  exec(res, rej, type, bin, args.concat(query), opts);
});

let memory = '';

/**
 * @typedef {object} SQLiteOptions optional options
 * @property {boolean?} readonly opens the database in readonly mode
 * @property {string?} bin the sqlite3 executable path
 * @property {number?} timeout optional db/spawn timeout in milliseconds
 * @property {boolean} [persistent=false] optional flag to keep the db persistent
 * @property {function} [exec=defaultExec] the logic to spawn and parse the output
 */

/**
 * Returns `all`, `get`, `query`, and `raw` template literal tag utilities,
 * plus a `transaction` one that, once invoked, returns also a template literal
 * tag utility with a special `.commit()` method, to execute all queries used
 * within such returned tag function.
 * @param {string} db the database file to create or `:memory:` for a temp file
 * @param {SQLiteOptions?} options optional extra options
 * @returns 
 */
function SQLiteTag(db, options = {}) {
  if (db === ':memory:')
    db = memory || (memory = join(tmpdir(), randomUUID()));

  const timeout = options.timeout || 0;
  const bin = options.bin || 'sqlite3';

  const args = [db, '-bail'];
  const opts = {timeout};

  if (options.readonly)
    args.push('-readonly');

  if (timeout)
    args.push('-cmd', '.timeout ' + timeout);

  const json = args.concat('-json');
  const exec = options.exec || (
                options.persistent ?
                  interactiveExec(bin, db, timeout) :
                  defaultExec
              );

  return {
    /**
     * Returns a template literal tag function where all queries part of the
     * transactions should be written, and awaited through `tag.commit()`.
     * @returns {function}
     */
    transaction() {
      const params = [];
      return defineProperty(
        (..._) => { params.push(_); },
        'commit',
        {value() {
          return new Promise((res, rej) => {
            const multi = ['BEGIN TRANSACTION'];
            for (const _ of params) {
              const query = sql(rej, _);
              if (!query.length)
                return;
              multi.push(query);
            }
            multi.push('COMMIT');
            exec(res, rej, 'query', bin, args.concat(multi.join(';')), opts);
          });
        }}
      );
    },
    query: sqlite('query', bin, exec, args, opts),
    get: sqlite('get', bin, exec, json, opts),
    all: sqlite('all', bin, exec, json, opts),
    close: options.persistent ? (() => exec(null, null, 'close')) : noop,
    raw
  };
}
module.exports = SQLiteTag;
