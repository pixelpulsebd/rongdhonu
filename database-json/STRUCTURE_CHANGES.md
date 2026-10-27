# JSON schema alignment notes

Compared against `app/types/public-cms.ts`, `app/types/rong-dhonu.ts`, `lib/drive-store.ts`, `lib/content.ts`, `lib/serviceInput.ts`, `lib/workInput.ts`, `lib/teamInput.ts`, `lib/analytics.ts`, the admin API route handlers, and `app/data/brand.ts` in the uploaded project archive.

| Table | Project-specific data shape |
|---|---|
| `business_profile` | Singleton numeric `id`; snake_case profile and brand image keys; team/work slugs and update timestamp. |
| `services` | String `id` matching `slug`; bilingual fields, category, description, best-for, accent, optional image, ordering and activation. |
| `team_members` | Numeric `id`, unique slug, bilingual name/role/bio, optional photo, ordering and activation. |
| `work_items` | Numeric `id`, unique slug, bilingual content, client/location, integer year, optional image, ordering and activation. |
| `reviews` | Numeric `id`, unique slug, English/Bangla text, rating, optional related work ID, ordering, timestamps and activation. |
| `hero_images` | Slot-keyed rows used for banner and process slides. |
| `contact_submissions` | Numeric IDs, contact fields, consent version/time, `new`/`read`/`archived` workflow and timestamps. |
| `user_reviews` | Numeric IDs; related work, reviewer contact, rating/text, hashed owner token, moderation status, optional OAuth identity, consent and timestamps. |
| `site_visitors` | Visitor-keyed aggregate profile/metrics plus browser/device/privacy-conscious network fields. |
| `site_visit_events` | Numeric event IDs, visitor/session IDs, page path/title/referrer and event timestamp/name. |
| `admin_users` | Numeric ID, unique email, bcrypt password hash, creation timestamp; never plaintext password. |

Validation after generation checked that all 11 JSON files parse, document table names/envelopes match the runtime format, per-file schema equals the manifest table schema, row keys are aligned to declared columns, numeric IDs and service IDs have the expected types, slug uniqueness holds, and foreign-key references used by inactive sample reviews point to sample work rows.
