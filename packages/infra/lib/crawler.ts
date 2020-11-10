import { Construct, ConstructOptions } from 'constructs';
import { DynamodbTable } from '../.gen/modules/terraform-aws-modules/dynamodb-table/aws';
import { LambdaFunction } from '../.gen/modules/terraform-aws-modules/lambda-function/aws';
import { S3Bucket, CloudwatchLogGroup, IamRole } from '../.gen/providers/aws';
import { paramCase, snakeCase } from 'change-case';
import { FirehoseDeliveryStream } from './firehose';

export interface Props extends ConstructOptions {
  tags?: { [key:string]: string },
  bucket: S3Bucket,
  logGroup?: CloudwatchLogGroup,
  lambda: {
    handler: string,
    runtime: string,
    sourcePath: string,
  },
}

export class Crawler extends Construct {
  constructor(scope: Construct, name: string, props: Props) {
    super(scope, name, props);

    const recipeTable = new DynamodbTable(this, 'RecipeTable', {
      name: paramCase(this.toString()) + '-recipe-table',
      hashKey: 'galleryId',
      rangeKey: 'version',
      globalSecondaryIndexes: [{
        name: 'AwakeAtIndex',
        hash_key: 'version',
        range_key: 'awakeAt',
        projection_type: 'INCLUDE',
        non_key_attributes: ['galleryId'],
      }],
      attributes: [{
        name: 'galleryId',
        type: 'S',
      },{
        name: 'awakeAt',
        type: 'S',
      },{
        name: 'version',
        type: 'N',
      }],
      tags: props.tags,
    });

    const deliveryStream = new FirehoseDeliveryStream(this, 'DeliveryStream', {
      bucket: props.bucket,
      logGroup: props.logGroup,
      prefix: `datalake/raw/${snakeCase(name)}/datehour=!{timestamp:yyyy-MM-dd-HH}`,
        errorOutputPrefix: `datalake/error/raw/${snakeCase(name)}/datehour=!{timestamp:yyyy-MM-dd-HH}/result=!{firehose:error-output-type}/`,
        tags: props.tags,
    });

    const role = new IamRole(this, 'Role', {
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Action: 'sts:AssumeRole',
          Principal: {
            Service: 'lambda.amazonaws.com',
          },
          Effect: 'Allow',
        }],
      }),
    });
    const logGroup = props.logGroup ??  new CloudwatchLogGroup(this, 'LogGroup', {
      name: `/aws/lambda/${paramCase(this.toString())}`,
      retentionInDays: 14,
      tags: props.tags,
    });
    const rolePolicy = new IamRolePolicy(this, 'RolePolicy', {
      role: role.name!,
      policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Action: [
              'firehose:DeleteDeliveryStream',
              'firehose:PutRecord',
              'firehose:PutRecordBatch',
              'firehose:UpdateDestination'
            ],
            Resource: `${this.deliveryStream.arn}`,
            Effect: 'Allow'
          }, {
            Action: [
              'logs:PutLogEvents',
              'logs:Put*',
            ],
            Resource: logGroup.arn + ':log-stream:*',
            Effect: 'Allow'
          }
        ]
      })
    });

    let lambdaName = paramCase(this.toString());
    const lambdaLogStream = new CloudwatchLogStream(this, 'LogStream', {
      name: lambdaName.split(logGroup.name!).pop()!,
      logGroupName: logGroup.name!,
      dependsOn: [ logGroup ],
    });
    const lambda = new LambdaFunction(this, 'Lambda', {
      functionName: lambdaName,
      handler: props.lambda.handler, 
      runtime: props.labmda.runtime, 
      sourcePath: props.lambda.sourcePath,
      createRole: false,
      lambdaRole: role.arn,
      tags: props.tags,
    });

    const eventRule = new CloudwatchEventRule(this, 'EventRule', {
      name: lambdaName, 
      scheduleExpression: 'rate(${var.rate})'
    });

    const eventTarget = new CloudwatchEventTarget(this, 'EventTarget', {
      rule: eventRule.name!,
      targetId: lambdaName,
      arn: lambda.thisLambdaFunctionArn!,
    });

    new LambdaPermission(this, 'LambdaPermission', {
      statementId: 'AllowExecutionFromCloudWatch',
      action: 'lambda:InvokeFunction',
      functionName: lambda.thisLambdaFunctionArn!,
      principal: "events.amazonaws.com"
      sourceArn: eventRule.arn!,
    });
  }
}
