# klicktipp-api

Node.js client for the KlickTipp Management and Listbuilding APIs.
Requires Node.js 22 or newer.

## Install

```bash
npm install klicktipp-api
```

## Usage

Set `KLICKTIPP_USERNAME` and `KLICKTIPP_PASSWORD` in your environment.
Do not commit credentials to your repository.

```js
const KlicktippConnector = require("klicktipp-api");

async function main() {
  const client = new KlicktippConnector();
  let loggedIn = false;

  try {
    await client.login(
      process.env.KLICKTIPP_USERNAME,
      process.env.KLICKTIPP_PASSWORD
    );
    loggedIn = true;
    const tags = await client.tagIndex();
    console.log(tags);
  } catch (error) {
    console.error(error.message);
  } finally {
    if (loggedIn) {
      try {
        await client.logout();
      } catch (error) {
        console.error(error.message);
      }
    }
  }
}

main().catch(error => console.error(error.message));
```

## Configuration

```js
const controller = new AbortController();
const client = new KlicktippConnector("https://api.klicktipp.com", {
  timeout: 15000,
  signal: controller.signal,
});

// Cancel requests using this signal:
controller.abort();
```

The default timeout is 15,000 milliseconds. It must be a positive finite number.
An aborted signal stays aborted; create a new controller and client for new work.
For a single low-level request, pass `{ signal }` as the sixth argument to
`httpRequest(path, method, data, usesession, { signal })`.
HTTP redirects are rejected to prevent forwarding credentials to another target.
Use one client per account; do not perform concurrent login/logout operations on
one client. Login clears any previous session before attempting authentication.
Logout clears the local session even when the server request fails; a failed
request does not guarantee that the server session was revoked.

## Errors

Methods reject with `Error` objects; invalid arguments reject with `TypeError`.
HTTP and transport failures have `name: "KlicktippError"` and these properties:

| Property | Meaning |
| --- | --- |
| `message` | Request method/path and HTTP status or transport code |
| `status` | HTTP status, or `undefined` when no response arrived |
| `code` | Axios transport/error code, such as `ECONNREFUSED`, `ECONNABORTED`, or `ERR_CANCELED` |
| `details` | API response body, including any API error codes |

Raw Axios request/config objects are omitted because they may contain passwords
or session cookies. `details` is the server response and may contain contact data;
select the fields you need instead of logging it wholesale.

`getLastError()` returns the last error message, initially an empty string.
Starting a new HTTP request clears it. Prefer catching the rejected error when
issuing concurrent requests, because the last-error field is shared by the client.

## Methods

| Area | Methods |
| --- | --- |
| Sessions | `login(username, password)`, `logout()` |
| Opt-in processes | `subscriptionProcessIndex()`, `subscriptionProcessGet(listid)`, `subscriptionProcessRedirect(listid, email)` |
| Tags | `tagIndex()`, `tagGet(tagid)`, `tagCreate(name, text)`, `tagUpdate(tagid, name, text)`, `tagDelete(tagid)` |
| Fields | `fieldIndex()` |
| Contacts | `subscribe(email, listid, tagid, fields, smsnumber)`, `unsubscribe(email)`, `subscriberIndex()`, `subscriberGet(id)`, `subscriberSearch(email)`, `subscriberTagged(tagid)`, `subscriberUpdate(id, fields, newemail, newsmsnumber)`, `subscriberDelete(id)` |
| Contact tags | `tag(email, tagids)`, `untag(email, tagid)` |
| Autoresponders | `resend(email, autoresponder)` |
| Listbuilding | `signin(apikey, email, fields, smsnumber)`, `signout(apikey, email)`, `signoff(apikey, email)` |

The Listbuilding methods accept a Listbuilding API key and can be used without
logging in. Successful return values follow the existing wrapper contract:
index/get/search methods, `subscribe`, `tag`, `tagCreate`, and
`subscriptionProcessRedirect` return the response data. Other operations return
`true`, including `signin`.

See the official [KlickTipp API reference](https://developers.klicktipp.com/) for
API permissions, field definitions, and current endpoint documentation.

## Migration from 1.x

- Use Node.js 22 or newer.
- Catch `Error` objects and read `error.message`; thrown values are no longer strings.
- `httpRequest()` now rejects on failure instead of returning an Axios error as a successful Promise result.
- Requests have a 15-second default timeout and do not follow redirects.
- Failed re-login or logout clears the local session.
- `subscriptionProcessGet()` now returns the correct opt-in process data.
- Import the published package as `require("klicktipp-api")`.

## Development

```bash
npm ci
npm test
npm audit
```

Tests use local HTTP servers and dummy credentials; no KlickTipp account is needed.
CI runs tests on Node.js 22 and 24, audits dependencies, and scans Git history for
secrets. `npm publish` runs the tests before publication. Never automatically retry
mutating API calls without considering whether the first request succeeded.
