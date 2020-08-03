import {
  attribute,
  hashKey,
  rangeKey,
  table,
} from '@aws/dynamodb-data-mapper-annotations';

const {
  DOCUMENT_TABLE_NAME,
  COMMENT_TABLE_NAME,
  USER_TABLE_NAME,
}

@table(DOCUMENT_TABLE_NAME)
class Document {
  @hashKey({ indexKeyConfigurations: { documentIdIndex: 'RANGE', } })
  userId: string;
  @rangeKey()
  createdAt: Date;
  @rangeKey({ indexKeyConfigurations: { documentIdIndex: 'HASH', } })
  documentPath: string;
  @attribute()
  userNickname!: string;
  @attribute()
  userIp!: string;
  @attribute()
  title!: string;
  @attribute()
  hasImage!: boolean;
  @attribute()
  hasVideo!: boolean;
  @attribute()
  likeCount: number;
}{
  gallery: GalleryIndex;
  id: number;
  title: string;
  author: User;
  commentCount: number;
  likeCount: number;
  hasImage: boolean;
  hasVideo: boolean;
  isRecommend: boolean;
  createdAt: Date;
};
/*
@table(COMMENT_TABLE_NAME)
class Comment {
  @hashKey()
  userId: string;
  @rangeKey({ indexKeyConfigurations: { commentIdIndex: 'HASH', } })
  commentId: number;
  @attribute()
  documentId: number;
  @attribute()
  contents: string;
  @attribute()
  createdAt: Date;
  @attribute()
  subCommentsIds: Array<number>;
};
*/
