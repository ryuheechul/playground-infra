import {
  Duration,
  CustomResource,
  aws_logs as logs,
  aws_lambda as lambda,
  aws_iam as iam,
} from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import * as path from 'path';

export class DeleteAndVerify extends Construct {
  constructor(
    scope: Construct,
    id: string,
    domainName: string,
    hostedZoneId: string
  ) {
    super(scope, id);

    const lambdaPath = path.join(
      __dirname,
      '../../../lambda/gateway-custom-domain'
    );

    const fn = new lambda.Function(this, 'Function', {
      role: new iam.Role(this, `CRFuncCustomDomainRole`, {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          'service-role/AWSLambdaBasicExecutionRole',
          'AmazonAPIGatewayAdministrator',
          'AmazonRoute53FullAccess',
        ].map((polName) => iam.ManagedPolicy.fromAwsManagedPolicyName(polName)),
      }),
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.onEvent',
      code: lambda.Code.fromAsset(lambdaPath),
      timeout: Duration.minutes(5),
    });

    const provider = new cr.Provider(this, 'Provider', {
      onEventHandler: fn,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    new CustomResource(this, 'CR', {
      serviceToken: provider.serviceToken,
      properties: {
        DomainName: domainName,
        HostedZoneId: hostedZoneId,
      },
    });
  }
}
