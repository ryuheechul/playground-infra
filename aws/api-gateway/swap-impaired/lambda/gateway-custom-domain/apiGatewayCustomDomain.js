// warning: there is no guarantee that this version will stay same
// 2.1055.0 is the version of `aws-sdk` at the time of development
const aws = require('aws-sdk');
const util = require('util');

const apigatewayv2 = new aws.ApiGatewayV2();

const getDomainNames = util.promisify(
  apigatewayv2.getDomainNames.bind(apigatewayv2)
);

const _delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function isTargetAbsent(target) {
  const domainNames = (await getDomainNames())
    .Items
    .map(({ DomainName }) => DomainName);

  const filtered = domainNames.filter(domain => domain === target);

  return filtered.length === 0;
}

// return value
// true: successfully discovered the target is absent
// false: no more retry, so giving up
async function runUntilTargetAbsent(target, retryCount, delay) {
  if (retryCount < 1) {
    console.warn('warning: giving up since retry is used up')
    return false;
  }

  const shouldRetry = !(await isTargetAbsent(target));

  if (!shouldRetry) {
    console.info('target is absent!');
    return true;
  }

  console.info(`retrying with ${retryCount}`);
  await delay();
  return await runUntilTargetAbsent(target, retryCount - 1, delay);
}

exports.waitUntilGone = async (target, maxRetry, intervalS) => {
  return await runUntilTargetAbsent(
    target,
    maxRetry,
    async () => await _delay(1000 * intervalS),
  );
}
