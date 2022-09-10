import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import { RestApi, HttpIntegration } from "aws-cdk-lib/aws-apigateway";
// because unfortunately `HttpApi` is not part of `aws-cdk-lib/aws-apigateway` yet - https://stackoverflow.com/a/70803845/1570165
import {
  HttpApi,
  HttpRoute,
  HttpRouteKey,
} from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpUrlIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

export class ForwardedHeaderStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const integration = new HttpUrlIntegration(
      'postman-echo',
      'https://postman-echo.com/get'
    );

    const api = new HttpApi(this, 'test-echo', {});

    new HttpRoute(this, 'default', {
      httpApi: api,
      integration,
      routeKey: HttpRouteKey.DEFAULT,
    });

    //// below is if it was to use `RestApi` instead
    //
    // const integration = new HttpIntegration('https://postman-echo.com/get');
    // const api = new RestApi(this, "test-echo");
    // api.root.addMethod('GET', integration);

    new CfnOutput(this, `ApiEndpoint`, {
      value: api.apiEndpoint,
    });
  }
}
