import * as events from '@aws-cdk/aws-events';
import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';

import { Crawler } from "@programming-gallery/cdk-crawler-construct";

export class CgStack extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const { vps, cluster, } = props;
    const activeGalleryCrawler = new lambda.Function(this, 'ActiveGalleryCrawler', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../', 'dcinside-active-gallery-collect-function')),
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(300),
      runtime: lambda.Runtime.NODEJS_12_X,
    });
    const rule = new events.Rule(this, 'Rule', {
      schedule: events.Schedule.expression('rate(5 minutes)')
    });
    rule.addTarget(new targets.LambdaFunction(activeGalleryCrawler));
    const documentTable = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'userid',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
    });
    const crawlerDcinside = new Crawler(this, 'CrawlerDcinside', { 
      image: path.resolve(__dirname, '../../', 'crawler-dcinside-image') as string,
      cluster,
      vpc,
      desiredTaskCount: 1,
      environment: {
        'DOCUMENT_TABLE_NAME': documentTable.tableName,
      },
    })
    this.documentTable = documentTable;
  }
}
