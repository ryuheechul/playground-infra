import { provideConnectionProps } from './db-info'
import { DBClient } from './db-client'
import { update, healthCheck, provisionTable } from './crucial-commands'

export async function onEvent(event) {
  console.info('Started with event: ', { event });

  const { numberToChange } = event;

  const client = new DBClient(provideConnectionProps);

  // you may or may not need these calls in real app
  await healthCheck(client);

  // this actually should move to ../create-table if this was a real app, but it's ok for testing like this
  await provisionTable(client);

  return {
    numberToChange,
    numberAfterChange: await update(client, 1, numberToChange),
  };
}
