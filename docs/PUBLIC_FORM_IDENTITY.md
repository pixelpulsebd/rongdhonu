# Public form consent, browser profile and Google/Apple identity

Public enquiries and work reviews now require an explicit form consent before submission. A successful submission stores a short browser profile cookie (`rd_form_profile`) containing only name, email and phone for up to 180 days. The cookie is HttpOnly, Secure in production, SameSite=Lax, and is read back through `GET /api/public/profile` rather than exposed directly to client JavaScript.

## Google

Set:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Register this exact redirect URI in Google Cloud:

```text
https://YOUR-DOMAIN/api/public/auth/google/callback
```

The site requests the `openid email profile` scopes and exchanges the authorization code server-side before reading the verified UserInfo response.

## Apple

Set:

```bash
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
```

`APPLE_CLIENT_ID` is the Sign in with Apple Services ID. Register:

```text
https://YOUR-DOMAIN/api/public/auth/apple/callback
```

The server generates the Apple client-secret JWT, exchanges the one-time authorization code, validates the returned Apple ID token signature and claims, then stores only the form profile fields in the browser cookie.

`APPLE_PRIVATE_KEY` can be supplied as a single environment-variable line using literal `\\n` sequences in environments that do not support multiline secrets.

## UX behavior

Before either public form submits, the user must accept the form consent. The form also shows a privacy/data notice and a control to clear the saved browser profile. Google and Apple buttons are shown only when the corresponding server credentials are configured.

When OAuth is used, the current public-form draft is temporarily stored in `sessionStorage`, the provider flow completes server-side, and the user returns to the same form with the identity fields filled in. Review forms also reopen the selected work automatically.

## Review identity rule

The API checks the Google Drive review records to prevent more than one review per selected work by normalized email. When a verified Google or Apple profile is present, the provider subject is also stored and checked. These are application-level checks; the file store does not provide relational unique constraints, and concurrent requests across separate app processes can race.
