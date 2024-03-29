import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdanodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

const { Duration, CustomResource, RemovalPolicy } = cdk;

const postgresPort = 5432;

interface HandlerProps {
  secret: secretsManager.ISecret;
  db: rds.IDatabaseCluster;
  vpc: ec2.IVpc;
}

export class CreateTable extends Construct {
  constructor(scope: Construct, id: string, { secret, db, vpc }: HandlerProps) {
    super(scope, id);

    const fn = createLambda(
      this,
      { secret, db, vpc },
      {
        lambdaPath: '../../../lambda/create-table',
        entryFilename: 'index.js',
      }
    );

    const provider = new cr.Provider(this, 'Provider', {
      onEventHandler: fn,
    });

    new CustomResource(this, 'CR', {
      serviceToken: provider.serviceToken,
    });
  }
}

export class HandleUpdate extends Construct {
  public stateMachine: sfn.IStateMachine;
  constructor(scope: Construct, id: string, { secret, db, vpc }: HandlerProps) {
    super(scope, id);

    const fn = createLambda(
      this,
      { secret, db, vpc },
      {
        lambdaPath: '../../../lambda/update-record',
        entryFilename: 'index.ts',
      }
    );

    secret.grantWrite(fn);

    // allowsTo actually handles `allowFrom` from the target so `db.connections.allowFrom(...` is not necessary
    // https://github.com/aws/aws-cdk/blob/v2.38.1/packages/@aws-cdk/aws-ec2/lib/connections.ts#L128
    fn.connections.allowTo(db, ec2.Port.tcp(postgresPort), `Lambda2Rds`);

    this.stateMachine = createStepFunction(this, fn);
  }
}

interface CreateLambdaProps {
  lambdaPath: string;
  entryFilename: string;
}

function createLambda(
  scope: Construct,
  { secret, vpc }: HandlerProps,
  { lambdaPath, entryFilename }: CreateLambdaProps
) {
  const atLambdaPath = (filename: string) =>
    path.join(__dirname, lambdaPath, filename);

  const depsLockFilePath = atLambdaPath('package-lock.json');
  const entry = atLambdaPath(entryFilename);

  const fn = new lambdanodejs.NodejsFunction(scope, 'Func', {
    role: new iam.Role(scope, 'RoleForFunc', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: ['service-role/AWSLambdaVPCAccessExecutionRole'].map(
        (polName) => iam.ManagedPolicy.fromAwsManagedPolicyName(polName)
      ),
      inlinePolicies: {
        fetchSecret: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'secretsmanager:GetResourcePolicy',
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret',
                'secretsmanager:ListSecretVersionIds',
              ],
              resources: [`${secret.secretArn}-??????`], // six '?' for generated suffix
            }),
          ],
        }),
      },
    }),
    runtime: lambda.Runtime.NODEJS_16_X,
    entry,
    depsLockFilePath,
    handler: 'onEvent',
    timeout: Duration.minutes(1),
    vpc,
    environment: {
      DB_SECRET_ARN: secret.secretArn,
    },
    bundling: {
      externalModules: ['aws-sdk', 'pg-native'],
    },
  });

  //// some how these cause issue of circula dependancy only with CreateTable - since it actually doesn't need these yet, comment out
  // fn.connections.allowTo(
  //   db,
  //   ec2.Port.tcp(postgresPort),
  //   `$Lambda2Rds`,
  // );
  // db.connections.allowFrom(fn, ec2.Port.tcp(postgresPort), `$Lambda2Rds`);
  //
  // secret.grantWrite(fn);

  return fn;
}

function createStepFunction(scope: Construct, fn: lambda.Function) {
  const readFromBody = new sfn.Pass(scope, 'Extract from body', {
    inputPath: '$.body',
  });

  const updateNumber = new tasks.LambdaInvoke(scope, 'updateNumber Job', {
    lambdaFunction: fn,
    payload: sfn.TaskInput.fromObject({
      numberToChange: sfn.JsonPath.stringAt('$.numberToChange'),
    }),
    // set lambda result path `$.Result.Payload` is where the return value will be
    resultPath: '$.Result',
    // to keep input as well
    outputPath: '$',
  });

  const jobFailed = new sfn.Fail(scope, 'Job Failed', {
    cause: 'AWS Batch Job Failed',
    error: 'DescribeJob returned FAILED',
  });

  const filterResult = new sfn.Pass(scope, 'Filter Result', {
    inputPath: '$.Result.Payload',
  });

  const finalStatus = filterResult.next(
    new sfn.Succeed(scope, 'Job Succeeded')
  );

  const definition = readFromBody
    .next(updateNumber)
    .next(
      new sfn.Choice(scope, 'Job Complete?')
        .when(
          sfn.Condition.numberEqualsJsonPath(
            '$.numberToChange',
            '$.Result.Payload.numberAfterChange'
          ),
          finalStatus
        )
        .otherwise(jobFailed)
    );

  const lg = new logs.LogGroup(scope, 'SFLG', {
    retention: logs.RetentionDays.ONE_WEEK,
    removalPolicy: RemovalPolicy.DESTROY,
  });

  return new sfn.StateMachine(scope, 'StateMachine', {
    definition,
    timeout: Duration.minutes(2),
    stateMachineType: sfn.StateMachineType.EXPRESS,
    logs: {
      destination: lg,
      // default is sfn.LogLevel.ERROR
      level: sfn.LogLevel.ALL, // to debug
    },
  });
}

export class GatewayForStepFunction extends Construct {
  public apiKeyId: string;
  public endpoint: string;
  constructor(scope: Construct, id: string, stateMachine: sfn.IStateMachine) {
    super(scope, id);

    const gw = new apigateway.StepFunctionsRestApi(
      this,
      'StepFunctionsRestApi',
      {
        deploy: true,
        stateMachine,
        headers: true,
      }
    );

    // use escape hatch - https://docs.aws.amazon.com/cdk/v2/guide/cfn_layer.html
    // to set ApiKeyRequired, otherwise anyone can access
    // because this is not provided as cdk L2 yet
    const method = gw.methods[0].node.defaultChild as apigateway.CfnMethod;
    method.addPropertyOverride('ApiKeyRequired', true);

    const apiKey = gw.addApiKey('bot', {
      apiKeyName: 'bot',
      description: 'for programmatical access',
    });

    // having no usage plan will result in forbiding even with api keys
    const usagePlan = gw.addUsagePlan('UsagePlan', {
      apiStages: [
        {
          api: gw,
          stage: gw.deploymentStage,
        },
      ],
    });

    // https://stackoverflow.com/a/39365110/1570165
    usagePlan.addApiKey(apiKey);

    this.apiKeyId = apiKey.keyId;
    this.endpoint = gw.url;
  }
}
