import { IWorker, Contract, IHistory } from '@programming-gallery/crawler-core';
import DcinsideCrawler, { DocumentHeader } from 'dcinside-crawler';
export class DcinsideWorker implements IWorker {
  crawler = new DcinsideCrawler();
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
      lastDocumentId: history.data.lastPostedDocumentId !== null? parseInt(history.data.lastPostedDocumentId!): undefined,
    });
    if(documentHeaders.length === 0)
      return [];
    history.update(
      documentHeaders.length, 
      documentHeaders[documentHeaders.length-1].createdAt.getTime(),
      documentHeaders[0].createdAt.getTime(),
      "" + documentHeaders[0].id);
    return documentHeaders; 
  }
}
