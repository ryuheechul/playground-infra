import * as apiGateway from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpAlbIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Duration, NestedStack, Stack, RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { Protocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { DeleteAndVerify } from './delete-and-verify';

export interface GatewayToFargateProps {
  vpc: ec2.IVpc;
  port: string;
  shouldRetainGatewayOnRemoval?: boolean;
  isTimeToReleaseDomain?: boolean;
  skipHavingDomain?: boolean;
  needToDeleteOldDomainFirst?: boolean;
  specifyVpcLink?: boolean;
}

interface LoadbalancedECSProps {
  vpc: ec2.IVpc;
  port: string;
}

interface RouteMappedAPIGatewayProps {
  alb: ApplicationLoadBalancedFargateService;
  shouldRetainOnRemoval: boolean;
  isTimeToReleaseDomain: boolean;
  skipHavingDomain: boolean;
  needToDeleteOldDomainFirst: boolean;
  specifyVpcLink: boolean;
}

// using NestedStack to group (deployment unit of) two high level constructs together
export class GatewayToFargate extends NestedStack {
  public readonly apiEndpoint: string;
  constructor(scope: Construct, id: string, props: GatewayToFargateProps) {
    super(scope, id);

    const { vpc, port } = props;

    const shouldRetainOnRemoval = props.shouldRetainGatewayOnRemoval || false;
    const isTimeToReleaseDomain = props.isTimeToReleaseDomain || false;
    const skipHavingDomain = props.skipHavingDomain || false;
    const needToDeleteOldDomainFirst =
      props.needToDeleteOldDomainFirst || false;
    const specifyVpcLink = props.specifyVpcLink || false;

    const ecs = new LoadbalancedECS(this, 'ECS', {
      vpc,
      port,
    });

    const gateway = new RouteMappedAPIGateway(this, `${id}-Gateway`, {
      alb: ecs.alb,
      shouldRetainOnRemoval,
      isTimeToReleaseDomain,
      skipHavingDomain,
      needToDeleteOldDomainFirst,
      specifyVpcLink,
    });

    this.apiEndpoint = gateway.apiEndpoint;
  }
}

export class LoadbalancedECS extends Construct {
  public readonly alb: ApplicationLoadBalancedFargateService;
  constructor(scope: Construct, id: string, props: LoadbalancedECSProps) {
    super(scope, id);

    const { vpc, port } = props;

    const portAsNum = +port;

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    const alb = new ApplicationLoadBalancedFargateService(this, 'ALBFargate', {
      cluster: cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      healthCheckGracePeriod: Duration.seconds(300),
      listenerPort: portAsNum,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('jmalloc/echo-server'),
        containerPort: portAsNum,
        environment: {
          PORT: port,
        },
      },
      publicLoadBalancer: false,
      maxHealthyPercent: 200,
      minHealthyPercent: 50,
    });

    alb.targetGroup.configureHealthCheck({
      protocol: Protocol.HTTP,
      path: '/health',
      port: port,
    });

    this.alb = alb;
  }
}

interface ResultOfHandleUsageOfDomain {
  shouldStopProgressing: boolean;
  defaultDomainMapping: apiGateway.DomainMappingOptions | undefined;
}

export class RouteMappedAPIGateway extends Construct {
  public readonly apiEndpoint: string;

