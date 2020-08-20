import { IWorker, Contract, IHistory } from '@programming-gallery/crawler-core';
import { Crawler, DocumentHeader, DocumentBody, Comment } from 'dcinside-crawler';
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

function adaptComments(comments: Comment[], customData?: any){
  let parsed = comments.map(com => ({
    galleryId: com.document.gallery.id,
    galleryIsMiner: com.document.gallery.isMiner,

    documentId: com.document.id,

    id: com.id,
    createdAt: com.createdAt,

    userNickname: com.author.nickname,
    userIp: com.author.ip,
    userId: com.author.id,

    contents: com.contents,
    voiceCopyId: com.voiceCopyId,
    dcconImageUrl: com.dccon?.imageUrl,
    dcconName: com.dccon?.name,
    dcconPackageId: com.dccon?.packageId,
    parentId: com.parent?.id,
  }));
  if(customData === undefined)
    return parsed;
  else if(customData.lastCommentId !== undefined)
    return parsed.filter(c => c.id > customData.lastCommentId)
  else
    return parsed;
}

function adaptDocument(head: DocumentHeader, body?: DocumentBody, customData?: any){
  if(customData === undefined)
    return {
      galleryId: head.gallery.id,
      galleryIsMiner: head.gallery.isMiner,

      id: head.id,
      title: head.title,
      commentCount: head.commentCount,
      likeCount: head.likeCount,
      hasImage: head.hasImage,
      hasVideo: head.hasVideo,
      createdAt: head.createdAt,

      userNickname: head.author.nickname,
      userIp: head.author.ip,
      userId: head.author.id,

      viewCount: head.viewCount,

      contents: body?.contents,
      dislikeCount: body?.dislikeCount,
      staticLikeCount: body?.staticLikeCount,
      /*
      comments: doc.comments?.map(com => ({
        id: com.id,
        userId: com.author.id,
        userIp: com.author.ip,
        userNickname: com.author.nickname,
        createdAt: com.createdAt,
        parentId: com.parent?.id,
      })),
      */
    };
  else 
    return {
      galleryId: head.gallery.id,

      id: head.id,
      commentCount: head.commentCount,
      likeCount: head.likeCount,

      viewCount: head.viewCount,
      /*
      comments: doc.comments.map(com => ({
        id: com.id,
        userId: com.author.id,
        userIp: com.author.ip,
        userNickname: com.author.nickname,
        createdAt: com.createdAt,
        parentId: com.parent?.id,
      })),
      */
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

function saveHistoryCustomData(history: IHistory, docs: DocumentHeader[]) {
  let maxCommentId = 0;
  let maxDocumentId = 0;
  for(let doc of docs){
    maxDocumentId = Math.max(maxDocumentId, doc.id);
  }
  history.update(docs.length, docs[docs.length-1].createdAt.getTime(), docs[0].createdAt.getTime(), '' + docs[0].id, 1.0, 
  JSON.stringify({
    documentIds: uint32ArrayToBase64(docs.map(d => d.id)),
    lastDocumentId: maxDocumentId || undefined,
    commentCounts: uint32ArrayToBase64(docs.map(d => d.commentCount)),
    viewCounts: uint32ArrayToBase64(docs.map(d => d.viewCount)),
    likeCounts: uint32ArrayToBase64(docs.map(d => d.likeCount)),
  }));
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
      DOCUMENT_DELIVERY_STREAM_NAME,
      COMMENT_DELIVERY_STREAM_NAME,
    } = process.env;
    if(DOCUMENT_DELIVERY_STREAM_NAME === undefined || COMMENT_DELIVERY_STREAM_NAME === undefined)
      throw Error("DOCUMENT_DELIVERY_STREAM_NAME, COMMENT_DELIVERY_STREAM_NAME env var not defined");
    const [ id, isMiner ] = contract.id.split('#');
    let coveringDocuments = 1000;
    const customDatas = loadHistoryCustomData(history);
    const lastDocumentId = customDatas[parseInt(Object.keys(customDatas)[0])]?.lastDocumentId;
    console.log(new Date(), 'crawling start:', id, isMiner, 'lastDocumentId:', lastDocumentId);
    const docs = await this.crawler.documentHeaders({
      gallery: {
        id,
        isMiner: isMiner && isMiner !== 'false'? true : false,
      },
      lastDocumentId: lastDocumentId != undefined && (lastDocumentId - coveringDocuments > 0? lastDocumentId - coveringDocuments: 1) || lastDocumentId,
      //limit: 100,
    });
    console.log(new Date(), 'crawled documents:', docs.length);
    let updatingDocuments: DocumentHeader[] = docs.filter(doc => {
      let customData = customDatas[doc.id];
      return customData === undefined || customData.commentCount !== doc.commentCount || (customData.viewCount || 0)*2 < doc.viewCount || customData.likeCount !== doc.likeCount;
    })
    let documentBody: {[id: string]: DocumentBody} = {};
    /*for(let doc of updatingDocuments) {
      let customData = customDatas[doc.id];
      if(customData === undefined)
        documentBody[doc.id] = await this.crawler.documentBody(doc);
    }*/

    let comments: any[] = [];
    /*for(let doc of updatingDocuments) {
      let customData = customDatas[doc.id];
      if(customData === undefined || customData.commentCount !== doc.commentCount)
        comments.push(...adaptComments(await this.crawler.comments(doc), customData));
    }*/

    await Promise.all(chunk(updatingDocuments, 500).map(docs => 
      firehose.putRecordBatch({
          DeliveryStreamName: DOCUMENT_DELIVERY_STREAM_NAME!,
          Records: docs.map(doc => ({
            Data: Buffer.from(JSON.stringify(adaptDocument(doc, documentBody[doc.id], customDatas[doc.id]))),
          })),
      }).promise()));
    await Promise.all(chunk(comments, 500).map(coms => 
      firehose.putRecordBatch({
          DeliveryStreamName: COMMENT_DELIVERY_STREAM_NAME!,
          Records: coms.map(com => ({
            Data: Buffer.from(JSON.stringify(com)),
          })),
      }).promise()));
    saveHistoryCustomData(history, docs);
    /*history.data.customData = JSON.stringify({
      documentIds: uint32ArrayToBase64(docs.map(d => d.id)),
      lastCommentId: docs.
      commentCounts: uint32ArrayToBase64(docs.map(d => d.commentCount)),
    });*/
    console.log(new Date(), 'updating documents:', updatingDocuments.length);
    //const res = Promise.all(chunk(updatingDocuments, 500).map(documents => 
  }
}
