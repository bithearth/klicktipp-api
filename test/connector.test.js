const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const Connector = require('..');

async function fixture(t, handler, options) {
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : undefined;
    res.setHeader('Content-Type', 'application/json');
    handler(req, res, body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  });
  return new Connector(`http://127.0.0.1:${server.address().port}`, options);
}

const routes = [
  ['subscriptionProcessIndex', [], 'GET', '/list', undefined, 'data'],
  ['subscriptionProcessGet', ['23'], 'GET', '/list/23', undefined, 'data'],
  ['subscriptionProcessRedirect', ['23', 'test@example.invalid'], 'POST', '/list/redirect', { listid: '23', email: 'test@example.invalid' }, 'data'],
  ['tagIndex', [], 'GET', '/tag', undefined, 'data'],
  ['tagGet', ['7'], 'GET', '/tag/7', undefined, 'data'],
  ['tagCreate', ['test', 'description'], 'POST', '/tag', { name: 'test', text: 'description' }, 'data'],
  ['tagUpdate', ['7', 'new', 'text'], 'PUT', '/tag/7', { name: 'new', text: 'text' }, true],
  ['tagDelete', ['7'], 'DELETE', '/tag/7', undefined, true],
  ['fieldIndex', [], 'GET', '/field', undefined, 'data'],
  ['subscribe', ['test@example.invalid', 23, 7, { field1: 'ä' }, '+491234'], 'POST', '/subscriber', { email: 'test@example.invalid', listid: 23, tagid: 7, fields: { field1: 'ä' }, smsnumber: '+491234' }, 'data'],
  ['unsubscribe', ['test@example.invalid'], 'POST', '/subscriber/unsubscribe', { email: 'test@example.invalid' }, true],
  ['tag', ['test@example.invalid', [7, 8]], 'POST', '/subscriber/tag', { email: 'test@example.invalid', tagids: [7, 8] }, 'data'],
  ['untag', ['test@example.invalid', 7], 'POST', '/subscriber/untag', { email: 'test@example.invalid', tagid: 7 }, true],
  ['resend', ['test@example.invalid', 4], 'POST', '/subscriber/resend', { email: 'test@example.invalid', autoresponder: 4 }, true],
  ['subscriberIndex', [], 'GET', '/subscriber', undefined, 'data'],
  ['subscriberGet', ['42'], 'GET', '/subscriber/42', undefined, 'data'],
  ['subscriberSearch', ['test@example.invalid'], 'POST', '/subscriber/search', { email: 'test@example.invalid' }, 'data'],
  ['subscriberTagged', [7], 'POST', '/subscriber/tagged', { tagid: 7 }, 'data'],
  ['subscriberUpdate', ['42', { field1: 'ä' }, 'new@example.invalid', '+491234'], 'PUT', '/subscriber/42', { fields: { field1: 'ä' }, newemail: 'new@example.invalid', newsmsnumber: '+491234' }, true],
  ['subscriberDelete', ['42'], 'DELETE', '/subscriber/42', undefined, true],
  ['signin', ['example-key', 'test@example.invalid', {}, '+491234'], 'POST', '/subscriber/signin', { apikey: 'example-key', email: 'test@example.invalid', fields: {}, smsnumber: '+491234' }, true],
  ['signout', ['example-key', 'test@example.invalid'], 'POST', '/subscriber/signout', { apikey: 'example-key', email: 'test@example.invalid' }, true],
  ['signoff', ['example-key', 'test@example.invalid'], 'POST', '/subscriber/signoff', { apikey: 'example-key', email: 'test@example.invalid' }, true],
];

for (const [method, args, verb, path, body, result] of routes) {
  test(`${method}: route, JSON payload and result`, async t => {
    let received;
    const client = await fixture(t, (req, res, data) => {
      received = { verb: req.method, path: req.url, body: data, cookie: req.headers.cookie, accept: req.headers.accept };
      res.end(JSON.stringify({ result: 'ok' }));
    });
    client.sessionName = 'session';
    client.sessionId = 'example-session';
    assert.deepEqual(await client[method](...args), result === 'data' ? { result: 'ok' } : result);
    assert.deepEqual(received, { verb, path, body, cookie: 'session=example-session', accept: 'application/json' });
  });
}

