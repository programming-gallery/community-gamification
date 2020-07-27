import { Contract, Manager, IWorker, IHistory, IHistoryConstructor, buildHistory } from '@programming-gallery/crawler-core';
import { DcinsideWorker } from '../src/dcinside-worker';
import Queue from 'sqsqs';
import { main } from '../src';

describe('dcinside-crawler', () => {
  let awsConfig = {'endpoint': 'http://localhost:4566', 'region': 'ap-northeast-2'};
  let historyTableName = 'test-table';
  let History = buildHistory(historyTableName, awsConfig);
  let normalQueue: Queue;
  let priorityQueue: Queue;
  let resultQueue: Queue;
  beforeEach(async () => {
    await History.createTable({readCapacityUnits: 5, writeCapacityUnits: 5});
    normalQueue = await Queue.createQueue('normalQueue', awsConfig, undefined, undefined, {WaitTimeSeconds: 1});
    priorityQueue = await Queue.createQueue('priorityQueue', awsConfig, undefined, undefined, {WaitTimeSeconds: 1});
    resultQueue = await Queue.createQueue('resultQueue', awsConfig);
  });
  afterEach(async () => {
    await History.deleteTable();
    await normalQueue.deleteQueue();
    await priorityQueue.deleteQueue();
    await resultQueue.deleteQueue();
  });
  it('main', async () => {
    process.env = {
      NORMAL_QUEUE_URL: normalQueue.option.QueueUrl, 
      PRIORITY_QUEUE_URL: priorityQueue.option.QueueUrl,
      RESULT_QUEUE_URL: resultQueue.option.ResultUrl,
      HISTORY_TABLE_NAME: historyTableName,
      AWS_CONFIG: JSON.stringify(awsConfig),
    };
    await main();
    let res = await resultQueue.receive(200);
    console.log(res);
    expect(res.length).toEqual(100);
  });
});
