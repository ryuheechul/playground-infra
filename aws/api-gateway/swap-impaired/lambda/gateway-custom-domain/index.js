const { onCreate, onNoop } = require('./handler');

const createHandler = ({ ResourceProperties: { DomainName, HostedZoneId } }) =>
  onCreate(DomainName, HostedZoneId);

const updateHandler = ({
  ResourceProperties: { DomainName, HostedZoneId },
  RequestType,
}) => onNoop(DomainName, HostedZoneId, RequestType);

const deleteHandler = ({
  ResourceProperties: { DomainName, HostedZoneId },
  RequestType,
}) => onNoop(DomainName, HostedZoneId, RequestType);

const eventHandlers = {
  Create: createHandler,
  Update: updateHandler,
  Delete: deleteHandler,
};

exports.onEvent = async (event) => {
  console.info('Started with event: ', { event });

  const eventHandler = eventHandlers[event.RequestType];

  if (!eventHandler) {
    throw new Error('Unsupported event received!');
  }

  return await eventHandler(event);
};
