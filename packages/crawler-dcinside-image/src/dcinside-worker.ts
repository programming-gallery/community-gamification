import { IWorker, Contract, IHistory } from '@programming-gallery/crawler-core';
import DcinsideCrawler, { DocumentHeader } from 'dcinside-crawler';
import Firehose from 'aws-sdk/clients/firehose';
const firehose = new Firehose({apiVersion: '2015-08-04'});

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
    const res = Promise.all(chunk(documents, 500).map(documents => 
      firehose.putRecordBatch({
        DeliveryStreamName: DELIVERY_STREAM_NAME!,
        Records: documents.map(doc => ({
          Data: Buffer.from(JSON.stringify(doc)),
        })),
      }).promise()));
  }
}
