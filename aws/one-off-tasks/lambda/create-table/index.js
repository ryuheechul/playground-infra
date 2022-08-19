// this actually does nothing since `../update-record` actually creates table as well
// but this is where you can move the logic if you wanted to run it at this stage (right after rds has been created)
// instead of every execution of the update handling

const onNoop = async (requestType) => {
  console.info(`Noop on ${requestType}`);

  return {
    PhysicalResourceId: 'noop'
  };
};

const createHandler = ({
  RequestType,
}) => onNoop(RequestType);

const updateHandler = ({
  RequestType,
}) => onNoop(RequestType);

const deleteHandler = ({
  RequestType,
}) => onNoop(RequestType);

const eventHandlers = {
  Create: createHandler,
  Update: updateHandler,
  Delete: deleteHandler,
}

exports.onEvent = async (event) => {
  console.info('Started with event: ', { event });

  const eventHandler = eventHandlers[event.RequestType];

  if (!eventHandler) {
    throw new Error('Unsupported event received!');
  }

  return await eventHandler(event);
}
