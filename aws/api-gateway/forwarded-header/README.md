# aws/api-gateway/forwarded-header
This is to prove/verify that [HTTP API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop.html#http-api-examples) does set [`Forwarded` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded) not [`X-Forwarded-For`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For).

_but somehow [Rest API Gateway seems to work differently than above](https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-develop.html) - this is testable by changing to use `RestApi` at [forwarded-header-stack.ts](./cdk/forwarded-header/lib/forwarded-header-stack.ts)_

_not to mention [Application Load Balancers supports `X-Forwarded-For`](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html#x-forwarded-for) not `Forwarded`..._

Just leanred that these findings above are [already discovered and explained well by someone](https://medium.com/@lancers/amazon-api-gateway-explaining-http-proxy-in-http-api-3ea0afe6b03c#:~:text=Unfortunately%2C%20there%20is%20downside.%20Between%20API%20Gateway%20and%20your%20backend%2C%20if%20there%20is%20an%20intermediary%20(e.g.%20LoadBalancer)%20which%20does%20not%20understand%20Via%20header%2C%20it%20will%20end%20up%20with%20adding%20XFF%20header.).

## Prerequisites
[Install Earthly and its pre-requisites](https://earthly.dev/get-earthly)

## How to Run

`make deploy` to deploy to AWS via CDK - [will create simple gateway integrates with a url, `https://postman-echo.com/get`](./cdk/forwarded-header/lib/forwarded-header-stack.ts) and print the result of `diff` between direct call and via gateway.

The result will be similar to below.

```diff
diff --git a/direct-echo.json b/echo-via-gateway.json
index a995786..f446eeb 100644
--- a/direct-echo.json
+++ b/echo-via-gateway.json
@@ -4,8 +4,9 @@
     "x-forwarded-proto": "https",
     "x-forwarded-port": "443",
     "host": "postman-echo.com",
@@ -17,8 +18,8 @@
     "sec-fetch-dest": "document",
     "accept-encoding": "gzip, deflate, br",
     "accept-language": "en-US,en;q=0.9,ko;q=0.8",
+    "forwarded": "by=x.xx.xxx.xxx;for=xx.xx.xx.xx;host=xxxxxxxxxx.execute-api.yy-yyyyyyy-1.amazonaws.com;proto=https",
+    "via": "HTTP/1.1 AmazonAPIGateway"
   },
   "url": "https://postman-echo.com/get/"
 }
```

## Clean Up

`make destroy`
