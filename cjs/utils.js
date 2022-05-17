'use strict';
const plain = (m => /* c8 ignore start */ m.__esModule ? m.default : m /* c8 ignore stop */)(require('plain-tag'));
const {asStatic, asParams} = require('static-params/sql');

const error = (rej, reason) => {
  const code = 'SQLITE_ERROR';
  const error = new Error(code + ': ' + reason);
  error.code = code;
  rej(error);
  return '';
};
exports.error = error;

const raw = (..._) => asStatic(plain(..._));
exports.raw = raw;

const {from} = Array;
const quote = /'/g;
const hex = x => x.toString(16).padStart(2, '0');
const x = typed => `x'${from(typed, hex).join('')}'`;
const asValue = value => {
  switch (typeof value) {
    case 'string':
      return "'" + value.replace(quote, "''") + "'";
    case 'number':
      if (!isFinite(value))
        return;
    case 'boolean':
      return +value;
    case 'object':
    case 'undefined':
      switch (true) {
        case !value:
          return 'NULL';
        case value instanceof Date:
          return "'" + value.toISOString() + "'";
        case value instanceof Buffer:
        case value instanceof ArrayBuffer:
          value = new Uint8Array(value);
        case value instanceof Uint8Array:
        case value instanceof Uint8ClampedArray:
          return x(value);
      }
  }
};
exports.asValue = asValue;

const sql = (rej, _) => {
  const [template, ...values] = asParams(..._);
  const sql = [template[0]];
  for (let i = 0; i < values.length; i++) {
    const value = asValue(values[i]);
    if (value === void 0)
      return error(rej, 'incompatible ' + (typeof value) + 'value');
    sql.push(value, template[i + 1]);
  }
  const query = sql.join('').trim();
  return query.length ? query : error(rej, 'empty query');
};
exports.sql = sql;

const sql2array = sql => {
  const re = /(([:$@](\w+))|(\$\{\s*(\w+)\s*\}))/g;
  const out = [];
  let i = 0;
  let match;
  while (match = re.exec(sql)) {
    out.push(sql.slice(i, match.index), match[3] || match[5]);
    i = match.index + match[0].length;
  }
  out.push(sql.slice(i));
  return out;
};
exports.sql2array = sql2array;

// WARNING: this changes the incoming array value @ holes
//          useful only when sql2array results are stored,
//          and revived, as JSON ... watch out side effects
//          if used with same array more than once!
const array2sql = (chunks, data = null) => {
  for (let i = 1; i < chunks.length; i += 2) {
    const value = asValue(data[chunks[i]]);
    if (value === void 0)
      return '';
    chunks[i] = value;
  }
  return chunks.join('');
};
exports.array2sql = array2sql;
