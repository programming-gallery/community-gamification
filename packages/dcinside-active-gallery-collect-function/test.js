const aws = require('aws-sdk');
const Queue = require('sqsqs').default;
process.env = {
  DOCUMENT_TABLE_NAME: 'document',
  AWS_CONFIG: '{"endpoint": "http://localhost:4566", "region": "ap-northeast-2"}',
//  AWS_CONFIG: '{"region": "ap-northeast-2"}',
}
const dynamodb = new aws.DynamoDB(JSON.parse(process.env.AWS_CONFIG));
jest.setTimeout(600000);

describe('dcinside-worker', () => {
  let awsConfig = {'endpoint': 'http://localhost:4566', 'region': 'ap-northeast-2'};
  //let awsConfig = {'region': 'ap-northeast-2'};
  let cacheTableName = 'test-table2';
  let cacheTableSchema = {
    AttributeDefinitions: [
      {
        AttributeName: "key", 
        AttributeType: "S"
      }, 
    ],
    KeySchema: [
      {
        AttributeName: "key", 
        KeyType: "HASH"
      }, 
    ], 
    /*ProvisionedThroughput: {
      ReadCapacityUnits: 5, 
      WriteCapacityUnits: 5
    },*/ 
    BillingMode: "PAY_PER_REQUEST",
    TableName: cacheTableName,
  };
  let contractQueue;
  beforeEach(async () => {
    contractQueue = await Queue.createQueue('test-contractQueue', awsConfig, undefined, undefined, {WaitTimeSeconds: 1});
    await dynamodb.createTable(cacheTableSchema).promise();
  });
  afterEach(async () => {
    await contractQueue.deleteQueue();
    await dynamodb.deleteTable({ TableName: cacheTableName }).promise();
  });
  it('main', async () => {
    process.env = {
      CONTRACT_QUEUE_URL: contractQueue.option.QueueUrl, 
      CACHE_TABLE_NAME: cacheTableName,
      AWS_CONFIG: JSON.stringify(awsConfig),
    };
    await require('./index').handler();
    /*
    let docs: Document[] = [];
    for await (const doc of dataMapper.scan(Document)) {
      docs.push(doc);
    }
    expect(docs.length).toEqual(1000);
    */
    let res = await contractQueue.receive(200);
    expect(res.length).toEqual(100);
    await require('./index').handler();
    res = await contractQueue.receive(200);
    //console.log(res);
    expect(res.length).toEqual(0);
  });
});