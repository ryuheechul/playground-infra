// warning: there is no guarantee that this version will stay same
// 2.1055.0 is the version of `aws-sdk` at the time of development
const aws = require('aws-sdk');
const util = require('util');

const apigatewayv2 = new aws.ApiGatewayV2();

const deleteDomainName = util.promisify(
  apigatewayv2.deleteDomainName.bind(apigatewayv2)
);

const route53 = new aws.Route53({
  apiVersion: '2014-05-15',
  region: 'us-east-1',
});

const changeResourceRecordSets = util.promisify(
  route53.changeResourceRecordSets.bind(route53)
);

const listResourceRecordSets = util.promisify(
  route53.listResourceRecordSets.bind(route53)
);

const listRecordSets = async (hostedZoneId) => {
  var params = {
    HostedZoneId: hostedZoneId,
    // otherwise default is only 100
    MaxItems: '300',
  };
  console.info('Querying RecordSets from %s...', hostedZoneId);
  const data = await listResourceRecordSets(params);

  // console.info('RecordSets: %s', '', data);
  return data.ResourceRecordSets;
};

const fetchRecordSet = async (hostedZoneId, domainName) => {
  console.log('fetchRecordSet', hostedZoneId, domainName);
  const resourceRecordSets = await listRecordSets(hostedZoneId);
  const filtered = resourceRecordSets.filter(
    (rs) => rs.Name == `${domainName}.`
  );

  if (filtered.length === 0) {
    return null;
  }

  const one = filtered[0];

  // to prevent this error, "InvalidInput: Invalid XML ; cvc-complex-type.2.4.b: The content of element 'ResourceRecords' is not complete. One of '{\"https://route53.amazonaws.com/doc/2013-04-01/\":ResourceRecord}' is expected."
  if (one.ResourceRecords.length == 0) {
    delete one.ResourceRecords;
  }

  return one;
};

const deleteRecordSet = async (hostedZoneId, recordSet) => {
  const params = {
    ChangeBatch: {
      Changes: [
        {
          Action: 'DELETE',
          ResourceRecordSet: recordSet,
        },
      ],
    },
    HostedZoneId: hostedZoneId,
  };
  console.info('Deleting RecordSet %s ...', hostedZoneId, params);

  const data = await changeResourceRecordSets(params);
  console.info('RecordSet deleted %s', data);
};

exports.justDeleteInsteadOfWaiting = async (target, hostedZoneId) => {
  const recordSet = await fetchRecordSet(hostedZoneId, target);
  console.info(recordSet);

  if (!recordSet) {
    console.warn(`recordSet for ${target} doesn't exist`);
    return false;
  }

  console.info('delete from route53');
  console.log(await deleteRecordSet(hostedZoneId, recordSet));

  console.info('delete from API Gateway');
  console.log(
    await deleteDomainName({
      DomainName: target,
    })
  );
};
