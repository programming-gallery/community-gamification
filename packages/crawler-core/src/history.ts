import {
  attribute,
  hashKey,
  rangeKey,
  table,
} from '@aws/dynamodb-data-mapper-annotations';
import { ExpressionAttributes, equals, AttributePath, AttributeValue, ConditionExpression, FunctionExpression, ConditionExpressionPredicate } from '@aws/dynamodb-expressions';
import { DataMapper } from '@aws/dynamodb-data-mapper';
import DynamoDB = require('aws-sdk/clients/dynamodb');


export interface IDataModel {
  id: string;
  lastPostedDocumentId?: string;
  /**
   * Last crawled documents posting time
   */
  lastPostedTimestamp?: number;
  /**
   * Posting Frequency Exponential Average
   */
  postingFrequencyEA?: number;
  /**
   * Random generated crawling task tracking key.
   * In some cases, there are multiple tasks of same target gallery could queing in the queue
   * In that case, we track only valid one and discard the others.
   * If a task has the same tracking key in the table, we assume the task is valid.
   */
  trackingKey?: number;
};

export interface IHistory {
  data: IDataModel;
  isPriority(): boolean; 
  isValid(trackingKey: number): boolean;
  /**
   * Update history. the changes are not saved. To save, invoke save method.
   */
  update(documentCount: number, firstPostedTimestamp: number, lastPostedTimestamp: number, lastPostedDocumentId?: string): void; 
  /**
   * Save with a tracking key. it might fail if another worker update the same history.
   *
   * @returns The result of update(true or false)
   */
  save(trackingKey: number): Promise<boolean>; 
}

export interface IHistoryConstructor {
  getOrCreate(id: string): Promise<IHistory>;
  createTable(option: { readCapacityUnits: number, writeCapacityUnits: number}): Promise<void>;
  deleteTable(): Promise<any>;
}

export function buildHistory (tableName: string, awsConfig: any, weight: number = 0.2): IHistoryConstructor {
  @table(tableName)
  class DataModel implements IDataModel {
    @hashKey()
    public id: string = '';
    @attribute()
    public lastPostedDocumentId?: string;
    @attribute()
    public lastPostedTimestamp?: number;
    @attribute()
    public postingFrequencyEA?: number;
    @attribute()
    public trackingKey?: number;
  }
  let dataMapper = new DataMapper({ client: new DynamoDB(awsConfig) });
  class History implements IHistory {
    data: DataModel;
    constructor(data: DataModel) {
      this.data = data;
    }
    static async getOrCreate(id: string): Promise<History> {
      try {
        let history: DataModel = await dataMapper.get(Object.assign(new DataModel, {id}));
        return new History(history);
      } catch (e) {
        if(e.name !== 'ItemNotFoundException')
          throw e;
        let history = new DataModel();
        history.id = id;
        return new History(history);
      }
    }
    static async createTable(option: { readCapacityUnits: number, writeCapacityUnits: number} = { readCapacityUnits: 5, writeCapacityUnits: 5 }) { 
      await dataMapper.createTable(DataModel, option);
    }
    static async deleteTable() { 
      await dataMapper.deleteTable(DataModel);
    }
    isPriority(): boolean {
      let history = this.data;
      if(history.postingFrequencyEA === undefined) return true;
      else if((history.postingFrequencyEA || 0) > 1/3600) return true;
      else return false;
    }
    isValid(trackingKey: number): boolean { 
      return this.data.trackingKey === undefined || this.data.trackingKey === trackingKey;
    }
    update(documentCount: number, firstPostedTimestamp: number, lastPostedTimestamp: number, lastPostedDocumentId?: string) {
      let history = this.data;
      let frequency = documentCount*1000 / ((lastPostedTimestamp - (history.lastPostedTimestamp || firstPostedTimestamp)) || Infinity);
      history.postingFrequencyEA = history.postingFrequencyEA !== undefined? history.postingFrequencyEA * (1 - weight) + frequency * weight : frequency;
      history.lastPostedTimestamp = lastPostedTimestamp;
      history.lastPostedDocumentId = lastPostedDocumentId || history.lastPostedDocumentId;
    }
    async save(trackingKey: number): Promise<boolean> {
      let history = this.data;
      let originalTrackingKey = history.trackingKey;
      history.trackingKey = trackingKey;
      const condition = originalTrackingKey === undefined? 
      new FunctionExpression('attribute_not_exists', new AttributePath('trackingKey')): 
      { 
        type: 'Or',
        conditions: [
          new FunctionExpression('attribute_not_exists', new AttributePath('trackingKey')),
          { ...equals(originalTrackingKey), subject: new AttributePath('trackingKey') },
        ],
      } as ConditionExpression;
      try {
        const attributes = new ExpressionAttributes();
        await dataMapper.put(history, {
          condition,
        });
      } catch(e) {
        if(e.code === 'ConditionalCheckFailedException')
          return false;
        else throw e;
      }
      return true;
    }
  }
  return History;
}
