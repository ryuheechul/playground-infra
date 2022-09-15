import { IDBClient } from './db-client';

/**
 * Quite a trivial interaction with Postgresql but still all calls are real.
 * This is to daemonstrate the capabilities of db CRUD within Lambda.
 * Now anything is possible with proper SQL.
 *
 * @param client -
 */
export function genCommands(client: IDBClient) {
  /**
   * Return true if table exist.
   */
  async function doesTableExist() {
    const res = await client.oneOff(
      "SELECT EXISTS ( SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'my_numbers');"
    );

    console.info('does table exist', res);

    const { exists } = res.rows[0];

    return exists;
  }

  /**
   * Creates table.
   */
  async function createTable() {
    const res = await client.oneOff(
      'CREATE TABLE my_numbers ( id serial PRIMARY KEY, my_int_col integer );'
    );

    console.info('create table', res);
  }

  /**
   * Inserts a row with given value.
   *
   * @param id - primary key for the row
   * @param value - a number
   */
  async function insertRow(id: number, value: number) {
    const res = await client.oneOff(
      `INSERT INTO my_numbers VALUES (${id}, ${value});`
    );

    console.info('insert row', res);
  }

  /**
   * Selects all from my_numbers table.
   */
  async function selectAll() {
    const res = await client.oneOff(`SELECT * FROM my_numbers;`);

    console.info('select all', res);
  }

  /**
   * Select with given id.
   *
   * @param id - primary key
   */
  async function select(id: number) {
    const res = await client.oneOff(
      `SELECT my_int_col FROM my_numbers WHERE id = ${id};`
    );

    console.info('select', res);
    return res;
  }

  /**
   * Drops table.
   */
  async function dropTable() {
    const res = await client.oneOff('DROP TABLE IF EXISTS my_numbers;');

    console.info('drop table', res);
  }

  /**
   * Updates value.
   *
   * @param id - primary key
   * @param value - a number value
   */
  async function update(id: number, value: number) {
    let res = await client.oneOff(
      `UPDATE my_numbers SET my_int_col = ${value} where id = ${id};`
    );

    console.info('update', res);

    res = await select(id);

    return res.rows[0].my_int_col;
  }

  /**
   * Check connectivity with database.
   */
  async function healthCheck() {
    const res = await client.oneOff('SELECT NOW() as now');

    console.log('connectivity check', res.rows[0]);
  }

  // to make database idempotent for convinience to assist faster development
  /**
   * "Reset" table.
   */
  async function provisionTable() {
    // just for debugging
    await dropTable();

    // this shold be move to custom resource
    if (!(await doesTableExist())) {
      await createTable();
      await insertRow(1, 99);
    }

    // just for debugging
    await selectAll();
  }

  return {
    dropTable,
    update,
    healthCheck,
    provisionTable,
  };
}
