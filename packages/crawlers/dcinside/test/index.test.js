jest.setTimeout(30000);
const AWS = require('aws-sdk');
AWS.config.endpoint = 'localhost:8000'
AWS.config.region = 'local-env';
AWS.config.sslEnabled = false;

process.env.RECIPE_TABLE = 'table';
process.env.DELIVERY_STREAM_NAME = 'firehose';

const Firehose = require('aws-sdk/clients/firehose');

jest.mock('aws-sdk/clients/firehose', () => {
  const mPutRecordBatch = jest.fn(() => ({ promise: () => Promise.resolve('ok') }));
  /*const mFirehoseInstance = {
    putRecordBatch: 
  }*/
  const mFirehose = jest.fn();
  mFirehose.prototype.putRecordBatch = mPutRecordBatch;
  return mFirehose;
});

describe('', ()=>{
  afterEach(() => AWS.clearAllMocks());

  it('main', async () => {
    process.env.RECIPE_TABLE = 'table'
    process.env.COVERING_DOCUMENTS=100;
    process.env.LIMIT=100;
    process.env.RPS=10;
    process.env.RETRIES=3;

    const { main, recipeStore } = require('../build/src/index.js');
    await recipeStore.put({ 
      galleryId: 'baseball_new9', 
      galleryIsMiner: false, 
      version: 1,
    }).exec();
    await main('baseball_new9');
    let putRecordBatchMock = Firehose.prototype.putRecordBatch.mock;
    expect(putRecordBatchMock.calls.length).toBe(1);
    expect(putRecordBatchMock.calls[0][0].DeliveryStreamName).toBe('firehose');
    let recipe = await recipeStore.get('baseball_new9', 1).exec();
    expect(putRecordBatchMock.calls[0][0].Records.length).toBe(1)
    let lastRecords = JSON.parse(putRecordBatchMock.calls[0][0].Records[0].Data.toString());
    await main('baseball_new9');
    expect(putRecordBatchMock.calls.length).toBe(2);
    let nextRecords = JSON.parse(putRecordBatchMock.calls[1][0].Records[0].Data.toString());
    expect(lastRecords.length).toBeGreaterThanOrEqual(nextRecords.length);
    //lastRecords
    console.log('lastRecordLength', lastRecords.length, 'nextRecordLength', nextRecords.length);
    console.log(`last: ${Math.min(...lastRecords.map(rec => rec.id))} ~ ${Math.max(...lastRecords.map(rec => rec.id))}`); 
    console.log(`next: ${Math.min(...nextRecords.map(rec => rec.id))} ~ ${Math.max(...nextRecords.map(rec => rec.id))}`); 
    /*for(let record of putRecordBatchMock.calls[0][0].Records) {
      let rows = JSON.parse(record.Data.toString());
      for(let row of rows){
        expect(row).toMatch({
          'a': 'b'
        });
      }
    }*/
    /*await recipeStore.get({
  });*/
  });
})
