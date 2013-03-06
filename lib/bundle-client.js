var join = require('path').join;
var browserify = require('browserify');

var path = join(__dirname, 'client.js');

exports = module.exports = bundle;
function bundle() {
  var b = browserify([path]);
  return b.bundle();
}

exports.serve = function (req, res, next) {
  if (req.path === '/client.js') {
    res.setHeader('Content-Type', 'application/javascript');
    bundle().pipe(res);
  } else {
    next();
  }
};