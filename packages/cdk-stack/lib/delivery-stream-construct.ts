import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';
import * as kinesisfirehose from '@aws-cdk/aws-kinesisfirehose';
import * as awsS3Notifications from '@aws-cdk/aws-s3-notifications';
import * as glue from '@aws-cdk/aws-glue';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as logs from '@aws-cdk/aws-logs';
import * as athena from '@aws-cdk/aws-athena';

const camelToSnake = (str:string) => str[0].toLowerCase() + str.slice(1, str.length).replace(/[A-Z]/g, (letter:string) => `_${letter.toLowerCase()}`);

export interface Props {
  //vpc: ec2.Vpc;
  //database: glue.Database;
  tableName: string;
  columns: glue.Column[],
}

export class DeliveryStream extends cdk.Construct {
  deliveryStream: kinesisfirehose.CfnDeliveryStream;
  table: glue.Table;

  static bucket: s3.Bucket;
  static workgroup: athena.CfnWorkGroup;
  static database: glue.Database;

  constructor(scope: cdk.Stack, id: string, props: Props) {
    super(scope, id);
    //const { database, tableName, columns, } = props;
    const { tableName, columns, } = props;
    if(DeliveryStream.bucket === undefined){
      DeliveryStream.bucket = new s3.Bucket(scope, 'Bucket', {});
    }
    if(DeliveryStream.workgroup === undefined){
      DeliveryStream.workgroup = new athena.CfnWorkGroup(scope, 'Workgroup', {
        name: scope.toString() + "DDL",
        state: "ENABLED",
        recursiveDeleteOption: true,
        workGroupConfiguration: {
          publishCloudWatchMetricsEnabled: true,
          enforceWorkGroupConfiguration: false,
          resultConfiguration: {
            outputLocation: `s3://${DeliveryStream.bucket.bucketName}/athena-ddl-query-result/`,
          },
        }
      });
    }
    if(DeliveryStream.database === undefined) {
      DeliveryStream.database = new glue.Database(scope, 'GlueDatabase', {
        databaseName: camelToSnake(scope.toString()),
      });
    }
    const bucket = DeliveryStream.bucket;
    const workgroup = DeliveryStream.workgroup;
    const database = DeliveryStream.database;
    /*
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
    */
    const s3BucketPrefix = 'datalake/'
    const glueTable = new glue.Table(this, 'DataIngestion', {
      bucket: bucket,
      s3Prefix: `${s3BucketPrefix}${tableName}/`,
      database: database,
      compressed: true,
      storedAsSubDirectories: true,
      tableName: tableName,
      partitionKeys: [{
        name: 'dateWithHours',
        type: glue.Schema.STRING,
      }],
      columns,
      dataFormat: glue.DataFormat.PARQUET,
    });
    //glueTable.node.defaultChild.addPropertyOverride('TableInput.StorageDescriptor.Columns', mergedColumns.getAtt("StorageDescriptor.Columns"));
    //glueTable.node.defaultChild.tableInput.storageDescriptor.columns = mergedColumns.getAtt("Columns");
    //glueTable.node.defaultChild.tableInput.storageDescriptor.columns = mergedColumns.getResponseField("Columns");
    const firehoseRole = new iam.Role(this, 'DataIngestionRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
    });
    bucket.grantReadWrite(firehoseRole);
    firehoseRole.addToPolicy(iam.PolicyStatement.fromJson({
      Action: [ 'glue:GetTableVersions' ],
      Effect: 'Allow',
      Resource: [ "*", ],
      //Resource: [ database.catalogArn, ],
    }));
    const logGroup = new logs.LogGroup(this, id + 'DeliveryStream' + 'LogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
    });
    const logStream = new logs.LogStream(this, id + 'DeliveryStream' + 'LogStream', {
      logGroup,
    });
    logGroup.grantWrite(firehoseRole);
		const deliveryStream = new kinesisfirehose.CfnDeliveryStream(this, 'DeliveryStream', {
			deliveryStreamName: scope.toString() + id,
			deliveryStreamType: 'DirectPut',
			extendedS3DestinationConfiguration: {
				bucketArn: bucket.bucketArn,
				prefix: `${s3BucketPrefix}${tableName}/dateWithHours=!{timestamp:yyyy-MM-dd-HH}/`,
				errorOutputPrefix: `${s3BucketPrefix}error/!{firehose:error-output-type}/${tableName}/dateWithHours=!{timestamp:yyyy-MM-dd-HH}/`,
				bufferingHints: {
					intervalInSeconds: 600,
					sizeInMBs: 128,
				},
				//compressionFormat: "Snappy",
				compressionFormat: "UNCOMPRESSED",
				cloudWatchLoggingOptions: {
					enabled: true,
					logGroupName: logGroup.logGroupName,
					logStreamName: logStream.logStreamName,
				},
				encryptionConfiguration: {
					noEncryptionConfig: "NoEncryption",
				},
				dataFormatConversionConfiguration: {
					enabled: true,
					inputFormatConfiguration: {
						deserializer: {
							openXJsonSerDe : {},
						},
					},
					outputFormatConfiguration: {
						serializer: {
							/*orcSerDe: {
								//compression: "SNAPPY",
							}*/
              parquetSerDe: {},
						},
					},
					schemaConfiguration: {
						catalogId: database.catalogId,
						databaseName: database.databaseName,
						region: scope.region,
						roleArn: firehoseRole.roleArn,
						tableName: glueTable.tableName,
						versionId: "LATEST",
					}
				},
				roleArn: firehoseRole.roleArn,
			}
		});
    deliveryStream.node.addDependency(firehoseRole);
    //deliveryStream.addDependsOn(firehoseRole.node);
    //firehose.addPropertyOverride('Tags', scope.tags.renderTags());
    //

    const glueTablePartitionUpdateFunction = new lambda.Function(this, 'GlueTablePartitionUpdator', {
			runtime: lambda.Runtime.NODEJS_12_X,
			handler: "index.handler",
			code: lambda.Code.asset(path.join(__dirname, "../../glue-partition-update-fn")),
			logRetention: logs.RetentionDays.ONE_WEEK,
			timeout: cdk.Duration.seconds(600),
			environment: {
				PARTITION_KEY: 'dateWithHours',
				TABLE: glueTable.tableName,
				DATABASE: database.databaseName,
				WORKGROUP: workgroup.name,
			},
			initialPolicy: [
				iam.PolicyStatement.fromJson({
					Action: "athena:*",
					Effect: "Allow",
					Resource: [ `arn:aws:athena:${scope.region}:${scope.account}:workgroup/${workgroup.name}` ],
					//Resource: [ `arn:aws:athena:${workgroup.getAtt('Region')}:${workgroup.getAtt('Account')}:workgroup/${workgroup.name}` ],
					//Resource: [ workgroup.attrArn, ],
					//Resource: [ workgroup.attrArn, ],
				}),
				iam.PolicyStatement.fromJson({
					Action: [ "glue:*" ],
					Resource: [ "*" ],
					Effect: "Allow"
				}),
				iam.PolicyStatement.fromJson({
					Action: [
						"s3:PutObject",
						"s3:GetObject",
						"s3:GetBucketLocation",
						"s3:ListBucket"
					],
					Effect: "Allow",
					Resource: [
						bucket.bucketArn,
						bucket.bucketArn + "/*",
					]
				}),
			],
		})
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED, 
      new awsS3Notifications.LambdaDestination(glueTablePartitionUpdateFunction), 
      { prefix:`${s3BucketPrefix}${tableName}/`, suffix: "" });

    this.deliveryStream = deliveryStream;
    this.table = glueTable;
  }
  grantPutRecord(role: iam.IRole) {
    role.addToPrincipalPolicy(iam.PolicyStatement.fromJson({
      Action: [
        "firehose:DeleteDeliveryStream",
        "firehose:PutRecord",
        "firehose:PutRecordBatch",
        "firehose:UpdateDestination"
      ],
      Resource: //[ `arn:aws:firehose:${scope.region}:${scope.account}:deliverystream/${deliveryStream.deliveryStreamName}`],
      [ this.deliveryStream.attrArn ],
      Effect: "Allow"
    }));
  }
}
