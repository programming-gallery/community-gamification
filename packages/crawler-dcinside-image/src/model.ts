import {
  attribute,
  hashKey,
  rangeKey,
  table,
} from '@aws/dynamodb-data-mapper-annotations';
import { DataMapper } from '@aws/dynamodb-data-mapper';
import DynamoDB = require('aws-sdk/clients/dynamodb');
import { DocumentHeader } from 'dcinside-crawler';

const {
  DOCUMENT_TABLE_NAME, 
  AWS_CONFIG = '{}'
} = process.env;

if(DOCUMENT_TABLE_NAME === undefined)
  throw Error("Environment variable DOCUMENT_TABLE_NAME not set");

const dataMapper = new DataMapper({
  client: new DynamoDB(JSON.parse(AWS_CONFIG)),
});

export { dataMapper };

@table(DOCUMENT_TABLE_NAME)
export class Document {
  @hashKey()
  userId!: string;
  @rangeKey()
  createdAtAndDocumentPath!: string;
  //@attribute({ indexKeyConfigurations: { documentPathIndex: 'HASH', } })
  @attribute()
  documentPath!: string;
  @attribute()
  createdAt!: Date;
  @attribute()
  userNickname!: string;
  @attribute()
  userIp?: string;
  @attribute()
  title!: string;
  @attribute()
  hasImage!: boolean;
  @attribute()
  hasVideo!: boolean;
  @attribute()
  likeCount!: number;
  @attribute()
  commentCount!: number;
};

/*
@table(COMMENT_TABLE_NAME)
class Comment {
  @hashKey()
  userId: string;
  @rangeKey({ indexKeyConfigurations: { commentIdIndex: 'HASH', } })
  commentId: number;
  @attribute()
  documentPath: number;
  @attribute()
  contents: string;
  @attribute()
  createdAt: Date;
  @attribute()
  subCommentsIds: Array<number>;
};
*/

export function adapt(doc: DocumentHeader): Document {
  return Object.assign(new Document, {
    userId: doc.author.id || `${doc.author.nickname}#${doc.author.ip}`,
    createdAtAndDocumentPath: doc.createdAt.toISOString() + '#' + doc.gallery.id + '#' + doc.id,
    createdAt: doc.createdAt.toISOString(),
    documentPath: doc.gallery.id + '#' + doc.id,
    userNickname: doc.author.nickname, 
    userIp: doc.author.ip, 
    hasImage: doc.hasImage,
    hasVideo: doc.hasVideo,
    title: doc.title,
    likeCount: doc.likeCount,
    commentCount: doc.commentCount,
  });
}
export function adaptKey(doc: DocumentHeader): Document {
  return Object.assign(new Document, {
    userId: doc.author.id || `${doc.author.nickname}#${doc.author.ip}`,
    createdAtAndDocumentPath: doc.createdAt + '#' + doc.gallery.id + '#' + doc.id,
  });
}
/*
@table(COMMENT_TABLE_NAME)
class Comment {
  @hashKey()
  userId: string;
  @rangeKey({ indexKeyConfigurations: { commentIdIndex: 'HASH', } })
  commentId: number;
  @attribute()
  documentPath: number;
  @attribute()
  contents: string;
  @attribute()
  createdAt: Date;
  @attribute()
  subCommentsIds: Array<number>;
};
*/
