# Rong Dhonu Renovation Limited

Business website and content-management system for the supplied service offering:

- General Painting Work
- Various Wall Paint & Color Schemes
- Skim Coat Work
- Marble Painting
- Ambrose Painting
- Texture Work

The site includes a public marketing website, bilingual content presentation, an admin CMS, public enquiry and review workflows, and visitor analytics.

## Runtime services

**Google Drive is the only structured-content store used by the application.** CMS content, admin users, contact submissions, public reviews, and visitor analytics are read from and written to private JSON files in a single client-owned Google Drive folder. The application authenticates to Drive using a Google service-account key JSON file; **it does not use a refresh token**. The folder must be shared with the service account as Editor. Runtime API storage is implemented in `lib/drive-store.ts` and `lib/google-drive.ts`.

SMTP mail via Nodemailer is used for optional contact enquiry notifications. New enquiries are saved to Drive first; if SMTP is configured, a notification email is then attempted. A mail delivery failure does not discard the stored submission.

## Google Drive setup

1. Install Node.js 20 or newer.
2. Enable Google Drive API in Google Cloud Console, create a service account, and download its JSON key.
3. Save the private key file locally at `credentials/google-service-account.json`. This is the service-account **credential** file; do not put it in Git or in the shared data folder. To use another path, set `GOOGLE_SERVICE_ACCOUNT_FILE` in `.env`.
4. Create a client-owned Google Drive folder for the table data. Open the service-account key JSON and copy `client_email`, then share the **data folder** with that email as **Editor**.
5. Copy the folder ID from the Google Drive URL into `GOOGLE_DRIVE_FOLDER_ID` in `.env`.
6. Copy `.env.example` to `.env`. Set a unique `SESSION_SECRET`, `GOOGLE_SERVICE_ACCOUNT_FILE`, `GOOGLE_DRIVE_FOLDER_ID`, and `GOOGLE_DRIVE_FILE_PREFIX=rongdhonu-db-`.
7. Upload the 11 JSON files from `database-json/` into that folder if you are starting from empty templates. The expected names are `rongdhonu-db-<table>.json`. **Do not upload empty templates over existing populated data files.**
8. Ensure `admin_users` contains at least one admin row whose `password_hash` is a bcrypt hash, not plaintext. Configure SMTP if you want email notifications.
9. Verify the table files:
   ```bash
   npm ci
   npm run drive:check
   npm run typecheck
   npm run lint
   npm run build
   npm run dev
   ```

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are optional and are only used for the separate public Google identity-login feature. They are not Drive storage credentials. See [`docs/GOOGLE_DRIVE_STORAGE.md`](docs/GOOGLE_DRIVE_STORAGE.md) for the full setup and limitations.

## CMS features

- **Dashboard:** analytics, frequency charts, content search/sort/filter, visitor analytics, and quick management links.
- **Business Info:** company name, tagline, phone, email, website, address, logo, and optional Bangla content.
- **Services:** create, edit, reorder, hide, search/filter, or delete services.
- **Our Team:** manage team profiles, slugs, roles, bios, and photos.
- **Hero & Process Pictures:** manage the main banner and process-step imagery.
- **Reviews:** manage editorial testimonials and moderation of public-submitted reviews.
- **Our Work:** manage portfolio entries and related public reviews.
- **Enquiries:** review saved contact submissions, update statuses, and archive or restore records.

## Important storage limitations

Google Drive stores whole JSON documents; it is not a transactional data engine. The app serializes mutations only within one running Node.js process. Concurrent writes from multiple serverless instances or overlapping deployments may overwrite each other. Use one persistent app instance when possible, keep independent backups, and avoid high-volume or concurrent writes. The Drive check validates file existence and JSON row structure but does not replace a backup or restore test.

Images entered as base64 data URIs are stored inside JSON documents, so large images increase request time and Drive storage usage. Keep image sizes modest.

## Security and release checklist

1. Keep `.env` and the service-account key file out of version control.
2. Use a unique high-entropy `SESSION_SECRET` and keep Google credentials private.
3. Keep the table JSON files private; share the data folder only with intended editors and the service-account email.
4. Configure SMTP and send a test enquiry if notification email is required.
5. Run `npm run typecheck`, `npm run lint`, and `npm run build` before deployment.
6. Test `/admin/login`, dashboard editors, contact enquiries, public reviews, visitor analytics, and image/logo content against the intended Drive folder.
7. Back up the JSON documents regularly and test restore procedures.

## Project structure

- `app/api/` — Next.js API routes.
- `app/server/api/` — shared server-side API handlers.
- `lib/drive-store.ts` — JSON table operations backed by Google Drive.
- `lib/google-drive.ts` — Google Drive service-account authentication, file reads and writes.
- `lib/google-service-account.ts` — parses the private key JSON file and signs short-lived JWT assertions.
- `database-json/` — structural JSON templates for all 11 tables.
- `app/api/contact/route.ts` — contact validation, Drive persistence, and optional SMTP notification.
- `scripts/check-drive-files.mjs` — read-only validation of the 11 expected Drive files.
