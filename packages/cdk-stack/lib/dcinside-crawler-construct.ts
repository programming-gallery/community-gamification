import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';
import * as kinesisfirehose from '@aws-cdk/aws-kinesisfirehose';
import * as glue from '@aws-cdk/aws-glue';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as logs from '@aws-cdk/aws-logs';

import { Crawler } from "./crawler-construct";
import { DeliveryStream } from "./delivery-stream-construct";

export interface Props {
  vpc: ec2.Vpc;
  cluster: ecs.Cluster;
  glueDatabase: glue.Database;
  bucket: s3.Bucket;
  desiredTaskCount?: number;
}

export class DcinsideCrawler extends cdk.Construct {
  documentTable: dynamodb.Table;

  constructor(scope: cdk.Stack, id: string, props: Props) {
    super(scope, id);
    const { vpc, cluster, glueDatabase, bucket, desiredTaskCount = 5 } = props;
    /*
    const documentTable = new dynamodb.Table(this, 'DocumentTable', {
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'createdAtAndDocumentPath',
        type: dynamodb.AttributeType.STRING,
      },
      readCapacity: 100,
      writeCapacity: 100,
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });
    */
    const deliveryStream = new DeliveryStream(scope, id + 'DeliveryStream', {
      //vpc,
      //cluster,
      tableName: 'dcinside_document',
      //database: glueDatabase,
      //bucket,
      columns: [{
        name: 'galleryId',
        type: glue.Schema.STRING,
      },{
        name: 'galleryIsMiner',
        type: glue.Schema.BOOLEAN,
      },{
        name: 'id',
        type: glue.Schema.BIG_INT,
      },{
        name: 'title',
        type: glue.Schema.STRING,
      },{
        name: 'commentCount',
        type: glue.Schema.INTEGER,
      },{
        name: 'likeCount',
        type: glue.Schema.INTEGER,
      },{
        name: 'hasImage',
        type: glue.Schema.BOOLEAN,
      },{
        name: 'hasVideo',
        type: glue.Schema.BOOLEAN,
      },{
        name: 'createdAt',
        type: glue.Schema.TIMESTAMP,
      },{
        name: 'userNickname',
        type: glue.Schema.STRING,
      },{
        name: 'userIp',
        type: glue.Schema.STRING,
      },{
        name: 'userId',
        type: glue.Schema.STRING,
      }],
    });
    //glueTable.node.defaultChild.addPropertyOverride('TableInput.StorageDescriptor.Columns', mergedColumns.getAtt("StorageDescriptor.Columns"));
    //glueTable.node.defaultChild.tableInput.storageDescriptor.columns = mergedColumns.getAtt("Columns");
    //glueTable.node.defaultChild.tableInput.storageDescriptor.columns = mergedColumns.getResponseField("Columns");
    //deliveryStream.addDependsOn(firehoseRole.node);
    //firehose.addPropertyOverride('Tags', scope.tags.renderTags());
    //

    const crawler = new Crawler(this, 'Crawler', {
      image: path.resolve(__dirname, '../../', 'crawler-dcinside-image') as string,
      cluster,
      vpc,
      desiredTaskCount,
      environment: {
        //'DOCUMENT_TABLE_NAME': documentTable.tableName,
        'DELIVERY_STREAM_NAME': deliveryStream.deliveryStream.deliveryStreamName!,
      },
      /*
      policies: [
				iam.PolicyStatement.fromJson({
					Action: [
						"firehose:DeleteDeliveryStream",
						"firehose:PutRecord",
						"firehose:PutRecordBatch",
						"firehose:UpdateDestination"
					],
					Resource: //[ `arn:aws:firehose:${scope.region}:${scope.account}:deliverystream/${deliveryStream.deliveryStreamName}`],
            [deliveryStream.deliveryStream.attrArn],
					Effect: "Allow"
				})]
        */
    })
    deliveryStream.grantPutRecord(crawler.taskRole);
    //documentTable.grantReadWriteData(crawler.taskRole);
    const activeGalleryCrawler = new lambda.Function(this, 'ActiveGalleryCrawler', {
      code: lambda.Code.asset(path.join(__dirname, '../../', 'dc-gallery-collect-fn')),
      memorySize: 255,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(300),
      runtime: lambda.Runtime.NODEJS_12_X,
      environment: {
        CONTRACT_QUEUE_URL: crawler.priorityQueue.queueUrl,
        CACHE_TABLE_NAME: Crawler.cacheTable.tableName,
      },
    });
    const rule = new events.Rule(this, 'Rule', {
      schedule: events.Schedule.expression('rate(5 minutes)')
    });
    rule.addTarget(new targets.LambdaFunction(activeGalleryCrawler));
    //this.documentTable = documentTable;
    crawler.priorityQueue.grantSendMessages(activeGalleryCrawler);
    crawler.normalQueue.grantSendMessages(activeGalleryCrawler);
    Crawler.cacheTable.grantReadWriteData(activeGalleryCrawler);
  }
}
