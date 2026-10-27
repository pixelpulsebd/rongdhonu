# Rong Dhonu — source restoration verification

This package retains the supplied website design and its CMS, with server-side API handlers connected to the Google Drive JSON store.

## Source preservation

- Public-site, CMS, and API source are included in the project archive.
- macOS `.DS_Store` metadata is intentionally excluded from the distribution archive.
- Performance improvements are layered on top of the retained project tree.

## Features retained

- Individual landing-section lazy loading and viewport-scoped data loading.
- Admin route loading skeletons.
- Google Drive-backed content, admin records, enquiries, public reviews, and visitor analytics.
- Contact validation, consent handling, same-origin checks, and optional SMTP notifications.
- Public API routes for business, hero images, process, reviews, services, team, and work.

## Verification expectations

Before deployment, run `npm run typecheck`, `npm run lint`, and `npm run build`. Also run `npm run drive:check` with the deployment's configured Google Drive credentials. Static source checks alone cannot validate live Drive access or mail delivery.
