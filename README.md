# hook.jepso-ci.com

[![Dependency Status](https://gemnasium.com/jepso-ci/hook.jepso-ci.com.png)](https://gemnasium.com/jepso-ci/hook.jepso-ci.com)

  The GitHub hook for jepso-ci job creation.  Also includes documentation, a form to manually submit builds and a table to view builds being queued (and errors).

## Queued Messages

  The messages queued are of the form:

```js
{
  user: 'user',
  repo: 'repo',
  tag: 'tag',
  buildID: 'buildID'
}
```

## Repos Table

  An entry is added to the repos table (or updated if it exsists) of the form

```js
{
  user: 'user',
  repo: 'repo',
  buildID: buildID
}
```

  N.B. buildID is a number here, but a string in the queued message.  Each queued message is guaranteed to have a unique buildID.