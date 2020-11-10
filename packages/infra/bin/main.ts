import { App, TerraformStack, S3Backend, DataTerraformRemoteStateS3 } from 'cdktf';
//import { DataAwsRegion, EcrRepository } from '@cdktf/provider-aws';
import { Stack } from '../lib/stack';
require('dotenv').config({ path: __dirname + '/../../.env' })
const { S3_BACKEND_BUCKET, REGION, } = process.env;

const name = 'Cg';

const app = new App();

let env = 'Stage';
const stageStack = new Stack(app, `${name}${env}`, {
  region: REGION!,
  forceDestroy: true,
  tags: {
    Terraform: 'true',
    Enviroment: env,
  }
});
new S3Backend(stageStack, {
  bucket: S3_BACKEND_BUCKET!,
  region: REGION!,
  key: `${name}/${env}`
});

app.synth();
