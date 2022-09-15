import { genCommands } from '../crucial-commands';
import { DBClient } from '../db-client';

async function expectNotToThrowError(fn: Promise<any>) {
  return expect(fn).resolves.not.toThrowError();
}

const client = new DBClient({
  port: 5432,
  host: 'postgres',
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

const { update, healthCheck, provisionTable, dropTable } = genCommands(client);

describe('crucial-commands module', () => {
  beforeEach(async () => {
    await provisionTable();
  });

  afterEach(async () => {
    await dropTable();
  });

  test('update', async () => {
    await expectNotToThrowError(healthCheck());

    const numberToChange = 42;
    const result = await update(1, numberToChange);

    expect(result).toBe(numberToChange);
  });
});
