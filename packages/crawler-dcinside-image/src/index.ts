import { Manager } from '@programming-gallery/crawler-core';
import { DcinsideWorker } from './dcinside-worker';


/**
 * Required enviroment variables:
 * @param NORMAL_QUEUE_URL, 
 * @param PRIORITY_QUEUE_URL,
 * @param HISTORY_TABLE_NAME,
 * @param DELIVERY_STREAM_NAME - used by ./dcinside-worker.ts
 *
 * Optional enviroment variables:
 * @param AWS_CONFIG
 * @param RPS - request per seconds
 * @param RETRIES - max retries of failed requests
 */

export async function main(){
  const {
    NORMAL_QUEUE_URL, 
    PRIORITY_QUEUE_URL,
    HISTORY_TABLE_NAME,
    AWS_CONFIG,
    RPS,
    RETRIES,
  } = process.env;
  if(NORMAL_QUEUE_URL === undefined || PRIORITY_QUEUE_URL === undefined || HISTORY_TABLE_NAME === undefined)
    throw Error("Environment variable NORMAL_QUEUE_URL, PRIORITY_QUEUE_URL, RESULT_QUEUE_URL, HISTORY_TABLE_NAME not set");
  let awsConfig = undefined;
  if(AWS_CONFIG !== undefined)
    awsConfig = JSON.parse(AWS_CONFIG);
  let rps = parseInt(RPS || '');
  let retries = parseInt(RETRIES || '');
  const worker = new DcinsideWorker(isNaN(rps)? undefined: rps, isNaN(retries)? undefined: retries);
  const manager = new Manager(PRIORITY_QUEUE_URL, NORMAL_QUEUE_URL, HISTORY_TABLE_NAME, worker, { priorityWorkCount: 100, normalWorkCount: 1, awsConfig: awsConfig });
  await manager.manage();
  process.exit(1);
}

if (typeof module !== 'undefined' && !module.parent) {
  main();
} else {
}
