import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { CreateTable, HandleUpdate, GatewayForStepfunction } from './constructs';
import { CfnOutput } from 'aws-cdk-lib';

const { Duration } = cdk;
const { InstanceClass, InstanceSize } = ec2;

const postgresPort = 5432;

export class OneOffTasksStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      natGateways: 1,
      maxAzs: 2,
      cidr: '10.250.251.64/26',
      subnetConfiguration: [
        {
          name: 'PrivateWithNat',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        },
        // apparently without this will result in error below
        // Error: If you configure PRIVATE subnets in 'subnetConfiguration', you must also configure PUBLIC subnets to put the NAT gateways into (got [{"name":"private-with-nat","subnetType":"Private"}].
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ]
    });

    const databaseCredentialSecret = new secretsManager.Secret(
      this,
      'DbSecret',
      {
        secretName: 'DbCredentials',
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: 'postgres',
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: 'password',
        },
      }
    );

    const db = new rds.DatabaseCluster(
      this,
      'rds',
      {
        engine: rds.DatabaseClusterEngine.auroraPostgres({
          version: rds.AuroraPostgresEngineVersion.VER_14_3,
        }),
        instanceProps: {
          instanceType: ec2.InstanceType.of(
            InstanceClass.BURSTABLE4_GRAVITON,
            InstanceSize.MEDIUM,
          ),
          vpc,
        },
        defaultDatabaseName: 'OneOffTest',
        credentials: rds.Credentials.fromSecret(databaseCredentialSecret),
        storageEncrypted: false,
        deletionProtection: false,
        iamAuthentication: true,
        monitoringInterval: Duration.seconds(5),
        port: postgresPort,
      }
    );

    const ct = new CreateTable(this, 'CreateTable', {
      secret: databaseCredentialSecret,
      db,
      vpc,
    });
    ct.node.addDependency(db);

    const { stateMachine } = new HandleUpdate(this, 'HandleUpdate', {
      secret: databaseCredentialSecret,
      db,
      vpc,
    });

    const gw = new GatewayForStepfunction(this, 'GWForSF', stateMachine);

    new CfnOutput(this, 'ApiEndpoint', {
      value: gw.endpoint,
    });

    new CfnOutput(this, 'ApiKeyId', {
      value: gw.apiKeyId,
    });

    console.log('CDK TODOs: ', [
      '- [x] vpc',
      '- [x] secret for rds',
      '- [x] rds - postgresql',
      '- [x] secret to grant lambda to write access',
      '- [x] lambda for the step function to call',
      '- [x] grant lambda an access to database',
      '- [x] lambda to create table',
      '- [x] a way to programmatically trigger step function aka HTTP API',
      '- [x] forbid unauthorized access with API token',
    ]);
  }
}
