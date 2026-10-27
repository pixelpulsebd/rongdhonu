# Google Drive JSON storage (service account; no refresh token)

The app stores structured application data in 11 JSON documents inside one Google Drive folder. Runtime Drive authentication uses a Google service-account key JSON file and short-lived JWT-bearer access tokens. **No Google Drive OAuth refresh token is required or supported by the storage adapter.** SMTP/Nodemailer is separate and can send contact enquiry notifications after the enquiry is saved to Drive.

## 1. Create the service account key file

1. In Google Cloud Console, choose/create a project and enable the **Google Drive API**.
2. Create a Google service account and generate/download a JSON key for it.
3. In this local project, create the `credentials` directory and save the downloaded file as `credentials/google-service-account.json` (or set `GOOGLE_SERVICE_ACCOUNT_FILE` to another path in `.env`).
4. Do **not** commit, upload to public storage, or share the service-account key JSON. The key file is the service account's private credential, not a table data file.

The file must be the original Google service-account key JSON (it contains `type: "service_account"`, `client_email`, and `private_key`). An OAuth client JSON is not suitable.

## 2. Share the data folder with the service account

1. Create a folder in the client/owner's Google Drive for the Rongdhonu table JSON documents.
2. Open the downloaded service-account key JSON locally and copy the value of `client_email`.
3. Share the **data folder** with that service-account email and grant **Editor** access. Keep the data JSON files private; do not enable public access.
4. Copy the folder ID from the folder URL into `GOOGLE_DRIVE_FOLDER_ID` in `.env`.
5. Set `GOOGLE_DRIVE_FILE_PREFIX=rongdhonu-db-` unless you intentionally use a different prefix.

The API only lists and writes files whose parent is the configured folder. When a table file does not exist, the adapter creates it inside that folder.

## 3. Add the table JSON files

The project includes 11 project-aligned JSON table documents in `database-json/`, named exactly like the expected Drive files: `rongdhonu-db-<table>.json`. Each uses the formatVersion/table/schema/rows/nextId/updatedAt envelope. The profile, six services and six banner/process images are seeded; work/team/review sample rows are inactive; admin, submission, user-review and analytics tables are empty until genuine records are created. Upload the 11 files into the configured Drive folder only when you intend to replace that table data, and keep a backup before doing so.

The expected tables are:

- `admin_users`
- `business_profile`
- `services`
- `team_members`
- `work_items`
- `reviews`
- `hero_images`
- `contact_submissions`
- `user_reviews`
- `site_visitors`
- `site_visit_events`

`admin_users` must contain at least one admin row with a bcrypt password hash before admin login can succeed. Never store a plaintext password in the JSON file. The `hero_images` template includes the six default slots used by the site.

## 4. Configure and test

Copy `.env.example` to `.env`, set `SESSION_SECRET`, `GOOGLE_SERVICE_ACCOUNT_FILE`, and `GOOGLE_DRIVE_FOLDER_ID`, and configure SMTP if email notifications are required. `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are only for the optional public Google sign-in flow; they are not used to authenticate Drive storage.

Run:

```bash
npm ci
npm run drive:check
npm run typecheck
npm run lint
npm run build
```

`drive:check` uses the service-account key JSON and checks that all 11 files exist in the configured folder and contain valid JSON row arrays. It does not change data.

## Notes and limitations

Google Drive stores each table as a whole JSON document; it is not a transactional database. Writes are serialized only within one Node.js process, so concurrent serverless instances can overwrite one another. Use a single persistent application instance when possible and keep independent backups. A service-account key is highly sensitive; rotate it if exposed. Contact enquiry email is best-effort: the submission is saved to Drive first, and SMTP is attempted afterward.

## Security note for this archive

The Google service-account private key file is not included in this redistribution archive. Restore your own private `credentials/google-service-account.json` locally, keep it out of Git/public sharing, and confirm the Drive folder is shared with the service-account email.
