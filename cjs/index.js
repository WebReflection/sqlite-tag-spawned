'use strict';
const {spawn} = require('child_process');
const {randomUUID} = require('crypto');
const {tmpdir} = require('os');
const {join} = require('path');

const {error, raw, sql} = require('./utils.js');

const {isArray} = Array;
const {parse} = JSON;
const {defineProperty} = Object;

const exec = (res, rej, type, bin, args, opts) => {
  const out = [];

  const {stdout, stderr} = spawn(bin, args, opts).on(
    'close',
    () => {
      if (errored)
        return;
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

/**
 * Returns a template literal tag function usable to await `get`, `all`, or
 * `query` SQL statements. The tag will return a Promise with results.
 * In case of `all`, an Array is always resolved, if no error occurs, while with
 * `get` the result or undefined is returned instead. The `query` returns whatever
 * output the spawned command produced.
 * @param {string} type the query type
 * @param {string} bin the sqlite3 executable
 * @param {string[]} args spawned arguments for sqlite3
 * @param {object} opts spawned options
 * @returns {function}
 */
const sqlite = (type, bin, args, opts) => (..._) => new Promise((res, rej) => {
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

/**
 * @typedef {object} SQLiteOptions optional options
 * @property {boolean?} readonly opens the database in readonly mode
 * @property {string?} bin the sqlite3 executable path
 * @property {number?} timeout optional spawn timeout in milliseconds
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
    db = join(tmpdir(), randomUUID());

  const bin = options.bin || 'sqlite3';
  const args = [db, '-bail'];
  if (options.readonly)
    args.push('-readonly');
  
  const json = args.concat('-json');
  const opts = {};
  if (options.timeout)
    opts.timeout = options.timeout;

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
    query: sqlite('query', bin, args, opts),
    get: sqlite('get', bin, json, opts),
    all: sqlite('all', bin, json, opts),
    raw
  };
}
module.exports = SQLiteTag;
