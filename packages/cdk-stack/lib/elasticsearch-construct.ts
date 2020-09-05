import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
export interface ElasticSearchProps {
  /**
   * The vpc of cluster. 
   */
  vpc: ec2.Vpc;
  keyName: string;
}
export class ElasticSearch extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ElasticSearchProps) {
    super(scope, id);
    const {
      vpc,
      keyName,
    } = props;
    const instance = new ec2.Instance(this, 'ec2', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC, },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.NANO),
      machineImage: new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
      keyName, 
    });
    instance.addUserData(...[
      'yum update -y',
      'amazon-linux-extras install docker',
      'service docker start',
      'usermod -a -G docker ec2-user',
      'chkconfig docker on',
    ]);
    /*if(process.env.ALLOWED_CIDR)
      sshTunnel.connections.allowFrom(ec2.Peer.ipv4(process.env.ALLOWED_CIDR), ec2.Port.tcp(22));
    else*/
      instance.connections.allowFromAnyIpv4(ec2.Port.tcp(22));
    //database.cluster.connections.allowFrom(sshTunnel.connections, ec2.Port.tcp(database.cluster.clusterEndpoint.port));
  }
}
