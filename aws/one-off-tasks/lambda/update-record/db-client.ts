import { Client, QueryResult, ClientConfig } from 'pg';

export interface IDBClient {
  oneOff(queryStr: string): Promise<QueryResult>;
}

/**
 * DBClient.
 *
 * @implements {IDBClient}
 */
export class DBClient implements IDBClient {
  constructor(private config: ClientConfig) {}

  /**
   * a quick abstraction on running query while managing connection is taken care of
   *
   * @param queryStr -
   */
  async oneOff(queryStr: string) {
    const client = new Client(this.config);

    client.connect();

    const res = await client.query(queryStr);
    await client.end();

    return res;
  }
}
