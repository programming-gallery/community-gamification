import 'reflect-metadata';
import { Model, PartitionKey, SortKey, GSIPartitionKey, GSISortKey, DynamoStore, update } from '@shiftcoders/dynamo-easy'
import { RawCrawler, GalleryIndex, DocumentHeader, DocumentBody, Comment } from 'dcinside-crawler';
import { send } from './firehose';

const { 
  RECIPE_TABLE, 
  DELIVERY_STREAM_NAME,
  RECIPE_VERSION='1', 
  EXPIRE_DURATION='' + (12*60*1000), 
  DOCUMENT_PAGE_SIZE='100', 
  COMMENT_PAGE_SIZE='100',
  COVERING_DOCUMENTS='1000',
  LIMIT='1000',
  RPS='10',
  RETRIES='3',
} = process.env;

if(RECIPE_TABLE == null)
  throw Error(`RECIPE_TABLE env var is empty`);
if(DELIVERY_STREAM_NAME == null)
  throw Error(`DELIVERY_STREAM_NAME env var is empty`);

@Model({tableName: RECIPE_TABLE!})
class Recipe {
  @PartitionKey()
  galleryId: string = "";
  @SortKey()
  @GSIPartitionKey('AwakeAtIndex')
  version: number = 1;
  @GSISortKey('AwakeAtIndex')
  awakeAt: string = "";
  galleryIsMiner?: boolean;
  lastDocuments?: DocumentRecipe[]
}

interface CommentRecord extends Omit<Comment, 'document'|'parent'> {
  parentId?: number;
}

interface DocumentRecord extends DocumentHeader {
  comments?: CommentRecord[], 
}

interface DocumentRecipe {
  id: number;
  commentCount: number;
  likeCount: number;
  viewCount: number;
  lastCommentId?: number;
}
function recordToRecipe(rec: DocumentRecord): DocumentRecipe {
  return {
    id: rec.id, 
    commentCount: rec.commentCount, 
    likeCount: rec.likeCount, 
    viewCount: rec.viewCount, 
    lastCommentId: rec.comments?.reduce((acc, comm) => comm.id > acc? comm.id: acc, 0),
  }
}

const recipeStore = new DynamoStore(Recipe, );

interface CrawlProps {
  coveringDocuments: number;
  limit: number;
  maxSleep: number;
  rps: number;
  retries: number;
  timeLag: number;
  idLag: number;
  periodBucketSize: number;
  commentRequestBatchSize: number;
  timeout: number;
}

const defaultCrawlProps: CrawlProps = {
  coveringDocuments: 1000,
  maxSleep: 3600*1000*24,
  rps: 100,
  retries: 1,
  limit: 1000,
  timeLag: 60*60*1000,
  idLag: 100,
  periodBucketSize: 10,
  commentRequestBatchSize: 10,
  timeout: 10*60*1000,
}

async function searchPage(crawler: RawCrawler, gallery: GalleryIndex, documentId: number) {
  let page = 1;
  let documents = await crawler.documentHeaders(gallery, page);
  while(documents[0].id < documentId || documents[documents.length-1].id > documentId) {
    if(documents[0].id < documentId)
      page = page - Math.ceil((-documents[0].id + documentId) / parseInt(DOCUMENT_PAGE_SIZE));
    else
      page = page + Math.ceil((documents[documents.length-1].id - documentId) / parseInt(DOCUMENT_PAGE_SIZE));
    documents = await crawler.documentHeaders(gallery, page);
  }
  return page;
}
async function crawlDocuments(crawler: RawCrawler, gallery: GalleryIndex, 
                              lastLeastDocumentId: number | null | undefined, lastOldestDocumentId: number | null | undefined, 
                              coveringDocuments: number, limit: number, rps:number, retries:number): 
Promise<{ documents: DocumentHeader[], startPage: number, endPage: number }> 
{
  let endPage = 
    (lastLeastDocumentId? (await searchPage(crawler, gallery, lastLeastDocumentId)): 0) + 
    Math.ceil(Math.min(coveringDocuments, (lastLeastDocumentId || 100000) - (lastOldestDocumentId || 0)) / parseInt(DOCUMENT_PAGE_SIZE));
  let startPage = Math.max(endPage - Math.ceil(limit / parseInt(DOCUMENT_PAGE_SIZE)), 1);
  let documents: DocumentHeader[] = [];
  console.log(`crawl ${gallery.id} page ${startPage} ~ ${endPage}`);
  for(let page = startPage; page <= endPage; ++page){
    documents.push(...await crawler.documentHeaders(gallery, page));
    if(documents[documents.length-1].id <= (lastOldestDocumentId || 0)) 
      break;
  }
  return { documents: documents.filter(doc => doc.id >= (lastOldestDocumentId || 0)), startPage, endPage };
}

