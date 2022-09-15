import { provideConnectionProps } from './db-info';
import { DBClient } from './db-client';
import { genCommands } from './crucial-commands';

interface Event {
  numberToChange: number;
}

export async function onEvent(event: Event) {
  console.info('Started with event: ', { event });

  const { numberToChange } = event;

  const client = new DBClient(await provideConnectionProps());
  const { update, healthCheck, provisionTable } = genCommands(client);

  // you may or may not need these calls in real app
  await healthCheck();

  // this actually should move to ../create-table if this was a real app, but it's ok for testing like this
  await provisionTable();

  return {
    numberAfterChange: await update(1, numberToChange),
  };
}
