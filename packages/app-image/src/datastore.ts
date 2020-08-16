import * as S3 from 'aws-sdk/clients/s3';

const bucketName = process.env.BUCKET_NAME;
const objectKeyPrefix = 'service-data/'

var s3 = new S3({apiVersion: '2006-03-01'});

export async function get(key: string){
  const data = await s3.getObject({
    Bucket: bucketName!,
    Key: objectKeyPrefix + key
  }).promise();
  if(data === undefined || data.Body === undefined)
    throw Error(`fail to get '${key}' in datastore`);
  return JSON.parse(data.Body!.toString('utf-8'));
}

