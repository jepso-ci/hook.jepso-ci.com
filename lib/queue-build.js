var Q = require('q');
var mongojs = require('mongojs');
var sqs = require('simple-queue-service');
var config;
try { config = require('../config.json'); } catch (ex) {}

var access = process.env.HOOK_ACCESS || config.access;
var secret = process.env.HOOK_SECRET || config.secret;
var region = process.env.HOOK_REGION || (config && config.region);
var queueName = process.env.HOOK_QUEUE || config.queue;
var connectionString = process.env.HOOK_DB || config.db;

var queue = sqs(access, secret, region).createQueue(queueName, {visibilityTimeout: '10 minutes'});
Q(queue).done();

var db = mongojs(connectionString).collection('repos');
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
  return Q.promise(function (resolve, reject) {
    db.findAndModify({
      query: {_id: user + '/' + repo},
      update: {'$inc': { build: 1}, '$set': { user: user, repo: repo }},
      new: true,
      fields: { build: 1 },
      upsert: true
    }, function (err, res) {
      if (err) return reject(err);
      else return resolve(res.build);
    });
  });
}