import { buildHistory } from '../src/history';

const History = buildHistory('test', {'endpoint': 'http://localhost:4566', 'region': 'ap-northeast-2'});
//const History = buildHistory('test', {})// {'region': 'ap-northeast-2'});

describe('history', () => {
  beforeEach(async () => {
    await History.createTable({readCapacityUnits: 5, writeCapacityUnits: 5});
  });
  afterEach(async () => {
    await History.deleteTable();
  });
  it('history get or create', async () => {
    let history = await History.getOrCreate('1');
    expect(history.data).toEqual({
      id: '1'
    });
  });
  it('history update', async () => {
    let history = await History.getOrCreate('1');
    history.update(3600, 0, 3600*1000, '1');
    expect(history.data).toEqual({
      id: '1',
      postingFrequencyEA: 1,
      lastPostedTimestamp: 3600*1000,
      lastPostedDocumentId: '1'
    });
    history.update(1800, 4800*1000, 7200*1000, '2');
    expect(history.data).toEqual({
      id: '1',
      postingFrequencyEA: (1800 * 1000) / (3600*1000) * 0.2 + 1 * 0.8,
      lastPostedTimestamp: 7200*1000,
      lastPostedDocumentId: '2'
    });
  });
  it('history update one document', async () => {
    let history = await History.getOrCreate('1');
    history.update(1, 3600*1000, 3600*1000, '1');
    expect(history.data).toEqual({
      id: '1',
      postingFrequencyEA: 0,
      lastPostedTimestamp: 3600*1000,
      lastPostedDocumentId: '1'
    });
  });
  it('history update zero document', async () => {
    let history = await History.getOrCreate('1');
    history.update(0, 3600*1000, 7200*1000, '1');
    expect(history.data).toEqual({
      id: '1',
      postingFrequencyEA: 0,
      lastPostedTimestamp: 7200*1000,
      lastPostedDocumentId: '1'
    });
  });
  it('history new save', async () => {
    let history = await History.getOrCreate('1');
    let res = await history.save(2);
    expect(res).toEqual(true);
    expect(history.data).toEqual({
      id: '1', trackingKey: 2
    });
    let history2 = await History.getOrCreate('1');
    expect(history2.data).toEqual({
      id: '1', trackingKey: 2
    });
  });
  it('history override not conflict tracking key', async () => {
    let history = await History.getOrCreate('1');
    await history.save(2);
    let history2 = await History.getOrCreate('1');
    history2.update(1, 3600*1000, 3600*1000, '1');
    let res = await history2.save(3);
    expect(res).toEqual(true);
    let history3 = await History.getOrCreate('1');
    expect(history3.data).toEqual({
      id: '1',
      postingFrequencyEA: 0,
      lastPostedTimestamp: 3600*1000,
      lastPostedDocumentId: '1',
      trackingKey: 3
    });
  });
  it('history override conflict tracking key', async () => {
    let history = await History.getOrCreate('1');
    await history.save(2);
    let history2 = await History.getOrCreate('1');
    history2.update(1, 3600*1000, 3600*1000, '1');
    history2.data.trackingKey = 3;
    let res = await history2.save(4);
    expect(res).toEqual(false);
    let history3 = await History.getOrCreate('1');
    expect(history3.data).toEqual({
      id: '1', trackingKey: 2
    });
  })
  it('history initial priority check', async () => {
    let history = await History.getOrCreate('1');
    expect(history.isPriority()).toBe(true);
    history.update(1, 3600*1000, 3600*1000, '1');
  });
  it('history priority check', async () => {
    let history = await History.getOrCreate('1');
    history.update(1, 0*1000, 1800*1000, '1');
    expect(history.isPriority()).toBe(true);
    let history2 = await History.getOrCreate('2');
    history2.update(1, 0*1000, 4800*1000, '1');
    expect(history2.isPriority()).toBe(false);
  });
});
