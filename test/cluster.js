import cluster from 'cluster';
import {cpus} from 'os';
import process from 'process';

if (cluster.isPrimary) {
  for (let {length} = cpus(), i = 0; i < length; i++)
    cluster.fork();
}
else {
  globalThis.DO_NOT_DELETE_FROM = true;
  await import('./index.js');
  setTimeout(() => process.exit(0), 1000);
}
