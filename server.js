var ms = require('ms');
var join = require('path').join;
var Q = require('q');
var getHead = Q.nfbind(require('request').head);
var loadConfig = require('jepso-ci-config').loadRemote;
var browserify = require('browserify-middleware');
var queueBuild = require('./lib/queue-build');

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server, {'log level': 1});

function checkConfig(user, repo, tag) {
  return loadConfig(user, repo, tag)
    .then(function (config) {
      var url = 'https://raw.github.com/' + user + '/' + repo + '/' + tag + config.url;
      return getHead(url)
        .spread(function (head) {
          if (head.statusCode != 200)
            throw new Error('Could not load ' + JSON.stringify(url) + ' server responded with status code ' + head.statusCode + 
              '.  Check you\'ve correctly named your test html file.');
          return config;
        })
    })
}

var version = require('./package.json').version;

app.use(express.favicon(join(__dirname, 'public', 'favicon.ico')));

browserify.settings.production('cache', '365 days');
app.use('/' + version + '/client.js', browserify('./lib/client.js'));


app.use('/' + version, express.static(join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? ms('365 days') : 0
}));
app.use(express.bodyParser());

if (process.env.NODE_ENV === 'production') {
  var home = require('rfile')('./index.html').replace(/\{\{version\}\}/g, version);
  app.get('/', function (req, res) {
    res.send(home);
  });
} else {
  app.get('/', function (req, res) {
    res.send(require('rfile')('./index.html').replace(/\{\{version\}\}/g, version));
  });
}

var messages = [];
app.get('/messages', function (req, res) {
  res.json(messages);
});

app.post('/', function (req, res, next) {
  var payload = JSON.parse(req.body.payload); // see https://help.github.com/articles/post-receive-hooks
  var user = payload.repository.owner.name;
  var repo = payload.repository.name;
  var tag = payload.after;
  loadConfig(user, repo, tag)
    .then(function () {
      return queueBuild(user, repo, tag);
    })
    .done(function () {
      emit('queued', {user: user, repo: repo, tag: tag});
      res.send('"build queued"');
    }, function (err) {
      console.error(err.stack || err.message || err);
      emit('err', {user: user, repo: repo, tag: tag, err: err.message || err.toString()});
      res.send(500, JSON.stringify(err.message || err));
    });
});

app.post('/enqueue/:user/:repo/:tag', function (req, res, next) {
  var user = req.params.user;
  var repo = req.params.repo;
  var tag = req.params.tag;
  checkConfig(user, repo, tag)
    .then(function (config) {
      return queueBuild(user, repo, tag).thenResolve(config);
    })
    .done(function (config) {
      emit('queued', {user: user, repo: repo, tag: tag});
      res.json({
        message: 'passed',
        commit: {
          user: user,
          repo: repo,
          tag: tag
        },
        config: config
      });
    }, function (err) {
      emit('err', {user: user, repo: repo, tag: tag, err: err.message || err.toString()});
      res.json({
        message: 'error',
        commit: {
          user: user,
          repo: repo,
          tag: tag
        },
        error: err.message || err.toString()
      });
    });
});
app.post('/test/:user/:repo/:tag', function (req, res, next) {
  var user = req.params.user;
  var repo = req.params.repo;
  var tag = req.params.tag;
  checkConfig(user, repo, tag)
    .done(function (config) {
      res.json({
        message: 'passed',
        commit: {
          user: user,
          repo: repo,
          tag: tag
        },
        config: config
      });
    }, function (err) {
      res.json({
        message: 'error',
        commit: {
          user: user,
          repo: repo,
          tag: tag
        },
        error: err.message || err.toString()
      });
    });
});


function hook(user, repo, tag, res, next) {
  checkConfig(user, repo, tag)
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

server.listen(3000);