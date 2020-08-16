import boto3
import os
import json

s3 = boto3.client('s3')

bucket_name = os.environ['BUCKET_NAME']
object_key_prefix = 'service-data/'

def put(key, data):
    s3.put_object(Body=json.dumps(data).encode('utf-8'), Bucket=bucket_name, Key=object_key_prefix + key)

def get(key):
    obj = s3.get_object(Bucket=bucket_name, Key=object_key_prefix + key)
    return json.loads(obj['Body'].read())
