import { Manager } from '@programming-gallery/crawler-core';
import { DcinsideWorker } from './dcinside-worker';


export async function main(){
  const {
    NORMAL_QUEUE_URL, 
    PRIORITY_QUEUE_URL,
    RESULT_QUEUE_URL,
    HISTORY_TABLE_NAME,
    AWS_CONFIG,
  } = process.env;
  if(NORMAL_QUEUE_URL === undefined || PRIORITY_QUEUE_URL === undefined || RESULT_QUEUE_URL === undefined || HISTORY_TABLE_NAME === undefined)
    throw Error("Environment variable NORMAL_QUEUE_URL, PRIORITY_QUEUE_URL, RESULT_QUEUE_URL, HISTORY_TABLE_NAME not set");
  let awsConfig = undefined;
  if(AWS_CONFIG !== undefined)
    awsConfig = JSON.parse(AWS_CONFIG);
  const worker = new Worker();
  const manager = new Manager(PRIORITY_QUEUE_URL, NORMAL_QUEUE_URL, RESULT_QUEUE_URL, HISTORY_TABLE_NAME, worker, { priorityWorkCount: 10, normalWorkCount: 1, awsConfig: awsConfig });
  await manager.manage();
}

if (typeof module !== 'undefined' && !module.parent) {
  main();
} else {
}
