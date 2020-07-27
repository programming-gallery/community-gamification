/*const {
  NORMAL_QUEUE_URL, 
  PRIORITY_QUEUE_URL,
  RESULT_QUEUE_URL,
} = process.env;
if(NORMAL_QUEUE_URL === undefined || PRIORITY_QUEUE_URL === undefined || RESULT_QUEUE_URL === undefined)
  throw Error("Environment variable NORMAL_QUEUE_URL, PRIORITY_QUEUE_URL, RESULT_QUEUE_URL not set");
  */

export * from './contract';
export * from './worker';
export * from './history';
export * from './manager';
