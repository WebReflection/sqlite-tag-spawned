'use strict';
const {spawn} = require('child_process');

const plain = (m => /* c8 ignore start */ m.__esModule ? m.default : m /* c8 ignore stop */)(require('plain-tag'));
const {asStatic, asParams} = require('static-params');

const {parse} = JSON;
const {defineProperty} = Object;

const exec = (res, rej, type, bin, args) => {
  const out = [];

  const {stdout, stderr} = spawn(bin, args).on(
    'close',
    () => {
      if (errored) return;
      const result = out.join('').trim();
      if (type === 'query')
        res(result);
      else {
        const arr = parse(result);
        res(type === 'get' ? arr.shift() : arr);
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

const error = (rej, reason) => {
  const code = 'SQLITE_ERROR';
  const error = new Error(code + ': ' + reason);
  error.code = code;
  rej(error);
  return '';
};

const raw = (..._) => asStatic(plain(..._));

const sql = (rej, _) => {
  const [template, ...values] = asParams(..._);
  const sql = [template[0]];
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    switch (typeof value) {
      case 'string':
        sql.push("'" + value.replace(/'/g, "''") + "'");
        break;
      case 'number':
        if (!isFinite(value))
          return error(rej, 'invalid number ' + value);
      case 'boolean':
        sql.push(+value);
        break;
      case 'undefined':
      case 'object':
        if (!value) {
          sql.push('NULL');
          break;
        }
        else if (value instanceof Date) {
          sql.push("'" + value.toISOString() + "'");
          break;
        }
      default:
        return error(rej, 'incompatible value');
    }
    sql.push(template[i + 1]);
  }
  const query = sql.join('').trim();
  return query.length ? query : error(rej, 'empty query');
};

const sqlite = (type, bin, args) => (..._) =>
  new Promise((res, rej) => {
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
    exec(res, rej, type, bin, args.concat(query));
  });

function SQLiteTag(db, options = {}) {
  const bin = options.bin || 'sqlite3';

  const args = [db];
  if (options.readonly)
    args.push('-readonly');
  
  const json = args.concat('-json');

  return {
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
            exec(res, rej, 'query', bin, args.concat(multi.join(';')));
          });
        }}
      );
    },
    query: sqlite('query', bin, args),
    get: sqlite('get', bin, json),
    all: sqlite('all', bin, json),
    raw
  };
}
module.exports = SQLiteTag;
