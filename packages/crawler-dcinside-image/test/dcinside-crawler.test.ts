jest.setTimeout(25000);
import { Crawler } from 'dcinside-crawler';


describe('dcinside-crawler', () => {
  it('main', async () => {
    const crawler = new Crawler();
    const gallery = {
      id: 'programming',
      isMiner: false,
    };
    let documentHeaders = await crawler.documentHeaders({ gallery, page: 2 });
    expect(documentHeaders.length).toEqual(100)
    let newPublishedDocumentHeaders = await crawler.documentHeaders({ gallery, lastDocumentId: documentHeaders[0].id })
    expect(newPublishedDocumentHeaders.length).toBeGreaterThanOrEqual(100);
    expect(newPublishedDocumentHeaders[0].id).toBeGreaterThanOrEqual(documentHeaders[0].id + 100);
  });
});
