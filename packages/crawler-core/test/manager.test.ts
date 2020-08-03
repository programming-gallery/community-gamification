jest.setTimeout(1000*30);
process.env = { TABLE_NAME: 'test', AWS_REGION: 'ap-northeast-2' }
import Queue from 'sqsqs';
import { Contract, Manager, IWorker, IHistory, IHistoryConstructor, buildHistory } from '../src';

let priorityResult = [{
  id: 2,
  createdAt: 3600*1000,
}, {
  id: 1,
  createdAt: 0,
}];
let normalResult = [{
  id: 4,
  createdAt: 7200*1000,
}, {
  id: 3,
  createdAt: 0,
}];
class MockedWorker implements IWorker {
  async work(contract: Contract, history: IHistory): Promise<any> {
    if(contract.id === "1"){
      let res = priorityResult;
      history.update(
        res.length, 
        res[1].createdAt,
        res[0].createdAt,
        "" + res[0].id);
      return res;
    } else if(contract.id === "2"){
      let res = normalResult;
      history.update(
        res.length, 
        res[1].createdAt,
        res[0].createdAt,
        "" + res[0].id);
      return res;
    }
  }
}

describe('manager', () => {
  let awsConfig = {'endpoint': 'http://localhost:4566', 'region': 'ap-northeast-2'};
  let historyTableName = 'test-table';
  let History = buildHistory(historyTableName, {'endpoint': 'http://localhost:4566', 'region': 'ap-northeast-2'});
  let normalQueue: Queue;
  let priorityQueue: Queue;
  beforeEach(async () => {
    await History.createTable({readCapacityUnits: 5, writeCapacityUnits: 5});
    normalQueue = await Queue.createQueue('normalQueue', awsConfig, undefined, undefined, {WaitTimeSeconds: 1});
    priorityQueue = await Queue.createQueue('priorityQueue', awsConfig, undefined, undefined, {WaitTimeSeconds: 1});
    await normalQueue.send([JSON.stringify({id: "1", trackingKey: 1})]);
    await priorityQueue.send([JSON.stringify({id: "2", trackingKey: 2})]);
  });
  afterEach(async () => {
    await History.deleteTable();
    await normalQueue.deleteQueue();
    await priorityQueue.deleteQueue();
  });
  it('manage', async () => {
    let manager = new Manager(
      priorityQueue.option.QueueUrl, 
      normalQueue.option.QueueUrl, 
      historyTableName,
      new MockedWorker(), 
      { priorityWorkCount: 3, 
        normalWorkCount: 1,
        awsConfig });
    await manager.manage();
    let normalContract2 = JSON.parse((await normalQueue.receive(1))[0].Body!);
    expect(normalContract2.id).toEqual("2");
    expect(normalContract2.trackingKey).not.toEqual(2);
    let priorityContract2 = JSON.parse((await priorityQueue.receive(1))[0].Body!);
    expect(priorityContract2.id).toEqual("1");
    expect(priorityContract2.trackingKey).not.toEqual(1);
    let history1 = await History.getOrCreate("1");
    expect(history1.data).toEqual({"id": "1", "lastPostedDocumentId": "2", "lastPostedTimestamp": 3600000, "postingFrequencyEA": 2/3600, "trackingKey": priorityContract2.trackingKey});
    let history2 = await History.getOrCreate("2");
    expect(history2.data).toEqual({"id": "2", "lastPostedDocumentId": "4", "lastPostedTimestamp": 7200*1000, "postingFrequencyEA": 2/7200, "trackingKey": normalContract2.trackingKey});
  });
  it('duplicated message concurrency', async () => {
    await priorityQueue.send([JSON.stringify({id: "1", trackingKey: 1})]);
    await normalQueue.send([JSON.stringify({id: "2", trackingKey: 4})]);
    let manager1 = new Manager(priorityQueue.option.QueueUrl, normalQueue.option.QueueUrl, historyTableName, new MockedWorker(), { priorityWorkCount: 1, awsConfig });
    let manager2 = new Manager(priorityQueue.option.QueueUrl, normalQueue.option.QueueUrl, historyTableName, new MockedWorker(), { priorityWorkCount: 1, awsConfig });
    await Promise.all([manager1.manage(), manager2.manage()]);
    let res = await normalQueue.receive(2);
    expect(res.length).toEqual(1);
    let normalContract2 = JSON.parse(res[0].Body!);
    expect(normalContract2.id).toEqual("2");
    res = await priorityQueue.receive(2);
    expect(res.length).toEqual(1);
    let priorityContract2 = JSON.parse(res[0].Body!);
    expect(priorityContract2.id).toEqual("1");
    let history1 = await History.getOrCreate("1");
    expect(history1.data).toEqual({"id": "1", "lastPostedDocumentId": "2", "lastPostedTimestamp": 3600000, "postingFrequencyEA": 2/3600, "trackingKey": priorityContract2.trackingKey});
    let history2 = await History.getOrCreate("2");
    expect(history2.data).toEqual({"id": "2", "lastPostedDocumentId": "4", "lastPostedTimestamp": 7200*1000, "postingFrequencyEA": 2/7200, "trackingKey": normalContract2.trackingKey});
  });
  it('manage two cycle', async () => {
    let manager = new Manager(priorityQueue.option.QueueUrl, normalQueue.option.QueueUrl, historyTableName, new MockedWorker(), { priorityWorkCount: 1, awsConfig });
    await manager.manage();
    await manager.manage();
    let normalContract2 = JSON.parse((await normalQueue.receive(1))[0].Body!);
    expect(normalContract2.id).toEqual("2");
    expect(normalContract2.trackingKey).not.toEqual(2);
    let priorityContract2 = JSON.parse((await priorityQueue.receive(1))[0].Body!);
    expect(priorityContract2.id).toEqual("1");
    expect(priorityContract2.trackingKey).not.toEqual(1);
    let history1 = await History.getOrCreate("1");
    expect(history1.data).toEqual({"id": "1", "lastPostedDocumentId": "2", "lastPostedTimestamp": 3600000, "postingFrequencyEA": 2/3600 * 0.8, "trackingKey": priorityContract2.trackingKey});
    let history2 = await History.getOrCreate("2");
    expect(history2.data).toEqual({"id": "2", "lastPostedDocumentId": "4", "lastPostedTimestamp": 7200*1000, "postingFrequencyEA": 2/7200 * 0.8, "trackingKey": normalContract2.trackingKey});
  })
});
