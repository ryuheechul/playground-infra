FROM public.ecr.aws/lambda/nodejs:16
WORKDIR /app

COPY ./update-record/package.json ./
COPY ./update-record/package-lock.json ./

RUN npm i
# https://kulshekhar.github.io/ts-jest/docs/getting-started/installation
RUN npm i --save-dev jest@28.1 typescript@4.8 ts-jest@28.0 @types/jest@29.0

COPY ./update-record/*.ts ./
COPY ./update-record/tests ./tests

# check if compiles before testing as that's not jest's concern
RUN npx ts-node *.ts

WORKDIR /app/tests

ENTRYPOINT ["./node_modules/jest/bin/jest.js", "--colors", "--silent", "--verbose"]
