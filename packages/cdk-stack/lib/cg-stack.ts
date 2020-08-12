import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as path from 'path';
import * as glue from '@aws-cdk/aws-glue';
import * as s3 from '@aws-cdk/aws-s3';
import { DcinsideCrawler } from './dcinside-crawler-construct'


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
    const glueDatabase = new glue.Database(this, 'GlueDatabase', {
      databaseName: 'cg',
    });
    const bucket = new s3.Bucket(this, 'Bucket', {});

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    const crawlerDcinside = new DcinsideCrawler(this, 'CrawlerDcinside', { 
      cluster,
      vpc,
      glueDatabase,
      bucket,
      desiredTaskCount: 5,
    })
  }
}
