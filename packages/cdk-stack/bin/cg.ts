#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CgStack } from '../lib/cg-stack';

const app = new cdk.App();
new CgStack(app, 'CgDev');
