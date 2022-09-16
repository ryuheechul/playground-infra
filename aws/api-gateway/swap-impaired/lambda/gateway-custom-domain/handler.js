// warning: there is no guarantee that this version will stay same
// 2.1055.0 is the version of `aws-sdk` at the time of development
const { waitUntilGone } = require('./apiGatewayCustomDomain');
const { justDeleteInsteadOfWaiting } = require('./domainName');

// basically ten minutes (60 * 10) of timeout
const maxRetry = 60;
const intervalS = 10;

const genPhysicalResourceId = (domainName) => `absence-of-${domainName}`;

exports.onCreate = async (domainName, hostedZoneId) => {
  console.info(`looking to verify '${domainName}' is not gone in API Gateway.`);

  try {
    await justDeleteInsteadOfWaiting(domainName, hostedZoneId);
  } catch (_e) {
    // just prevent exceptions
    // do nothing
  }

  // use this to double check things are deleted
  const isDomainDeleted = await waitUntilGone(domainName, maxRetry, intervalS);

  if (!isDomainDeleted) {
    throw new Error('Waiting to verify the absence of domain name timed out.');
  }

  console.info(`Success: ${domainName} detected to be absent in custom domain`);

  return {
    PhysicalResourceId: genPhysicalResourceId(domainName),
  };
};

exports.onNoop = async (domainName, hostedZoneId, requestType) => {
  console.info(`Noop on ${requestType}`);

  return {
    PhysicalResourceId: genPhysicalResourceId(domainName),
  };
};
