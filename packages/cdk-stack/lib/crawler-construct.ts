import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as events from '@aws-cdk/aws-events';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as awsEcsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as path from 'path';
import * as iam from '@aws-cdk/aws-iam';

export interface CrawlerProps {
  /**
   * The docker image path
   */
  image: string;
  /**
   * desired task count(concurrency)
   */
  desiredTaskCount: number;
  /**
   * The visibility timeout to be configured on the SQS Queue, in seconds.
   *
   * @default cdk.Duration.seconds(600)
   */
  visibilityTimeout?: cdk.Duration;
  /**
   * The vpc of cluster. 
   *
   */
  vpc: ec2.Vpc;
  /**
   * The cluster of the fargate task. 
   *
   * @default new ecs.Cluster()
   */
  cluster?: ecs.Cluster;
  /**
   * Memory limit Mib
   *
   * @default 512
   */
  memoryLimitMiB?: number;
  /**
   * cpu unit(1024 == 1 vCPU)
   *
   * @default 256
   */
  cpu?: number;
  /**
   * request per seconds
   *
   * @default 10
   */
  rps?: number;
  /**
   * retries failed requests
   *
   * @default 5
   */
  retries?: number;
  /** 
   * platform specific enviroment variable
   */
  environment?: { [key: string]: string },
}

export class Crawler extends cdk.Construct {
  public readonly priorityQueue: sqs.Queue;
  public readonly normalQueue: sqs.Queue;
  public readonly taskRole: iam.IRole;
  static cacheTable: dynamodb.Table; 
  constructor(scope: cdk.Construct, id: string, props: CrawlerProps) {
    super(scope, id);
    if(process.env.GITHUB_TOKEN === undefined)
      throw Error('GITHUB_TOKEN env var must provide(github token to access github repository)');
    if(Crawler.cacheTable! === undefined) {
      Crawler.cacheTable = new dynamodb.Table(this, 'CacheTable', {
        partitionKey: { name: "key", type: dynamodb.AttributeType.STRING },
        timeToLiveAttribute: "expireAt",
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY, 
      });
    }
    if(props === undefined || (props.vpc === undefined && props.cluster === undefined) || props.image === undefined || props.desiredTaskCount === undefined)
      throw Error("Required properties: image, desiredTaskCount, vpc || cluster");
    const {
      vpc,
      desiredTaskCount,
      image,
      visibilityTimeout = cdk.Duration.seconds(300), 
      cluster = new ecs.Cluster(this, 'Cluster', { vpc }) ,
      memoryLimitMiB = 512,
      cpu = 256,
      rps = 10,
      retries = 10,
      environment = {},
    } = props;
    const historyTable = new dynamodb.Table(this, 'HistoryTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
    const priorityQueue = new sqs.Queue(this, 'PriorityQueue', {
      visibilityTimeout,
    });
    const normalQueue = new sqs.Queue(this, 'NormalQueue', {
      visibilityTimeout,
    });
    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB,
      cpu,
    })
    taskDefinition.addContainer("Container", {
      image: ecs.ContainerImage.fromAsset(image, {
        buildArgs: {
          GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        },
      }), 
      logging: new ecs.AwsLogDriver({
        streamPrefix: id,
      }),
      environment: Object.assign({
        NORMAL_QUEUE_URL: normalQueue.queueUrl,
        PRIORITY_QUEUE_URL: priorityQueue.queueUrl,
        CAHCE_TABLE_NAME: Crawler.cacheTable!.tableName,
        HISTORY_TABLE_NAME: historyTable.tableName,
        RPS: '' + rps,
        RETRIES: '' + retries,
      }, environment),
    })
    new ecs.FargateService(this, "FargateService", {
      cluster,
      taskDefinition,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC
      }),
      assignPublicIp: true,
      desiredCount: desiredTaskCount,
    });
    /*
    const task = new awsEcsPatterns.ScheduledFargateTask(this, 'Task', {
      cluster,
      schedule: events.Schedule.expression('rate(1 minute)'),
      desiredTaskCount,
      scheduledFargateTaskImageOptions: {
        image: ecs.ContainerImage.fromAsset(image), 
        memoryLimitMiB,
        cpu,
        environment: {
          NORMAL_QUEUE_ARN: normalQueue.queueUrl,
          PRIORITY_QUEUE_ARN: priorityQueue.queueUrl,
          RESULT_QUEUE_ARN: resultQueue.queueUrl,
          TABLE_NAME: table.tableName,
          RPS: '' + rps,
          RETRIES: '' + retries,
        },
      },
    });
    */
    historyTable.grantReadWriteData(taskDefinition.taskRole);
    priorityQueue.grantConsumeMessages(taskDefinition.taskRole);
    priorityQueue.grantSendMessages(taskDefinition.taskRole);
    normalQueue.grantConsumeMessages(taskDefinition.taskRole);
    normalQueue.grantSendMessages(taskDefinition.taskRole);
    this.taskRole = taskDefinition.taskRole;
    this.priorityQueue = priorityQueue;
    this.normalQueue = normalQueue;
  }
}