  constructor(scope: Construct, id: string, props: RouteMappedAPIGatewayProps) {
    super(scope, id);

    const {
      alb,
      shouldRetainOnRemoval,
      isTimeToReleaseDomain,
      skipHavingDomain,
      needToDeleteOldDomainFirst,
      specifyVpcLink,
    } = props;

    const { shouldStopProgressing, defaultDomainMapping } =
      this.HandleUsageOfDomain(
        shouldRetainOnRemoval,
        isTimeToReleaseDomain,
        skipHavingDomain,
        needToDeleteOldDomainFirst
      );

    // after this RemovalPolicy.RETAIN will make sure resources are stop being tracked by CDK but still exists
    if (shouldStopProgressing) {
      this.apiEndpoint =
        'http://skip.getting.domain-name.because.difficult.to.set.at.this.stage';
      return;
    }

    const apiGatewayHttp = new apiGateway.HttpApi(
      this,
      `GatewayPortChangeTest-${id}`,
      {
        defaultDomainMapping,
        corsPreflight: {
          allowHeaders: [
            'Cookie',
            'Content-Type',
            'If-Modified-Since',
            'Cache-Control',
            'Pragma',
          ],
          allowMethods: [
            apiGateway.CorsHttpMethod.GET,
            apiGateway.CorsHttpMethod.POST,
            apiGateway.CorsHttpMethod.PUT,
            apiGateway.CorsHttpMethod.PATCH,
            apiGateway.CorsHttpMethod.DELETE,
            apiGateway.CorsHttpMethod.HEAD,
            apiGateway.CorsHttpMethod.OPTIONS,
          ],
          allowCredentials: true,
        },
      }
    );

    if (!alb.loadBalancer.vpc) {
      throw 'vpc not found';
    }

    let vpcLink = undefined;

    if (specifyVpcLink) {
      vpcLink = new apiGateway.VpcLink(this, 'link', {
        vpc: alb.loadBalancer.vpc,
      });
    }

    const integration = new HttpAlbIntegration(
      apiGatewayHttp.node.id,
      alb.listener,
      {
        vpcLink,
      }
    );

    const routeOption = new apiGateway.HttpRoute(this, 'OptionsNoAuthoriser', {
      httpApi: apiGatewayHttp,
      integration: integration,
      routeKey: apiGateway.HttpRouteKey.with(
        '/{proxy+}',
        apiGateway.HttpMethod.OPTIONS
      ),
    });

    const routeDefault = new apiGateway.HttpRoute(this, 'DefaultNoAuthorizer', {
      httpApi: apiGatewayHttp,
      integration: integration,
      routeKey: apiGateway.HttpRouteKey.DEFAULT,
    });

    if (shouldRetainOnRemoval) {
      apiGatewayHttp.applyRemovalPolicy(RemovalPolicy.RETAIN);
      routeOption.applyRemovalPolicy(RemovalPolicy.RETAIN);
      routeDefault.applyRemovalPolicy(RemovalPolicy.RETAIN);

      /// the below is not possible and ultimately probably taken care by gateway itself
      /// it will still cause error message on retaining though but it will still succeed in the end
      // integration.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }

    this.apiEndpoint = apiGatewayHttp.apiEndpoint;
  }

  // because this supports multiple scenario, the logic here is quite complex
  // so it's spun out as a separate function
  //
  // in case the surgery is done scenario, this function will be much simpler without all branching logics
  // and that should resemble both the initial version (with 3000 port) and the final version
  HandleUsageOfDomain(
    shouldRetainOnRemoval: boolean,
    isTimeToReleaseDomain: boolean,
    skipHavingDomain: boolean,
    needToDeleteOldDomainFirst: boolean
  ): ResultOfHandleUsageOfDomain {
    // keep this to `false` unless you really want to test with custom domain
    // because we are not using Certficate, apiGateway.DomainName, route53.ARecord for this example to avoid "unnecessary" dependency having to own a domain
    // but in real use case this will be there to add complexity on swapping
    const involveDomain = false;

    if (!involveDomain) {
      return {
        shouldStopProgressing: isTimeToReleaseDomain ? true : false,
        defaultDomainMapping: undefined,
      };
    }

    const domainName = 'your-domain.com';
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });

    const region = Stack.of(this).region;

    // unlike apiDomain and aRecord, this takes time
    // and no possibility to conflict with other cert with same domain name
    // so create early on looser conditions
    const certificate = new acm.DnsValidatedCertificate(this, 'Cert', {
      domainName,
      hostedZone,
      region,
    });

    // after this RemovalPolicy.RETAIN will make sure resources are stop being tracked by CDK but still exists
    if (isTimeToReleaseDomain) {
      return {
        shouldStopProgressing: true,
        defaultDomainMapping: undefined,
      };
    }

    if (skipHavingDomain) {
      return {
        shouldStopProgressing: false,
        defaultDomainMapping: undefined,
      };
    }

    const apiDomain = new apiGateway.DomainName(this, 'APIDomain', {
      certificate,
      domainName,
    });

    const aRecord = new route53.ARecord(this, 'ARecord', {
      zone: hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new ApiGatewayv2DomainProperties(
          apiDomain.regionalDomainName,
          apiDomain.regionalHostedZoneId
        )
      ),
    });

    if (shouldRetainOnRemoval) {
      apiDomain.applyRemovalPolicy(RemovalPolicy.RETAIN);
      aRecord.applyRemovalPolicy(RemovalPolicy.RETAIN);
    }

    if (needToDeleteOldDomainFirst) {
      const dav = new DeleteAndVerify(
        this,
        'DAV',
        domainName,
        hostedZone.hostedZoneId
      );

      apiDomain.node.addDependency(dav);
    }

    return {
      shouldStopProgressing: false,
      defaultDomainMapping: {
        domainName: apiDomain,
      },
    };
  }
}
