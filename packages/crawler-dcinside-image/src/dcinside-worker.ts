import { IWorker, Contract, IHistory } from '@programming-gallery/crawler-core';
import DcinsideCrawler, { DocumentHeader } from 'dcinside-crawler';
import { Document, dataMapper, adapt, adaptKey } from './model';
export class DcinsideWorker implements IWorker {
  crawler: DcinsideCrawler;
  constructor(rps?: number, retries?: number) {
    this.crawler = new DcinsideCrawler(rps, retries);
  }
  /**
   * @param contract - the contract id has `galleryId#isMiner` form. 
   */
  async work(contract: Contract, history: IHistory): Promise<void> {
    let lastDocumentId = await this.insertDocuments(contract, history);
    if(lastDocumentId === null)
      return;
    else
      await this.updateDocuments(contract, history, lastDocumentId);
  }
  async updateDocuments(contract: Contract, history: IHistory, lastDocumentId: number) {
    for(let page=1; page<100; ++page){
      const [ id, isMiner ] = contract.id.split('#');
      const documentHeaders = await this.crawler.documentHeaders({
        gallery: {
          id,
          isMiner: isMiner && isMiner !== 'false'? true : false,
        },
        page: page,
      });
      let shouldBreak = true;
      for(let newDoc of documentHeaders.filter(doc => doc.id <= lastDocumentId)){
        let oldDoc: Document | null = null;
        try{
          oldDoc = await dataMapper.get(adaptKey(newDoc));
        } catch (e) {
          if(e.name === 'ItemNotFoundException')
            break;
          else
            throw e;
        }
        if(oldDoc === null || 
            oldDoc.title !== newDoc.title || 
            oldDoc.commentCount !== newDoc.commentCount ||
            oldDoc.likeCount !== newDoc.likeCount) {
          shouldBreak = false;
          await dataMapper.put(adapt(newDoc));
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if(shouldBreak)
        break;
    }
  }
  async insertDocuments(contract: Contract, history: IHistory): Promise<number | null> {
    const [ id, isMiner ] = contract.id.split('#');
    const documentHeaders = await this.crawler.documentHeaders({
      gallery: {
        id,
        isMiner: isMiner && isMiner !== 'false'? true : false,
      },
      //lastDocumentId: history.data.lastPostedDocumentId !== undefined? parseInt(history.data.lastPostedDocumentId!): undefined,
      limit: 100,
    });
    const newDocumentHeaders = documentHeaders.filter(doc => 
      doc.id > (history.data.lastPostedDocumentId !== undefined? parseInt(history.data.lastPostedDocumentId!): 0));
    //const Math.ceil(documentHeaders.length / 100) + 10
    if(newDocumentHeaders.length === 0)
      return history.data.lastPostedDocumentId !== undefined? parseInt(history.data.lastPostedDocumentId!): null;
    history.update(
      documentHeaders.length, 
      documentHeaders[documentHeaders.length-1].createdAt.getTime(),
      documentHeaders[0].createdAt.getTime(),
      "" + documentHeaders[0].id,
      1.0);
    for(let doc of newDocumentHeaders){
      await dataMapper.put(adapt(doc));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return newDocumentHeaders[0].id;
    //await dataMapper.put(adapt(documentHeaders[0]));
  }
}
