/**
 * Required enviroment variables:
 * @param CONTRACT_QUEUE_URL, 
 * @param CACHE_TABLE_NAME,
 *
 * Optional enviroment variables:
 * @param AWS_CONFIG,
 */
const Crawler = require('dcinside-crawler').default;
const crawler = new Crawler();
function chunk(arr, chunk_size) {
  var R = [];
  for (var i=0,len=arr.length; i<len; i+=chunk_size)
    R.push(arr.slice(i,i+chunk_size));
  return R;
}
const { CONTRACT_QUEUE_URL, CACHE_TABLE_NAME, AWS_CONFIG } = process.env;
if(CONTRACT_QUEUE_URL == undefined || CACHE_TABLE_NAME == undefined)
  throw Error(`'CONTRACT_QUEUE_URL' and 'CACHE_TABLE_NAME' environment variable not defined`);
const Queue = require('sqsqs').default;
const contactQueue = new Queue({
  QueueUrl: CONTRACT_QUEUE_URL,
}, AWS_CONFIG && JSON.parse(AWS_CONFIG));

const aws = require("aws-sdk");
const cacheTable = new aws.DynamoDB.DocumentClient(AWS_CONFIG && JSON.parse(AWS_CONFIG));
const CACHE_DURATION = 3600*24*3
async function cacheRead(keys){
  keys = keys.filter(k => k)
  return (await Promise.all(chunk(keys, 100).map(keys_chunk => cacheTable.batchGet({
    RequestItems: { 
      [CACHE_TABLE_NAME]: {
        Keys: keys_chunk.map(key => ({ key }))
      } 
    }
  }).promise())))
    .map(res => res.Responses[CACHE_TABLE_NAME])
    .flat()
    .map(item => JSON.parse(item.value))
}
async function cacheWrite(items){
  return (await Promise.all(chunk(Object.keys(items), 25).map(keys_chunk => cacheTable.batchWrite({
    RequestItems: { 
      [CACHE_TABLE_NAME]: keys_chunk.map(key => ({ 
        PutRequest: { Item: { 
          key: ""+key, 
          value: JSON.stringify(items[key]), 
          expireAt: Math.floor((new Date().getTime())/1000 + CACHE_DURATION * (Math.random() + 0.5)),
        }}
      }))
    } 
  }).promise())))
    .flat();
}

exports.handler = async (event, context) => {
  //await crawler.documentHeaders({ gallery: { id: 'programming', isMiner: false }});
  let galleries = await crawler.activeGalleryIndexes();
  let galleryCaches = (await cacheRead(galleries.map(gall => `dcinsideActiveGalleryCollection$#${gall.id}`)))
    .reduce((o, i) => (o[i.id] = Object.assign(i, {cacheHit: true}), o), {});
  const newGalleries = galleries.filter(gall => galleryCaches[""+gall.id] == null);
  await cacheWrite(newGalleries.reduce((o, gall) => (o[`dcinsideActiveGalleryCollection$#${gall.id}`] = gall, o), {}));
  await contactQueue.send(newGalleries.map(gall => JSON.stringify({
    id: gall.id + (gall.isMiner? '#isMiner' : ''),
    trackingKey: new Date().getTime() + Math.random(),
  })));
}
