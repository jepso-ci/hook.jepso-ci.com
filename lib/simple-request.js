var http = require('http');

exports.get = get;
function get(path, cb) {
  http.get({path: path, scheme: location.protocol.split(':')[0]}, function (res) {
    var buffer = '';
    var ended = false;
    res.on('data', function (data) {
      buffer += data;
    });
    res.on('error', function (err) {
      if (ended) return;
      ended = true;
      cb(err);
    });
    res.on('end', function () {
      if (ended) return;
      ended = true;
      res.buffer = buffer;
      cb(null, res);
    });
  });
}

exports.post = post;
function post(path, cb) {
  var req = http.request({
    method: 'POST',
    path: path,
    scheme: location.protocol.split(':')[0]
  }, function (res) {
    var buffer = '';
    var ended = false;
    res.on('data', function (data) {
      buffer += data;
    });
    res.on('error', function (err) {
      if (ended) return;
      ended = true;
      cb(err);
    });
    res.on('end', function () {
      if (ended) return;
      ended = true;
      res.buffer = buffer;
      cb(null, res);
    });
  });
  req.end();
}