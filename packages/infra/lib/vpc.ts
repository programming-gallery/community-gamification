import { Construct, ConstructOptions } from 'constructs';
import { TerraformResource  } from 'cdktf';
import { Vpc as AwsVpc, InternetGateway, Subnet, RouteTable, RouteTableAssociation } from '../.gen/providers/aws';

export interface Props extends ConstructOptions {
  tags?: { [key:string]: string },
}

function tagNaming(scope: { toString() => string, tags: { [key: string]: string } | undefined, }) {
  scope.addOverride('tags', Object.assign({
    Name: scope.toString(),
  }, scope.tags));
}

export class Vpc extends Construct {
  readonly publicSubnets: Subnet[];
  readonly vpc: AwsVpc;
  constructor(scope: Construct, name: string, props: Props) {
    super(scope, name);

    this.publicSubnets = [];

    const region = new DataAwsRegion(scope, 'CurrentRegion').name;

    const vpc = new AwsVpc(this, 'Vpc', {
      enableDnsSupport: true,
      enableDnsHostnames: true,
      cidrBlock: '10.0.0.0/16',
    });
    this.vpc = vpc;

    const igw = new InternetGateway(this, 'Igw', {
      vpcId: vpc.id!, 
    });

    const publicSubnet = new Subnet(this, 'PublicSubnet', {
      vpcId: vpc.id!,
      cidrBlock: '10.0.101.0/24',
      mapPublicIpOnLaunch: true,
      availability_zone: `${region}a`
    });
    publicSubnets.push(publicSubnet);

    const routeTable = new RouteTable(this, 'RouteTable', {
      vpcId: vpc.id!,
      route: {
        cidrBock: '0.0.0.0/0',
        gatewayId: igw.id,
      }
    });

    const routeTableAssociation = new RouteTableAssociation(this, 'RouteTableAssociation', {
      subnetId: publicSubnet.id,
      routeTableId: routeTable.id,
    });
  }
}
