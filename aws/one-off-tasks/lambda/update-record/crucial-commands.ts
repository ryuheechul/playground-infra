import { IDBClient } from './db-client'

// quite a trivial interaction with Postgresql but still all calls are real
// this is to daemonstrate the capabilities of db CRUD within Lambda
// now anything is possible with proper SQL

async function doesTableExist(client: IDBClient) {
  const res = await client.oneOff("SELECT EXISTS ( SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'my_numbers');");

  console.info('does table exist', res);

  const { exists } = res.rows[0];

  return exists
}

export async function dropTable(client: IDBClient) {
  const res = await client.oneOff('DROP TABLE IF EXISTS my_numbers;');

  console.info('drop table', res);
}

async function createTable(client: IDBClient) {
  const res = await client.oneOff('CREATE TABLE my_numbers ( id serial PRIMARY KEY, my_int_col integer );');

  console.info('create table', res);
}

async function insertRow(client: IDBClient, id: number, value: number) {
  const res = await client.oneOff(`INSERT INTO my_numbers VALUES (${id}, ${value});`);

  console.info('insert row', res);
}

async function selectAll(client: IDBClient) {
  const res = await client.oneOff(`SELECT * FROM my_numbers;`);

  console.info('select all', res);
}

async function select(client: IDBClient, id: number) {
  const res = await client.oneOff(`SELECT my_int_col FROM my_numbers WHERE id = ${id};`);

  console.info('select', res);
  return res;
}

export async function update(client: IDBClient, id: number, value: number) {
  let res = await client.oneOff(`UPDATE my_numbers SET my_int_col = ${value} where id = ${id};`);

  console.info('update', res);

  res = await select(client, id);

  return res.rows[0].my_int_col
}

export async function healthCheck(client: IDBClient) {
  const res = await client.oneOff('SELECT NOW() as now');

  console.log('connectivity check', res.rows[0]);
}

// to make database idempotent for convinience to assist faster development
export async function provisionTable(client: IDBClient) {
  // just for debugging
  await dropTable(client);

  // this shold be move to custom resource
  if (!(await doesTableExist(client))) {
    await createTable(client);
    await insertRow(client, 1, 99);
  }

  // just for debugging
  await selectAll(client);
}
