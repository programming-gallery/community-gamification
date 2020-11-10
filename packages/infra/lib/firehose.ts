import { Construct, ConstructOptions } from 'constructs';
import { TerraformResource  } from 'cdktf';
import { KinesisFirehoseDeliveryStream, IamRole, IamRolePolicy, S3Bucket, CloudwatchLogGroup, CloudwatchLogStream } from '../.gen/providers/aws';
import { paramCase } from 'change-case';

export interface Props extends ConstructOptions {
  bucket: S3Bucket;
  prefix: string;
  errorOutputPrefix: string;
  logGroup?: CloudwatchLogGroup;
  tags?: { [key:string]: string };
}

/*
function tagNaming(scope: { toString() => string, tags: { [key: string]: string } | undefined, }) {
  scope.addOverride('tags', Object.assign({
    Name: scope.toString(),
  }, scope.tags));
}
*/

export class FirehoseDeliveryStream extends Construct {
  readonly deliveryStream: KinesisFirehoseDeliveryStream;
  constructor(scope: Construct, name: string, props: Props) {
    super(scope, name, props)
    const logGroup = props.logGroup ?? new CloudwatchLogGroup(this, 'LogGroup', {
      name: `/aws/kinesisfirehose/${paramCase(this.toString())}`,
      retentionInDays: 14,
      tags: props.tags,
    });
    const logStream = new CloudwatchLogStream(this, 'LogStream', {
      name: this.toString().split(logGroup.name!).pop()!,
      logGroupName: logGroup.name!,
      dependsOn: [ logGroup ],
    });
    const role = new IamRole(this, 'Role', {
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
          Action: 'sts:AssumeRole',
          Principal: {
            Service: 'firehose.amazonaws.com',
          },
          Effect: 'Allow',
          Sid: '',
        }],
      }),
    });
    const rolePolicy = new IamRolePolicy(this, 'RolePolicy', {
      role: role.name!,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "glue:GetTable",
              "glue:GetTableVersion",
              "glue:GetTableVersions"
            ],
            Resource: "*"
          },
          {
            Effect: "Allow",
            Action: [
              "s3:AbortMultipartUpload",
              "s3:GetBucketLocation",
              "s3:GetObject",
              "s3:ListBucket",
              "s3:ListBucketMultipartUploads",
              "s3:PutObject"
            ],
            Resource: [
              props.bucket.arn,
              `${props.bucket.arn}/*`,
            ]
          },
          {
            Action: [
              "logs:PutLogEvents"
            ],
            Resource: logStream.arn,
            Effect: "Allow"
          }
        ]
      }),
    })
    const deliveryStream = new KinesisFirehoseDeliveryStream(this, 'DeliveryStream', {
      name: paramCase(this.toString()),
      destination: 'extended_s3',
      serverSideEncryption: [{ enabled: false }],
      extendedS3Configuration: [{
        roleArn: role.arn,
        bucketArn: props.bucket.arn!,

        prefix: props.prefix,
        errorOutputPrefix: props.errorOutputPrefix,
        compressionFormat: 'GZIP',

        bufferSize: 128,
        bufferInterval: 600,

        cloudwatchLoggingOptions: [{
          enabled: true,
          logGroupName: logGroup.name,
          logStreamName: logStream.name,
        }],

        /*dataFormatConversionConfiguration: [{
          enabled: false
        }],
        processingConfiguration: [{
          enabled: false
        }],*/
      }],
    });
    this.deliveryStream = deliveryStream;
  }
  grantRead(role: IamRole): IamRolePolicy {
    return new IamRolePolicy(this, 'RolePolicy', {
      role: role.name!,
      policy: JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
          {
            "Action": [
              "firehose:DeleteDeliveryStream",
              "firehose:PutRecord",
              "firehose:PutRecordBatch",
              "firehose:UpdateDestination"
            ],
            "Resource": `${this.deliveryStream.arn}`,
            "Effect": "Allow"
          },
        ]
      })
    })
  }
  /*grantRead(role: IAMRole) {
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "firehose:DeleteDeliveryStream",
            "firehose:PutRecord",
            "firehose:PutRecordBatch",
            "firehose:UpdateDestination"
          ],
          "Resource": [
            "arn:aws:firehose:region:account-id:deliverystream/delivery-stream-name"
          ]
        }
      ]
    }
  }*/
}
