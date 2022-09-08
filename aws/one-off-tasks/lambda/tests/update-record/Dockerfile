FROM public.ecr.aws/lambda/nodejs:16
WORKDIR /app

COPY ./update-record/package.json ./
COPY ./update-record/package-lock.json ./

RUN npm i
# https://kulshekhar.github.io/ts-jest/docs/getting-started/installation
RUN npm i --save-dev jest@28.1 typescript@4.8 ts-jest@28.0 @types/jest@29.0

# testing targets
COPY ./update-record/db-client.ts ./
COPY ./update-record/crucial-commands.ts ./

# testing logics
COPY ./tests/update-record/jest.config.js ./
COPY ./tests/update-record/commands.test.ts ./

ENTRYPOINT ["./node_modules/jest/bin/jest.js", "--forceExit"]
