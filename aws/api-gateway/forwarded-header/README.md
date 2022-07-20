# aws/api-gateway/forwarded-header
This is to prove/verify that [HTTP API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop.html#http-api-examples) does set [`Forwarded` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded) not [`X-Forwarded-For`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For).

## Prerequisites
[Install Earthly and its pre-requisites](https://earthly.dev/get-earthly)

## How to Run

`make deploy` to deploy to AWS via CDK - [will create simple gateway integrates with a url, `https://postman-echo.com/get`](./cdk/forwarded-header/lib/forwarded-header-stack.ts) and print the result of `diff` between direct call and via gateway.
