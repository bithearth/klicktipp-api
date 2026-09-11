# Changelog

## 2.0.0

### Breaking changes

- Require Node.js 22 or newer.
- Reject failures with Error objects instead of strings; low-level httpRequest now rejects failures.
- Default requests to a 15-second timeout and reject redirects.
- Clear previous sessions before login and clear local sessions after logout failures.

### Fixes

- Fetch opt-in processes from /list/{listid} instead of the contact endpoint.
- Implement getLastError and preserve HTTP status, API error details, and transport codes.
- Validate login response session fields.
- Update Axios and regenerate consistent package-lock metadata.
- Correct the npm import and document error handling, configuration, and migration.

### Added

- AbortSignal cancellation, configurable timeouts, and safe transport error objects.
- Automated HTTP regression tests, dependency auditing, secret scanning, and Dependabot updates.
- An explicit package file allowlist and a test gate before publishing.
