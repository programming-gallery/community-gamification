import { Construct } from 'constructs';
import { DataAwsRegion, EcrRepository } from '@cdktf/provider-aws';
import * as Null from '@cdktf/provider-null';
import * as hashdirectory from 'hashdirectory';
import { paramCase } from 'change-case';

export interface EcrAssetConfig {
  readonly folder: string;
}

export class EcrAsset extends Construct {
  public readonly ecrRepository: EcrRepository;

  constructor(scope: Construct, name: string, config: EcrAssetConfig) {
    super(scope, name);

    const { folder } = config;

    const compatibleName = paramCase(name);

    this.ecrRepository = new EcrRepository(this, 'DockerAsset', {
      name: compatibleName,
    });

    const buildAndPush = new Null.Resource(this, 'BuildAndPush', {
      dependsOn: [this.ecrRepository],
      triggers: {
        folderhash: hashdirectory.sync(folder),
      },
    });

    const imageName = this.ecrRepository.repositoryUrl;
    // needs AWS CLI v2 - Should add a check for presence or provide Docker container for building
    const command = `
      aws ecr get-login-password --region ${new DataAwsRegion(scope, 'CurrentRegion').name} |
      docker login --username AWS --password-stdin ${imageName} &&
      cd ${folder} && docker build -t ${imageName} . &&
      docker push ${imageName}
    `;
    buildAndPush.addOverride('provisioner.local-exec.command', command);
  }
}
