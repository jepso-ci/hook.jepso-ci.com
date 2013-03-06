var request = require('./simple-request');

var messages = [];
request.get('/messages', function (err, res) {
  if (err) throw err;
  messages = JSON.parse(res.buffer);
  redraw();
});
io.connect().on('data', function (message) {
  messages.unshift(message);
  if (messages.length > 20) messages.pop();
  redraw();
});


var stream = $('stream');
var placeholder = document.createElement('div');
function redraw() {
  if (messages.length === 0) return;
  placeholder.innerHTML = '<table>' + messages.map(function (message) {
    var type = message[0];
    var data = message[1];
    if (type === 'queued')
      return '<tr class="success">' + 
               '<td>' + data.user + '</td>' + 
               '<td>' + data.repo + '</td>' +
               '<td>' + data.tag + '</td>' +
               '<td>Queued</td>' +
             '</tr>';
    if (type === 'err')
      return '<tr class="error">' + 
               '<td>' + data.user + '</td>' + 
               '<td>' + data.repo + '</td>' +
               '<td>' + data.tag + '</td>' +
               '<td>' + data.err + '</td>' +
             '</tr>';
    if (type === '404' || type === '500')
      return '<tr class="error">' + 
               '<td>' + type + '</td>' + 
               '<td colspan="3">' + data + '</td>' +
             '</tr>';
  }).join('') + '</table>';
  var body = placeholder.firstChild.firstChild;
  stream.parentNode.replaceChild(body, stream);
  stream = body;
}

var user = $('user-input');
var repo = $('repo-input');
var tag = $('tag-input');
var queueTest = $('do-queue-test');
var testConfig = $('do-test-config');

function validUser(user) {
  return typeof user === 'string' && user
    && /^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(user);
}
function validRepo(repo) {
  return typeof repo === 'string' && repo
    && /^[a-zA-Z0-9_\-\.]+$/.test(repo);
}
function validTag(tag) {
  if (tag)
    return typeof tag === 'string'
      && /^[^ ]+$/.test(tag);
  else
    return true;
}

var enabled = true;
function clicker(enqueue) {
  return function (e) {
    e.preventDefault();
    if (!enabled) return;
    enabled = false;
    if (!validUser(user.value) || !validRepo(repo.value) || !validTag(tag.value)) {
      if (!validUser(user.value)) user.setAttribute('class', 'error');
      if (!validRepo(repo.value)) repo.setAttribute('class', 'error');
      if (!validTag(tag.value)) tag.setAttribute('class', 'error');
      enabled = true;
      return;
    }
    testConfig.setAttribute('disabled', 'disabled');
    queueTest.setAttribute('disabled', 'disabled');
    if (enqueue) queueTest.innerHTML = 'Queuing...';
    else testConfig.innerHTML = 'Testing Config...';
    $('test-result').innerHTML = enqueue ? 'Queuing...' : 'Testing...';
    $('test-result').setAttribute('class', 'pending');
    request.post((enqueue ? '/enqueue/' : '/test/') + user.value + '/' + repo.value + '/' + (tag.value || 'master'), function (err, res) {
      enabled = true;
      testConfig.removeAttribute('disabled');
      queueTest.removeAttribute('disabled');
      queueTest.innerHTML = 'Queue Test';
      testConfig.innerHTML = 'Test Configuration';
      if (err) {
        alert(err.message || err);
        throw err;
      }
      res = JSON.parse(res.buffer);
      if (res.message === 'passed') {
        $('test-result').innerHTML = enqueue ? 'Test Queued' : 'Configuration Correct';
        $('test-result').setAttribute('class', 'pass');
      } else {
        $('test-result').innerHTML = res.error;
        $('test-result').setAttribute('class', 'fail');
      }
    });
  };
}
queueTest.addEventListener('click', clicker(true));
testConfig.addEventListener('click', clicker(false));

user.addEventListener('keyup', function () {
  if (validUser(user.value)) user.setAttribute('class', '');
  if (!enabled) return;
  $('test-result').innerHTML = '';
  $('test-result').setAttribute('class', '');
});
repo.addEventListener('keyup', function () {
  if (validRepo(repo.value)) repo.setAttribute('class', '');
  if (!enabled) return;
  $('test-result').innerHTML = '';
  $('test-result').setAttribute('class', '');
});
tag.addEventListener('keyup', function () {
  if (validTag(tag.value)) tag.setAttribute('class', '');
  if (!enabled) return;
  $('test-result').innerHTML = '';
  $('test-result').setAttribute('class', '');
});

function $(id) {
  return document.getElementById(id);
}