test('login and logout manage session cookies', async t => {
  const requests = [];
  const client = await fixture(t, (req, res, body) => {
    requests.push({ path: req.url, cookie: req.headers.cookie, body });
    res.end(JSON.stringify(req.url === '/account/login' ? { sessid: 'example-session', session_name: 'session' } : true));
  });
  assert.equal(await client.login('example-user', 'example-password'), true);
  assert.equal(await client.logout(), true);
  assert.equal(requests[0].cookie, undefined);
  assert.deepEqual(requests[0].body, { username: 'example-user', password: 'example-password' });
  assert.equal(requests[1].cookie, 'session=example-session');
  assert.equal(client.sessionId, '');
  assert.equal(client.sessionName, '');
});

test('HTTP errors retain status and API details without exposing request secrets', async t => {
  let fail = true;
  const client = await fixture(t, (req, res) => {
    res.statusCode = fail ? 406 : 200;
    res.end(JSON.stringify(fail ? { error: 4 } : []));
  });
  await assert.rejects(client.login('example-user', 'example-password'), error => {
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'KlicktippError');
    assert.equal(error.status, 406);
    assert.deepEqual(error.details, { error: 4 });
    assert.equal(error.config, undefined);
    assert.equal(error.request, undefined);
    assert.equal(error.cause, undefined);
    assert.equal(client.getLastError(), error.message);
    return true;
  });
  fail = false;
  await client.tagIndex();
  assert.equal(client.getLastError(), '');
});

test('network errors preserve ECONNREFUSED', async t => {
  const server = http.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  const client = new Connector(`http://127.0.0.1:${port}`);
  await assert.rejects(client.login('example-user', 'example-password'), error => {
    assert.equal(error.code, 'ECONNREFUSED');
    assert.equal(error.status, undefined);
    assert.match(error.message, /ECONNREFUSED/);
    return true;
  });
});

for (const response of [{}, { sessid: '', session_name: 'session' }, { sessid: 'x' }, null]) {
  test(`invalid login payload rejected: ${JSON.stringify(response)}`, async t => {
    const client = await fixture(t, (req, res) => res.end(JSON.stringify(response)));
    client.sessionId = 'old-session'; client.sessionName = 'session';
    await assert.rejects(client.login('example-user', 'example-password'), /invalid session/);
    assert.equal(client.sessionId, '');
    assert.equal(client.sessionName, '');
  });
}

test('failed re-login and failed logout clear existing session', async t => {
  const client = await fixture(t, (req, res) => { res.statusCode = 401; res.end('{}'); });
  for (const action of [() => client.login('example-user', 'example-password'), () => client.logout()]) {
    client.sessionId = 'old-session'; client.sessionName = 'session';
    await assert.rejects(action(), /HTTP 401/);
    assert.equal(client.sessionId, '');
    assert.equal(client.sessionName, '');
  }
});

test('invalid arguments throw Error objects and getLastError returns text', async () => {
  const client = new Connector();
  assert.equal(client.getLastError(), '');
  for (const [method, args] of routes) {
    if (args.length) {
      await assert.rejects(client[method](), TypeError);
      assert.equal(client.getLastError(), 'Illegal Arguments');
    }
  }
  await assert.rejects(client.login(), TypeError);
  assert.match(client.getLastError(), /Login failed/);
});

test('timeout bounds requests to an unresponsive server', async t => {
  const client = await fixture(t, () => {}, { timeout: 30 });
  await assert.rejects(client.tagIndex(), error => error.code === 'ECONNABORTED');
  assert.equal(new Connector().timeout, 15000);
  assert.throws(() => new Connector(undefined, { timeout: 0 }), TypeError);
});

test('AbortSignal cancels an in-flight request', async t => {
  const controller = new AbortController();
  const client = await fixture(t, () => controller.abort(), { signal: controller.signal });
  await assert.rejects(client.tagIndex(), error => error.code === 'ERR_CANCELED');
});

test('per-request AbortSignal can cancel a request', async () => {
  const client = new Connector();
  await assert.rejects(client.httpRequest('/tag', 'GET', undefined, true, { signal: AbortSignal.abort() }), error => error.code === 'ERR_CANCELED');
});

test('redirects are not followed with credentials', async t => {
  const client = await fixture(t, (req, res) => {
    res.statusCode = 302;
    res.setHeader('Location', '/unexpected');
    res.end('{}');
  });
  client.sessionId = 'example-session'; client.sessionName = 'session';
  await assert.rejects(client.tagIndex(), error => error.status === 302);
});
