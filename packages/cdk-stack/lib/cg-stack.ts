import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as path from 'path';

import { Crawler } from "@programming-gallery/cdk-crawler-construct";

export class CgStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, 'Vpc', {
      cidr: "10.0.0.0/16",
      maxAzs: 3,
      enableDnsSupport: true,
      enableDnsHostnames: true,
      subnetConfiguration: [{
        cidrMask: 26,
        name: 'Public',
        subnetType: ec2.SubnetType.PUBLIC,
      }, {
        cidrMask: 26,
        name: 'Isolated',
        subnetType: ec2.SubnetType.ISOLATED,
      }],
    });
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });
    const dcinsideDocumentTable = new dynamodb.Table(this, 'Table', {
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
        'DOCUMENT_TABLE_NAME': dcinsideDocumentTable.tableName,
      },
    })
  }
}
