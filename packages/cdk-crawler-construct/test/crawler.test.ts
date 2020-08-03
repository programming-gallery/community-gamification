import { expect as expectCDK, haveResource, haveResourceLike, SynthUtils, countResources, ResourcePart } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Crawler from '../lib/index';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as path from 'path';

it('SQS Queue Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');
  const vpc = new ec2.Vpc(stack ,'Vpc');
  new Crawler.Crawler(stack, 'MyTestConstruct', { vpc, image: path.resolve(__dirname, '../../', 'crawler-dcinside-image'), desiredTaskCount: 5});
  expectCDK(stack).to(countResources('AWS::SQS::Queue', 3));
  expectCDK(stack).to(haveResource("AWS::ECS::Cluster"));
  expectCDK(stack).to(haveResource("AWS::ECS::TaskDefinition", ));
});

