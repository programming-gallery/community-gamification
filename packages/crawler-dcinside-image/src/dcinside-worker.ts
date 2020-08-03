import { IWorker, Contract, IHistory } from '@programming-gallery/crawler-core';
import DcinsideCrawler, { DocumentHeader } from 'dcinside-crawler';
import { Document, dataMapper, adapt } from './model';
export class DcinsideWorker implements IWorker {
  crawler: DcinsideCrawler;
  constructor(rps?: number, retries?: number) {
    this.crawler = new DcinsideCrawler(rps, retries);
  }
  /**
   * @param contract - the contract id has `galleryId#isMiner` form. 
   */
  async work(contract: Contract, history: IHistory): Promise<DocumentHeader[]> {
    const [ id, isMiner ] = contract.id.split('#');
    const documentHeaders = await this.crawler.documentHeaders({
      gallery: {
        id,
        isMiner: isMiner && isMiner !== 'false'? true : false,
      },
      lastDocumentId: history.data.lastPostedDocumentId !== undefined? parseInt(history.data.lastPostedDocumentId!): undefined,
      limit: 100,
    });
    //const Math.ceil(documentHeaders.length / 100) + 10
    if(documentHeaders.length === 0)
      return [];
    history.update(
      documentHeaders.length, 
      documentHeaders[documentHeaders.length-1].createdAt.getTime(),
      documentHeaders[0].createdAt.getTime(),
      "" + documentHeaders[0].id);
    const oldDocumentHeaders = await this.crawler.documentHeaders({
      gallery: {
        id,
        isMiner: isMiner && isMiner !== 'false'? true : false,
      },
      page: Math.ceil(documentHeaders.length/100),
      limit: 1000
    });
    //let lastDocumentId = documentHeaders[documentHeaders.length-1].id;
    //documentHeaders.push(...oldDocumentHeaders.slice(oldDocumentHeaders.findIndex(doc => doc.id < lastDocumentId)))
    //await Promise.all(documentHeaders.map(doc => limit(() => dataMapper.put(adapt(doc)))))
    for(let doc of documentHeaders){
      await dataMapper.put(adapt(doc));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    //await dataMapper.put(adapt(documentHeaders[0]));
    return documentHeaders; 
  }
}
