import { IWorker, Contract, IHistory } from '@programming-gallery/crawler-core';
import DcinsideCrawler, { DocumentHeader } from 'dcinside-crawler';
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

function adapt(doc: DocumentHeader){
  return Object.assign(doc, {
    galleryId: doc.gallery.id,
    galleryIsMiner: doc.gallery.isMiner,
    userId: doc.author.id,
    userNickname: doc.author.nickname,
    userIp: doc.author.ip,
  });
}

function uint32ArrayToBase64(array: number[]) { 
  return Buffer.from(new Uint32Array(array).buffer).toString('base64');
}
function base64ToUint32Array(base64: string) {
  return new Uint32Array(new Uint8Array(Buffer.from(base64, 'base64')).buffer);
}

export class DcinsideWorker implements IWorker {
  crawler: DcinsideCrawler;
  constructor(rps?: number, retries?: number) {
    this.crawler = new DcinsideCrawler(rps, retries);
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
    const documents = await this.crawler.documentHeaders({
      gallery: {
        id,
        isMiner: isMiner && isMiner !== 'false'? true : false,
      },
      lastDocumentId: history.data.lastPostedDocumentId !== undefined? parseInt(history.data.lastPostedDocumentId!) - coveringDocuments: undefined,
      //limit: 100,
    });
    let lastHistoryCustomData = history.customData();
    let documentIdToCommentCounts: { [key: number]: number } = {};
    if(lastHistoryCustomData){
      let parsed = JSON.parse(lastHistoryCustomData)
      let documentIds = base64ToUint32Array(parsed.documentIds); 
      let commentCounts = base64ToUint32Array(parsed.commentCounts); 
      for(let i=0, l=documentIds.length; i<l; ++i)
        documentIdToCommentCounts[documentIds[i]] = commentCounts[i];
    }
    history.data.customData = JSON.stringify({
      documentIds: uint32ArrayToBase64(documents.map(d => d.id)),
      commentCounts: uint32ArrayToBase64(documents.map(d => d.commentCount)),
    });
    const updatingDocuments = documents.filter(doc => documentIdToCommentCounts[doc.id] === undefined || documentIdToCommentCounts[doc.id] !== doc.commentCount);
    console.log(new Date(), 'updating documents:', updatingDocuments.length);
    const res = Promise.all(chunk(updatingDocuments, 500).map(documents => 
      firehose.putRecordBatch({
        DeliveryStreamName: DELIVERY_STREAM_NAME!,
        Records: updatingDocuments.map(doc => ({
          Data: Buffer.from(JSON.stringify(adapt(doc))),
        })),
      }).promise()));
  }
}
