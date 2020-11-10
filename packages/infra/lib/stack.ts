import { Construct, ConstructOptions } from 'constructs';
import { App, TerraformStack, TerraformOutput } from 'cdktf';
import { AwsProvider, S3Bucket, CloudwatchLogGroup } from '../.gen/providers/aws';
import { Vpc } from '../.gen/modules/terraform-aws-modules/vpc/aws';
import { paramCase } from 'change-case';
import { Crawler } from './crawler';
import * as path from 'path';

export interface Props extends ConstructOptions {
  region: string;
  forceDestroy: boolean;
  tags?: { [key:string]: string },
}

export class Stack extends TerraformStack {
  constructor(scope: Construct, name: string, props: Props) {
    super(scope, name);

    const { region, tags } = props;

    const provider = new AwsProvider(this, 'Aws', {
      region,
    });

    const logGroup = new CloudwatchLogGroup(this, 'LogGroup', {
      name: this.toString(),
      retentionInDays: 14,
      tags: props.tags,
    });

    const vpc = new Vpc(this, 'Vpc', {
      name: this.toString() + '/Vpc',
      cidr: '10.0.0.0/16',
      azs:            [`${region}a`, `${region}b`, `${region}c`],
      publicSubnets: ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"],
      createIgw: true,
      tags,
    })

    const bucket = new S3Bucket(this, 'Bucket', {
      bucket: paramCase(this.toString()),
      acl: 'private',
      forceDestroy: props.forceDestroy,
      tags,
    });

    const dcinsideCrawler = new Crawler(this, 'DcinsideCrawler', {
      tags,
      bucket,
    });
  }
}
