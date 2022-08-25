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
      cidr: '10.250.251.128/26',
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

    const dbCluster = new rds.DatabaseCluster(
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

    const useReferences: boolean = true;
    // use below if you want to test with no references
    // const useReferences: boolean = false;

    const { db, secret } = getRDSHandles(this, useReferences, dbCluster, databaseCredentialSecret);

    const ct = new CreateTable(this, 'CreateTable', {
      secret,
      db,
      vpc,
    });
    ct.node.addDependency(db);

    const { stateMachine } = new HandleUpdate(this, 'HandleUpdate', {
      secret,
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
      // to simulate non-direct ownership over rds and secret by not providing the real ones directly
      '- [x] optional references to rds and secret',
      '- [x] secret to grant lambda to write access',
      '- [x] lambda for the step function to call',
      '- [x] grant lambda an access to database',
      '- [x] lambda to create table',
      '- [x] a way to programmatically trigger step function aka HTTP API',
      '- [x] forbid unauthorized access with API token',
    ]);
  }
}

// this function allows to test both direct handles or imported ones
function getRDSHandles(scope: Construct, useReferences: boolean, actualDB: rds.IDatabaseCluster, actualSecret: secretsManager.ISecret) {
  if (!useReferences) {
    return {
      db: actualDB,
      secret: actualSecret,
    }
  }

  const clusterRef = rds.DatabaseCluster.fromDatabaseClusterAttributes(scope, 'RDSReference', {
    clusterIdentifier: actualDB.clusterIdentifier,
    // otherwise it would not work - more on that, https://github.com/aws/aws-cdk/issues/12140#issuecomment-747609208
    // so this means, when referencing a cluster, finding and providing securityGroups are important
    securityGroups: actualDB.connections.securityGroups,
  });

  const db = clusterRef;
  const secret = secretsManager.Secret.fromSecretNameV2(scope, 'DBSecretRef', actualSecret.secretName);

  return { db, secret };
}
