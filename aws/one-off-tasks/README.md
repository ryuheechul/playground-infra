# aws/one-off-tasks
An example stack for using AWS Step Functions and expose it via API Gateway to maintain "one-off" tasks.
It could be something that helps tests, or it could a "micro-admin" feature.

This way could help maintain a separation (of codebase and deploy unit) between:
- features that everyday users to use
- "chore" tasks needs to be executed internally (whether that bot is doing it or human is doing it)
## Prerequisites
[Install Earthly and its pre-requisites](https://earthly.dev/get-earthly)

## How to Run

`make deploy` to deploy to AWS via CDK and also test if it functions properly

If you see the result as below, it works

```bash
{"numberToChange":42,"numberAfterChange":42}
```

## Clean Up

`make destroy`
