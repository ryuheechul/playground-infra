import {
  healthCheck,
  provisionTable,
  dropTable,
  update,
} from '../crucial-commands';
import { DBClient } from '../db-client';

async function expectNotToThrowError(fn: Promise<any>) {
  return expect(fn).resolves.not.toThrowError();
}

describe('crucial-commands module', () => {
  const client = new DBClient(async () => {
    return {
      port: 5432,
      host: 'postgres',
      user: 'postgres',
      password: 'postgres',
      database: 'postgres',
    };
  });

  beforeEach(async () => {
    await provisionTable(client);
  });

  afterEach(async () => {
    await dropTable(client);
  });

  test('update', async () => {
    await expectNotToThrowError(healthCheck(client));

    const numberToChange = 42;
    const result = await update(client, 1, numberToChange);

    expect(result).toBe(numberToChange);
  });
});
