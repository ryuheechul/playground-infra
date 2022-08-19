import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { ProvideConnectionProps } from './db-client';

// an alternative way to consume db connection info rather than via environment variables
// this is more secure

export async function fetchDbInfo() {
  const region = process.env.AWS_REGION;
  const SecretId = process.env.DB_SECRET_ARN;

  const client = new SecretsManagerClient({ region });
  const command = new GetSecretValueCommand({ SecretId });
  const { SecretString } = await client.send(command);

  const {
    host,
    port,
    engine,
    dbname,
    username,
    password,
  } = JSON.parse(SecretString);

  return {
    host,
    port,
    engine,
    dbname,
    username,
    password,
  };
}

async function _provideConnectionProps() {
  const fetched = await fetchDbInfo();

  const {
    host,
    port,
    dbname: database,
    username: user,
    password,
  } = fetched;

  return {
    host,
    database,
    user,
    password,
    port,
  }
}

export const provideConnectionProps: ProvideConnectionProps = _provideConnectionProps;
