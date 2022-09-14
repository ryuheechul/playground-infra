# lambda

Core logics of this repo will live as lambda code.

Develop and test with referencing the directory structure below.

## Directory Structure
```bash
lambda/
├── update-record/   # works and gets packaged without any tests
│  ├── tests/
│  │  ├── jest.config.js        # jest config to make jest to work with typescript
│  │  ├── Dockerfile            # docker container for testing
│  │  ├── commands.test.ts      # actual test code
│  │  ├── commands-helper.ts
│  │  └── node_modules -> ../node_modules   # to satisfy ide/editor
│  ├── index.ts                 # lambda handler
│  ├── commands.ts              # core logics
│  ├── db-client.ts             # handles PostgreSQL
│  ├── db-info.ts               # handles RDS connection
│  ├── package-lock.json
│  └── package.json
├── [other-use-cases-as-lambda] # like `update-record` we can have more use cases later
│── docker-compose.yml          # to utilize postgres container for integration testing
├── Makefile                    # manual/shortcut commands for testing
└── README.md                   # this very file
```
