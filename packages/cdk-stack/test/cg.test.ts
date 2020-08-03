import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CdkStack from '../lib/cg-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  const stack = new CdkStack.CgStack(app, 'MyTestStack');
  expectCDK(stack).to(matchTemplate({
    "Resources": {}
  }, MatchStyle.EXACT))
});
