import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

import { ClientConfig } from 'pg';

interface DatabaseInfo {
  host: string;
  port: number;
  engine: string;
  username: string;
  dbname: string;
  password: string;
}

/**
 * An alternative way to consume db connection info rather than via environment variables.
 * This way is more secure than receiving from env vars.
 *
 * @returns Promise<DatabaseInfo>
 */
export async function fetchDbInfo(): Promise<DatabaseInfo> {
  const region = process.env.AWS_REGION;
  const SecretId = process.env.DB_SECRET_ARN;

  const client = new SecretsManagerClient({ region });
  const command = new GetSecretValueCommand({ SecretId });
  const { SecretString } = await client.send(command);

  if (!SecretString) {
    throw 'SecretString is not fetched';
  }

  const { host, port, engine, dbname, username, password } =
    JSON.parse(SecretString);

  return {
    host,
    port,
    engine,
    dbname,
    username,
    password,
  };
}

/**
 * Turns DatabaseInfo into ClientConfig
 *
 * @returns Promise<ClientConfig>
 */
export async function provideConnectionProps(): Promise<ClientConfig> {
  const fetched = await fetchDbInfo();

  const { host, port, dbname: database, username: user, password } = fetched;

  return {
    host,
    database,
    user,
    password,
    port,
  };
}
