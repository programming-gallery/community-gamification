process.env = {
  DOCUMENT_TABLE_NAME: 'document',
  AWS_CONFIG: '{"endpoint": "http://localhost:4566", "region": "ap-northeast-2"}',
  //AWS_CONFIG: '{"region": "ap-northeast-2"}',
}
import { Contract, Manager, IWorker, IHistory, IHistoryConstructor, buildHistory } from '@programming-gallery/crawler-core';
import { DcinsideWorker } from '../src/dcinside-worker';
import { dataMapper, Document } from '../src/model';
import Queue from 'sqsqs';
import { main } from '../src';
jest.setTimeout(600000);

describe('dcinside-worker', () => {
  let awsConfig = {'endpoint': 'http://localhost:4566', 'region': 'ap-northeast-2'};
  //let awsConfig = {'region': 'ap-northeast-2'};
  let historyTableName = 'test-table';
  let History = buildHistory(historyTableName, awsConfig);
  let normalQueue: Queue;
  let priorityQueue: Queue;
  let resultQueue: Queue;
  beforeEach(async () => {
    await History.createTable({readCapacityUnits: 5, writeCapacityUnits: 5});
    normalQueue = await Queue.createQueue('normalQueue', awsConfig, undefined, undefined, {WaitTimeSeconds: 1});
    priorityQueue = await Queue.createQueue('priorityQueue', awsConfig, undefined, undefined, {WaitTimeSeconds: 1});
    await dataMapper.createTable(Document, {readCapacityUnits: 10, writeCapacityUnits: 10});
  });
  afterEach(async () => {
    await History.deleteTable();
    await normalQueue.deleteQueue();
    await priorityQueue.deleteQueue();
    await dataMapper.deleteTable(Document);
  });
  it('main', async () => {
    process.env = {
      NORMAL_QUEUE_URL: normalQueue.option.QueueUrl, 
      PRIORITY_QUEUE_URL: priorityQueue.option.QueueUrl,
      HISTORY_TABLE_NAME: historyTableName,
      AWS_CONFIG: JSON.stringify(awsConfig),
    };
    priorityQueue.send([JSON.stringify({id: 'programming', trackingKey: 1 })]);
    normalQueue.send([JSON.stringify({id: 'programming', trackingKey: 1 })]);
    await main();
    let docs: Document[] = [];
    for await (const doc of dataMapper.scan(Document)) {
      docs.push(doc);
    }
    expect(docs.length).toEqual(1000);
    /*
    let res = await resultQueue.receive(200);
    expect(JSON.parse(res[0].Body || "[]").length).toEqual(100);
    */
  });
});