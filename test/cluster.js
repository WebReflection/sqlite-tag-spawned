import cluster from 'cluster';
import {cpus} from 'os';
import process from 'process';
import SQLiteTag from '../esm/index.js';

if (cluster.isPrimary) {
  for (let {length} = cpus(), i = 0; i < length; i++)
    cluster.fork();
}
else {
  await import('./index.js');
  setTimeout(() => process.exit(0), 1000);
}
