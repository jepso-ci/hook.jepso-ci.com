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


var enabled = true;
function clicker(enqueue) {
  return function (e) {
    e.preventDefault();
    if (!enabled) return;
    enabled = false;
    if (!user.value || !repo.value) {
      if (!user.value) user.setAttribute('class', 'error');
      if (!repo.value) repo.setAttribute('class', 'error');
      enabled = true;
      return;
    }
    testConfig.setAttribute('disabled', 'disabled');
    queueTest.setAttribute('disabled', 'disabled');
    if (enqueue) queueTest.innerHTML = 'Queuing Test...';
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
  if (user.value) user.setAttribute('class', '');
  $('test-result').innerHTML = '';
  $('test-result').setAttribute('class', '');
});
repo.addEventListener('keyup', function () {
  if (repo.value) repo.setAttribute('class', '');
  $('test-result').innerHTML = '';
  $('test-result').setAttribute('class', '');
});
tag.addEventListener('keyup', function () {
  $('test-result').innerHTML = '';
  $('test-result').setAttribute('class', '');
});

function $(id) {
  return document.getElementById(id);
}