async function crawl(recipe: Recipe, props: Partial<CrawlProps>): 
Promise<{ recipe: Recipe, records: DocumentRecord[] }> 
{
  const { coveringDocuments, maxSleep, rps, retries, timeLag, idLag, limit, periodBucketSize, commentRequestBatchSize, timeout } = Object.assign(defaultCrawlProps, props);
  const now = new Date();
  let crawler = new RawCrawler(rps, retries);
  let lastLeastDocumentId = recipe.lastDocuments?.reduce((acc, doc) => acc >= doc.id? acc: doc.id, 0);
  let lastOldestDocumentId = recipe.lastDocuments?.reduce((acc, doc) => acc <= doc.id? acc: doc.id, 999999999999);
  let gallery = { id: recipe.galleryId, isMiner: recipe.galleryIsMiner? true : false };
  let { documents, startPage, endPage } = await crawlDocuments(crawler, gallery, lastLeastDocumentId, lastOldestDocumentId, coveringDocuments, limit, rps, retries);
  let records:DocumentRecord[] = [];
  let index = documents.length;
  const lastDocumentById: { [id:number]: DocumentRecipe } = recipe.lastDocuments?.reduce((acc: { [id:number]: DocumentRecipe }, doc) => (acc[doc.id] = doc, acc), {}) || {};
  while(new Date().getTime() - now.getTime() < timeout && index > 0) {
    let nextIndex = index;
    let commentRequestCount = 0;
    while(nextIndex > 0 && commentRequestCount < commentRequestBatchSize) {
      commentRequestCount += Math.ceil(documents[nextIndex-1].commentCount / parseInt(COMMENT_PAGE_SIZE));
      nextIndex -= 1;
    }
    let commentses = await Promise.all(documents.slice(nextIndex, index).map((doc) => {
      if(doc.commentCount && (lastDocumentById[doc.id] == null || lastDocumentById[doc.id].commentCount < doc.commentCount)){
        return crawler.comments(doc);
      }
      else{
        return null;
      }
    }));
    for(let i=nextIndex; i < index; ++i){
      let doc = documents[i];
      let comments = commentses[i-nextIndex]?.filter((comm:Comment) => comm.id > (lastDoc?.lastCommentId || 0));
      let lastDoc = lastDocumentById[doc.id];
      if(lastDoc == null || 
         lastDoc.viewCount*1.25 < doc.viewCount || 
         lastDoc.likeCount*1.25 < doc.likeCount ||
         lastDoc.commentCount < doc.commentCount)
        records.push(Object.assign(doc, { 
          comments: comments?.map(comm => { 
            const { document, parent, ...rest } = comm; 
            return Object.assign(rest, {
              parentId: comm.parent?.id
            });
          })
        }));
    }
    index = nextIndex;
  }
  if(startPage > 1 || index > 0)
    recipe.awakeAt = now.toISOString();
  else 
    recipe.awakeAt = new Date(now.getTime() + Math.min(now.getTime() - documents[Math.min(periodBucketSize, documents.length - 1)].createdAt.getTime(), maxSleep)).toISOString();
  recipe.lastDocuments = records.map(rec => recordToRecipe(rec));
  return { recipe, records };
}

async function main(galleryId: string, timeout: number) {
  let recipe = await recipeStore.get(galleryId, parseInt(RECIPE_VERSION)).exec()!;
  if(recipe == null)
    throw Error(`galleryId=${galleryId}/version=${RECIPE_VERSION} does not exists on ${RECIPE_TABLE}`);
  if(recipe.awakeAt){
    await recipeStore.update(recipe.galleryId, recipe.version)
      .updateAttribute('awakeAt').set(new Date(new Date().getTime() + parseInt(timeout)).toISOString())
      .onlyIfAttribute('awakeAt').eq(recipe.awakeAt)
      .exec();
  } else {
    await recipeStore.update(recipe.galleryId, recipe.version)
      .updateAttribute('awakeAt').set(new Date(new Date().getTime() + parseInt(timeout)).toISOString())
      .onlyIfAttribute('awakeAt').attributeNotExists()
      .exec();
  }
  let { recipe: newRecipe, records } = await crawl(recipe, {
    coveringDocuments: parseInt(COVERING_DOCUMENTS),
    limit: parseInt(LIMIT),
    rps: parseInt(RPS),
    retries: parseInt(RETRIES),
    timeout: timeout,
  });
  console.log(`send records`);
  await send(DELIVERY_STREAM_NAME!, records);
  console.log(`update recipe`);
  await recipeStore.put(newRecipe).exec();
}

async function handler(event: any, context: any) {
  const now = new Date();
  const expireAt = now.getTime() + parseInt(EXPIRE_DURATION);
  while(expireAt.getTime() > new Date().getTime()) {
    let recipe = await recipeStore.query()
      .index("AwakeAtIndex")
      .wherePartitionKey(parseInt(RECIPE_VERSION))
      .whereSortKey().lt(now.toISOString())
      .ascending()
      .limit(1)
      .exec();
    if(recipe == null)
      throw Error(`No recipe available for version=${RECIPE_VERSION}`);
    await main(recipe.galleryId, expireAt - new Date().getTime());
  }
}

module.exports = {
  main,
  Recipe,
  recipeStore,
  handler,
}
