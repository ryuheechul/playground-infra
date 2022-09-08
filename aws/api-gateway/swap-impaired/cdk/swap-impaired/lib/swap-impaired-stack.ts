import { Stack, StackProps, CfnOutput, aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GatewayToFargate } from './gateway-to-fargate';

enum Branch {
  Naive = 'naive',
  Surgery = 'surgery',
  LinkSwap = 'linkswap',
  // this can be used to start over without having to delete other resources like VPC
  // look at `make deploy-reset`
  Reset = 'reset',
}

enum StageForNaive {
  Stage_0_StartWithPort3000 = 0,
  Stage_1_ChangePortTo80,
}

enum StageForLinkSwap {
  Stage_0_StartWithPort3000 = 0,
  Stage_1_ChangePortTo80,
}

enum StageForSurgery {
  Stage_0_StartWithPort3000 = 0,
  Stage_1_Prepare,
  Stage_2_FreeResource,
  Stage_3_ChangeToNew,
  Stage_4_RemoveOld,
  /// this is the manual human step to remove all extra logic for surgery after successful migration
  // Stage_5_GetRidOfExtraLogic,
}

export class SwapImpairedStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const branch: Branch = this.node.tryGetContext('branch');
    console.info(
      'Given context:\n',
      { branch, stage: this.node.tryGetContext('stage') }
    );

    const vpc = new ec2.Vpc(this, 'VPC', {
      natGateways: 1,
      maxAzs: 2,
      // change this if this conflicts with existing VPC - bits must be 25 or lower un this example though
      cidr: '10.250.251.0/25',
      subnetConfiguration: [
        {
          name: 'private-with-nat',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        },
        // apparently without this will result in error below
        // Error: If you configure PRIVATE subnets in 'subnetConfiguration', you must also configure PUBLIC subnets to put the NAT gateways into (got [{"name":"private-with-nat","subnetType":"Private"}].
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ]
    });

    const self = this;

    const divergeWith = {
      [Branch.Reset]: () => self.onResetBranch(),
      [Branch.Naive]: () => self.onNaiveBranch(vpc),
      [Branch.LinkSwap]: () => self.onLinkSwapBranch(vpc),
      [Branch.Surgery]: () => self.onSurgeryBranch(vpc),
    }

    // so we can deploy each branch at a time
    divergeWith[branch]();
  }

  onResetBranch() {
    console.log('do nothing from here to cause the effect of "reset" by destorying partial resources');
  }

  // to daemonstrate that unfortunately, this approach result in 503
  onNaiveBranch(vpc: ec2.Vpc) {
    const stage: StageForNaive = this.node.tryGetContext('stage');

    const {
      Stage_0_StartWithPort3000,
      Stage_1_ChangePortTo80,
    } = StageForNaive;

    const port = {
      [Stage_0_StartWithPort3000]: '3000',
      [Stage_1_ChangePortTo80]: '80',
    }[stage];

    const gatewayToFargate = new GatewayToFargate(this, 'ToMutate', {
      vpc,
      port,
    });

    new CfnOutput(this, 'ApiEndpoint', {
      value: gatewayToFargate.apiEndpoint,
    });
  }

  // basically naive but also swap the vpc link at the same time when changing port
  onLinkSwapBranch(vpc: ec2.Vpc) {
    const stage: StageForLinkSwap = this.node.tryGetContext('stage');

    const {
      Stage_0_StartWithPort3000,
      Stage_1_ChangePortTo80,
    } = StageForLinkSwap;

    const { port, specifyVpcLink } = {
      [Stage_0_StartWithPort3000]: {
        port: '3000',
        specifyVpcLink: false
      },
      [Stage_1_ChangePortTo80]: {
        port: '80',
        specifyVpcLink: true
      },
    }[stage];

    const gatewayToFargate = new GatewayToFargate(this, 'ToMutate', {
      vpc,
      port,
      specifyVpcLink,
    });

    new CfnOutput(this, 'ApiEndpoint', {
      value: gatewayToFargate.apiEndpoint,
    });
  }

  // somewhat complex but automated approach of replacing API Gateway
  // without causing CDK to lost track of resources
  onSurgeryBranch(vpc: ec2.Vpc) {
    const {
      Stage_0_StartWithPort3000 = 0,
      Stage_1_Prepare,
      Stage_2_FreeResource,
      Stage_3_ChangeToNew,
      Stage_4_RemoveOld,
    } = StageForSurgery;

    const stage: StageForSurgery = this.node.tryGetContext('stage');

    let oldGW: GatewayToFargate;
    let newGW: GatewayToFargate;

    // this old one will evolve into stages to retire
    if (stage < Stage_4_RemoveOld) {
      oldGW = new GatewayToFargate(this, 'Old', {
        vpc,
        port: '3000',
        // we will need to retain the resource of the old one on removal in order to have the least down time
        // but this comes with the cost having to delete them manually later
        shouldRetainGatewayOnRemoval: true,
        isTimeToReleaseDomain: stage >= Stage_2_FreeResource,
      });
    }

    // this new one will evolve into stages to take over
    if (stage >= Stage_1_Prepare) {
      newGW = new GatewayToFargate(this, 'New', {
        vpc,
        port: '80',
        // wait until the right time to create aPIDomain and aRecord
        skipHavingDomain: stage < Stage_3_ChangeToNew,
        needToDeleteOldDomainFirst: true,
      });
    }

    let gatewayToFargate: GatewayToFargate = {
      [Stage_0_StartWithPort3000]: oldGW!,
      [Stage_1_Prepare]: oldGW!,
      [Stage_2_FreeResource]: oldGW!,
      [Stage_3_ChangeToNew]: newGW!,
      [Stage_4_RemoveOld]: newGW!,
    }[stage];

    new CfnOutput(this, 'ApiEndpoint', {
      value: gatewayToFargate.apiEndpoint,
    });
  }
}
