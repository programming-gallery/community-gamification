import { IWorker, Contract, IHistory } from '@programming-gallery/crawler-core';
import { Crawler, DocumentHeader, Comment } from 'dcinside-crawler';
const {
  AWS_CONFIG,
} = process.env;
import Firehose from 'aws-sdk/clients/firehose';
const firehose = new Firehose(Object.assign({apiVersion: '2015-08-04'}, AWS_CONFIG? JSON.parse(AWS_CONFIG): {}));

function chunk<T>(arr: T[], chunk_size: number): T[][] {
  var R = [];
  for (var i=0,len=arr.length; i<len; i+=chunk_size)
    R.push(arr.slice(i,i+chunk_size));
  return R;
}

function adapt(doc: DocumentHeader & { comments: Comment[] }, customData?: any){
  if(customData === undefined)
    return {
      galleryId: doc.gallery.id,
      galleryIsMiner: doc.gallery.isMiner,

      id: doc.id,
      title: doc.title,
      commentCount: doc.commentCount,
      likeCount: doc.likeCount,
      hasImage: doc.hasImage,
      hasVideo: doc.hasVideo,
      createdAt: doc.createdAt,

      userNickname: doc.author.nickname,
      userIp: doc.author.ip,
      userId: doc.author.id,

      viewCount: doc.viewCount,
      comments: doc.comments.map(com => ({
        id: com.id,
        userId: com.author.id,
        userIp: com.author.ip,
        userNickname: com.author.nickname,
        createdAt: com.createdAt,
        parentId: com.parent?.id,
      })),
    };
  else
    return {
      galleryId: doc.gallery.id,

      id: doc.id,
      commentCount: doc.commentCount,
      likeCount: doc.likeCount,

      viewCount: doc.viewCount,
      comments: doc.comments.map(com => ({
        id: com.id,
        userId: com.author.id,
        userIp: com.author.ip,
        userNickname: com.author.nickname,
        createdAt: com.createdAt,
        parentId: com.parent?.id,
      })),
    }
}

function uint32ArrayToBase64(array: number[]) { 
  return Buffer.from(new Uint32Array(array).buffer).toString('base64');
}
function base64ToUint32Array(base64: string) {
  return new Uint32Array(new Uint8Array(Buffer.from(base64, 'base64')).buffer);
}
/*
function uint32ArrayToBase64(array: number[]) { 
  return Buffer.from(new Uint32Array(array).buffer).toString('base64');
}
function base64ToUint32Array(base64: string) {
  return new Uint32Array(new Uint8Array(Buffer.from(base64, 'base64')).buffer);
}
*/

function saveHistoryCustomData(history: IHistory, docs: (DocumentHeader & { comments: Comment[] })[]) {
  let maxCommentId = 0;
  let maxDocumentId = 0;
  for(let doc of docs){
    for(let comm of doc.comments)
      maxCommentId = Math.max(maxCommentId, comm.id);
    maxDocumentId = Math.max(maxDocumentId, doc.id);
  }
  history.data.customData = JSON.stringify({
    documentIds: uint32ArrayToBase64(docs.map(d => d.id)),
    lastCommentId: maxCommentId || undefined,
    lastDocumentId: maxDocumentId || undefined,
    commentCounts: uint32ArrayToBase64(docs.map(d => d.commentCount)),
    viewCounts: uint32ArrayToBase64(docs.map(d => d.viewCount)),
    likeCounts: uint32ArrayToBase64(docs.map(d => d.likeCount)),
  });
}
interface ICustomData { 
  [key: number]: { 
    commentCount?: number,
    likeCount?: number,
    viewCount?: number,
    lastCommentId?: number,
    lastDocumentId?: number,
  }
}
function loadHistoryCustomData(history: IHistory): ICustomData {
  let lastHistoryCustomData = history.customData();
  let documentIdToCustomData: ICustomData = {};
  if(lastHistoryCustomData){
    let parsed = JSON.parse(lastHistoryCustomData)
    let documentIds = parsed.documentIds? base64ToUint32Array(parsed.documentIds): []; 
    let commentCounts = parsed.commentCounts? base64ToUint32Array(parsed.commentCounts): []; 
    let likeCounts = parsed.likeCounts? base64ToUint32Array(parsed.likeCounts) : []; 
    let viewCounts = parsed.viewCounts? base64ToUint32Array(parsed.viewCounts) : []; 
    let lastCommentId = parsed.lastCommentId;
    let lastDocumentId = parsed.lastDocumentId;
    for(let i=0, l=documentIds.length; i<l; ++i){
      documentIdToCustomData[documentIds[i]] = {
        commentCount: commentCounts[i],
        likeCount: likeCounts[i],
        viewCount: viewCounts[i],
        lastCommentId,
        lastDocumentId,
      };
    }
  }
  return documentIdToCustomData;
}

export class DcinsideWorker implements IWorker {
  crawler: Crawler;
  constructor(rps?: number, retries?: number) {
    this.crawler = new Crawler(rps, retries);
  }
  /**
   * @param contract - the contract id has `galleryId#isMiner` form. 
   */
  async work(contract: Contract, history: IHistory): Promise<void> {
    const {
      DELIVERY_STREAM_NAME,
    } = process.env;
    const [ id, isMiner ] = contract.id.split('#');
    let coveringDocuments = 1000;
    const customDatas = loadHistoryCustomData(history);
    const lastDocumentId = customDatas[parseInt(Object.keys(customDatas)[0])]?.lastDocumentId;
    console.log(new Date(), 'crawling start:', id, 'lastDocumentId:', lastDocumentId);
    const iter = await this.crawler.documentHeaderWithCommentAsyncIterator({
      gallery: {
        id,
        isMiner: isMiner && isMiner !== 'false'? true : false,
      },
      lastDocumentId: lastDocumentId !== undefined && lastDocumentId - coveringDocuments > 0? lastDocumentId - coveringDocuments: undefined,
      //limit: 100,
    });
    let docs = [];
    let updatingDocumentCount = 0;
    for await (const doc of iter) {
      //const updatingDocument = documents.filter(doc => documentIdToCommentCounts[doc.id] === undefined || documentIdToCommentCounts[doc.id] !== doc.commentCount);
      docs.push(doc)
      if(updatingDocumentCount % 10 === 0)
        console.log('updating:', id, isMiner, doc.id, updatingDocumentCount);
      let customData = customDatas[doc.id];
      if(customData === undefined || 
        customData.commentCount !== doc.commentCount ||
        (customData.viewCount || 0)*2 < doc.viewCount ||
        customData.likeCount !== doc.likeCount){
        if(customData && customData.lastCommentId)
          doc.comments = doc.comments.filter(com => com.id > (customData.lastCommentId || 0));
        await firehose.putRecord({
          DeliveryStreamName: DELIVERY_STREAM_NAME!,
          Record: {
            Data: Buffer.from(JSON.stringify(adapt(doc, customData))),
          },
        }).promise();
        updatingDocumentCount += 1;
      }
    }
    saveHistoryCustomData(history, docs);
    /*history.data.customData = JSON.stringify({
      documentIds: uint32ArrayToBase64(docs.map(d => d.id)),
      lastCommentId: docs.
      commentCounts: uint32ArrayToBase64(docs.map(d => d.commentCount)),
    });*/
    console.log(new Date(), 'crawled documents:', docs.length);
    console.log(new Date(), 'updating documents:', updatingDocumentCount);
    //const res = Promise.all(chunk(updatingDocuments, 500).map(documents => 
  }
}
