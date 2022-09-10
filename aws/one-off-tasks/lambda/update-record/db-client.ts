import { Client, QueryResult, ClientConfig } from 'pg';

export interface ProvideConnectionProps {
  (): Promise<ClientConfig>;
}

export interface IDBClient {
  oneOff(queryStr: string): Promise<QueryResult>;
}

export class DBClient implements IDBClient {
  constructor(private provideConnectionProps: ProvideConnectionProps) {}

  // a quick abstraction on running query while managing connection is taken care of
  async oneOff(queryStr: string) {
    const client = new Client(await this.provideConnectionProps());

    client.connect();

    const res = await client.query(queryStr);
    await client.end();

    return res;
  }
}
