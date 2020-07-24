import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as lambda from '@aws-cdk/aws-lambda';

export interface CrawlerProps {
  /**
   * The visibility timeout to be configured on the SQS Queue, in seconds.
   *
   * @default Duration.seconds(300)
   */
  visibilityTimeout: cdk.Duration;
  vpc: ec2.Vpc;
  cluster?: ecs.Cluster;
}

export class Crawler extends cdk.Construct {
  public readonly queueArn: string;

  constructor(scope: cdk.Construct, id: string, props: CrawlerProps = {}) {
    super(scope, id);
    const {
      vpc,
      visibilityTimeout = cdk.Duration.seconds(300), 
      cluster = new ecs.Cluster(this, 'Cluster', { vpc }) 
    } = props;
    const cluster = props.cluster;
    const table = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
    });
    const priorityQueue = new sqs.Queue(this, 'PriorityQueue', {
      visibilityTimeout,
    });
    const normalQueue = new sqs.Queue(this, 'NormalQueue', {
      visibilityTimeout,
    });
    const resultQueue = new sqs.Queue(this, 'ResultQueue', {
      visibilityTimeout,
    });
    const task = new ScheduledFargateTask(this, 'Task', {
      cluster,
      schedule: events.Schedule.expression('rate(1 minute)'),
      desiredTaskCount: 1,
      scheduledFargateTaskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, 'crawler-image')),
        memoryLimitMiB: 256,
        environment: {
          NORMAL_QUEUE_ARN: normalQueue.queueArn,
          PRIORITY_QUEUE_ARN: priorityQueue.queueArn,
          RESULT_QUEUE_ARN: resultQueue.queueArn,
        },
      },
    });
    table.grantReadWriteData(task.taskDefinition.taskRole);
    priorityQueue.grantConsumeMessages(task.taskDefinition.taskRole);
    priorityQueue.grantPublishMessages(task.taskDefinition.taskRole);
    normalQueue.grantConsumeMessages(task.taskDefinition.taskRole);
    normalQueue.grantPublishMessages(task.taskDefinition.taskRole);
    resultQueue.grantPublishMessages(task.taskDefinition.taskRole);
    this.queueArn = resultQueue.queueArn;
  }
}
