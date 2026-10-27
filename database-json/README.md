# Project-aligned Rong Dhonu Drive JSON data

This folder is intended to replace the project's `database-json/` folder. The files retain the Google Drive document envelope expected by `lib/drive-store.ts`:

- `formatVersion: 2`
- `table`: exact runtime table name
- `schema`: descriptive schema metadata
- `rows`: table records in snake_case, as read and written by the app
- `nextId`: next numeric ID for tables that use `allocateId`
- `updatedAt`: ISO-8601 timestamp for the document

## Project alignment corrections

- `services.id` is a string, and the app's service API sets it equal to `slug`; the previous schema incorrectly described it as an integer.
- `work_items.year` is an integer (or null), matching `lib/workInput.ts` and `lib/content.ts`; the previous schema described it as a string.
- Business profile fields are stored in snake_case and mapped by `lib/content.ts`. Its website value is an absolute HTTPS URL because the admin validation requires `http://` or `https://`.
- Schema metadata in each table document is generated from `schema-manifest.json` so it stays consistent.

## Included data

- `business_profile`: one project-brand row; its three existing base64 logo/icon assets are preserved.
- `services`: six seeded service records; service IDs are their slug values.
- `hero_images`: six seeded banner/process image slots and their supplied data URIs.
- `work_items`, `team_members`, and `reviews`: inactive demo placeholders only, retained from the previous draft so they will not be displayed publicly. Replace these with verified content before activating them.
- `admin_users`, `contact_submissions`, `user_reviews`, `site_visitors`, and `site_visit_events`: empty because no authentic administrator credentials or real user/activity records were supplied.

## Install

Copy the contents of this `database-json/` directory over the existing project directory, then upload the 11 `rongdhonu-db-*.json` files into the Google Drive folder configured by `GOOGLE_DRIVE_FOLDER_ID`. Do not overwrite a live Drive folder unless you intend to replace its current data. Keep a backup before production migration.
