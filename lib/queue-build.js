var Q = require('q');
var sqs = require('simple-queue-service');
var aws = require('aws-sdk');
var config;
try { config = require('../config.json'); } catch (ex) {}

var access = process.env.HOOK_ACCESS || config.access;
var secret = process.env.HOOK_SECRET || config.secret;
var region = process.env.HOOK_REGION || config.region;
var queueName = process.env.HOOK_QUEUE || config.queue;
var reposTableName = process.env.HOOK_REPOS_TABLE || config['repos-table'];

var queue = sqs(access, secret, region).createQueue(queueName, {visibilityTimeout: '10 minutes'});
Q(queue).done();

aws.config.update({accessKeyId: access, secretAccessKey: secret});
aws.config.update({region: region || 'us-east-1'});

var db = new aws.DynamoDB({sslEnabled: true}).client;
var updateItem = Q.nfbind(db.updateItem.bind(db));
db.createTable({
  TableName: reposTableName,
  KeySchema: {
    HashKeyElement: { AttributeName: 'user', AttributeType: 'S'},
    RangeKeyElement: { AttributeName: 'repo', AttributeType: 'S'}
  },
  ProvisionedThroughput: {
    ReadCapacityUnits: 2,
    WriteCapacityUnits: 1
  }
}, function (err) {
  //ignore if table already exists
  //requires care when changing schema
  if (err.name === 'AWS:ResourceInUseException') return;
  throw err;
})

module.exports = queueBuild;

function queueBuild(user, repo, tag) {
  return createBuild(user, repo)
    .then(function (buildID) {
      return queue.send({
        user: user,
        repo: repo,
        tag: tag,
        buildID: buildID
      });
    });
}


function createBuild(user, repo) {
  return updateItem({
    TableName: reposTableName,
    Key: {
      HashKeyElement: { S: user },
      RangeKeyElement: { S: repo }
     },
    AttributeUpdates: {
      currentBuild: { Value: {N: '1'}, Action: 'ADD' }
    },
    ReturnValues: 'UPDATED_NEW'
  })
  .then(function (res) {
    var buildID = res.Attributes.currentBuild.N;
    return buildID;
  });
}