import Firehose from 'aws-sdk/clients/firehose';

function chunkByLength<T>(arr: T[], maxChunkLength: number): T[][] {
  var R: T[][] = [];
  for (var i=0,len=arr.length; i<len; i+=maxChunkLength)
    R.push(arr.slice(i,i+maxChunkLength));
  return R;
}

function chunkBySize<T>(arr: T[], maxChunkSize: number): T[][] {
  let R: T[][] = [];
  let r: T[] = [];
  let chunkSize = 0;
  for(let i=0, l=arr.length; i<l; ++i){
    let bytes = Buffer.byteLength(JSON.stringify(arr[i]));
    if(chunkSize + bytes > maxChunkSize){
      R.push(r);
      r = [];
      chunkSize = 0;
    }
    r.push(arr[i]);
    chunkSize += bytes;
  }
  R.push(r);
  return R;
}

export async function send<T>(deliveryStreamName: string, datas: T[]) {
  const firehose = new Firehose({apiVersion: '2015-08-04'});
  await Promise.all(chunkByLength(chunkBySize(datas, 512*1000), 7).map(chunks => 
    firehose.putRecordBatch({
      DeliveryStreamName: deliveryStreamName,
      Records: chunks.map(chunk => ({
        Data: Buffer.from(JSON.stringify(chunk) + '\n'),
      })),
    }).promise()
  ));
}

