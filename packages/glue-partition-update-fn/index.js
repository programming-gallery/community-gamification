const aws = require('aws-sdk');
const athena = new aws.Athena({apiVersion: '2017-05-18'});

exports.handler = async (event, context) => {
  const {PARTITION_KEY, TABLE, DATABASE, WORKGROUP} = process.env;
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  const match = new RegExp(`.*\/${PARTITION_KEY}=([^\/]+)`).exec(key);
  const directory = match[0] + "/";
  const partition_val = match[1];
  const location = `s3://${bucket}/${directory}`;
  const query_string = `ALTER TABLE ${TABLE} ADD IF NOT EXISTS PARTITION (${PARTITION_KEY}='${partition_val}') location '${location}'`;
  const res = athena.startQueryExecution({
    QueryString: query_string,
    QueryExecutionContext: {
      Database: DATABASE
    },
    WorkGroup: WORKGROUP
  }).promise();
  return res;
};
