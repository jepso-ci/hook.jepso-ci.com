var join = require('path').join;
var Q = require('q');
var getHead = Q.nfbind(require('request').head);
var loadConfig = require('jepso-ci-config').loadRemote;

var express = require('express');
var app = express();
var server = module.exports = require('http').createServer(app);
var io = require('socket.io').listen(server, {'log level': 1});

app.use(require('./lib/bundle-client').serve);
app.use(express.favicon());
app.use(express.static(join(__dirname, 'public')));
app.use(express.bodyParser());


var messages = [];
app.get('/messages', function (req, res) {
  res.json(messages);
});

app.post('/', function (req, res, next) {
  var payload = JSON.parse(req.body.payload); // see https://help.github.com/articles/post-receive-hooks
  var user = payload.repository.owner.name;
  var repo = payload.repository.name;
  var tag = payload.after;
  hook(user, repo, tag, res, next);
});

app.post('/:user/:repo/:tag', function (req, res, next) {
  var user = req.params.user;
  var repo = req.params.repo;
  var tag = req.params.tag;
  hook(user, repo, tag, res, next);
});
app.post('/test/:user/:repo/:tag', function (req, res, next) {
  var user = req.params.user;
  var repo = req.params.repo;
  var tag = req.params.tag;
  loadConfig(user, repo, tag)
    .then(function (config) {
      var url = 'https://raw.github.com/' + user + '/' + repo + '/' + tag + config.url;
      return getHead(url)
        .spread(function (head) {
          if (head.statusCode != 200)
            throw new Error('Could not load ' + JSON.stringify(url) + ' server responded with status code ' + head.statusCode + 
              '.  Check you\'ve correctly named your test html file.');
          res.json({
            message: 'passed',
            commit: {
              user: user,
              repo: repo,
              tag: tag
            },
            config: config
          });
        })
    })
    .fail(function (err) {
      res.json({
        message: 'error',
        commit: {
          user: user,
          repo: repo,
          tag: tag
        },
        error: err.message || err.toString()
      });
    })
    .done(null, next);
});


function hook(user, repo, tag, res, next) {
  loadConfig(user, repo, tag)
    .then(function () {
      //todo: Queue Build Here
    })
    .done(function () {
      res.json({
        message: 'build queued',
        commit: {
          user: user,
          repo: repo,
          tag: tag
        }
      });
      emit('queued', {user: user, repo: repo, tag: tag});
    }, function (err) {
      emit('err', {user: user, repo: repo, tag: tag, err: err.message || err.toString()});
      res.send(500, err.message || err);
    });
}

app.use(function (req, res, next) {
  emit('404', req.path);
  next();
});
app.use(function (err, req, res, next) {
  emit('500', err.message || err);
  next(err);
});

io.configure('production', function () {
  io.enable('browser client minification');
  io.enable('browser client etag');
  io.enable('browser client gzip');
});
function emit(name, data) {
  messages.unshift([name, data]);
  if (messages.length > 20) messages.pop();
  io.sockets.emit('data', [name, data]);
}