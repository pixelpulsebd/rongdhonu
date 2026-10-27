# Rong Dhonu performance verification notes

## Implemented optimizations

- Landing sections use `React.lazy()` so their module imports begin only after each viewport gate opens.
- Landing viewport gates use 100–160px prefetch distance instead of the previous 500–700px ranges.
- Off-screen section wrappers use `content-visibility: auto` with intrinsic size containment.
- Secondary hero data waits for browser idle time and only the currently displayed hero image is mounted, so all hero images are not downloaded together.
- Floating chat support is moved out of the critical bundle and loaded during browser idle time.
- Public API fetches use bounded client-side abort timeouts.
- Root Apple touch icons are present where included in the source assets.
- Runtime content reads and writes use the Google Drive JSON data store; avoid large embedded image values because whole documents are transferred on reads and writes.

## Static verification notes

Static checks should include TypeScript, lint, build, and a manual review of critical public and admin journeys. The commands are:

```bash
npm run typecheck
npm run lint
npm run build
```

A successful static build does not validate live OAuth credentials, Drive file permissions, SMTP delivery, or the contents of the configured Drive account. Test those separately in the target environment.
