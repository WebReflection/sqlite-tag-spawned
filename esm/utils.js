import plain from 'plain-tag';
import {asStatic, asParams} from 'static-params/sql';

export const error = (rej, reason) => {
  const code = 'SQLITE_ERROR';
  const error = new Error(code + ': ' + reason);
  error.code = code;
  rej(error);
  return '';
};

export const raw = (..._) => asStatic(plain(..._));

const quote = /'/g;

export const asValue = value => {
  switch (typeof value) {
    case 'string':
      return "'" + value.replace(quote, "''") + "'";
    case 'number':
      if (!isFinite(value))
        return;
    case 'boolean':
      return +value;
    case 'undefined':
    case 'object':
      if (!value)
        return 'NULL';
      else if (value instanceof Date)
        return "'" + value.toISOString() + "'";
  }
};

export const sql = (rej, _) => {
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
