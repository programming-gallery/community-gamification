import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';

import { Crawler } from "./crawler-construct";

export interface Props {
  vpc: ec2.Vpc;
  cluster: ecs.Cluster;
  desiredTaskCount?: number;
}

export class DcinsideCrawler extends cdk.Construct {
  documentTable: dynamodb.Table;

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id);
    const { vpc, cluster, desiredTaskCount = 5 } = props;
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
    const crawler = new Crawler(this, 'Crawler', {
      image: path.resolve(__dirname, '../../', 'crawler-dcinside-image') as string,
      cluster,
      vpc,
      desiredTaskCount,
      environment: {
        'DOCUMENT_TABLE_NAME': documentTable.tableName,
      },
    })
    documentTable.grantReadWriteData(crawler.taskRole);
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
    this.documentTable = documentTable;
    crawler.priorityQueue.grantSendMessages(activeGalleryCrawler);
    crawler.normalQueue.grantSendMessages(activeGalleryCrawler);
    Crawler.cacheTable.grantReadWriteData(activeGalleryCrawler);
  }
}
