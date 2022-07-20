# aws/api-gateway/forwarded-header
This is to prove/verify that [HTTP API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop.html#http-api-examples) does set [`Forwarded` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded) not [`X-Forwarded-For`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For).

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
