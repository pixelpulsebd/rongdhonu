# Rong Dhonu production release notes

This release separates visitor-submitted work reviews from admin-authored editorial reviews and completes the enquiry workflow.

## Website reviews

- Visitors can open a selected work, view published ratings/reviews, and submit a 1–5 star review.
- A submitted review is stored in the `user_reviews` Google Drive JSON document with `pending` moderation status.
- The browser receives an HTTP-only owner cookie containing a random review token; only that browser can edit or delete the matching review.
- Editing returns the review to `pending` moderation.
- Deleting removes the website-submitted review.
- The public site never exposes reviewer email addresses.
- Admins cannot edit or delete website review content; they can set visibility status.
- Application-level checks use normalized email and, when available, verified provider identity to prevent duplicate reviews for the same work.

## Admin notifications

- `/api/admin/notifications` returns pending website-review and new-enquiry counts.
- Dashboard indicators refresh periodically.
- Dashboard metrics surface new website reviews and new enquiries.

## Enquiries

- Enquiries appear as contained cards with search and status filters.
- Email, call, and open actions mark a previously-new enquiry as `read`.
- Archive, restore, and mark-new actions provide explicit loading/status feedback.
- New enquiries are saved to Google Drive. If SMTP is configured, a notification email is sent after the save; mail failure does not remove the saved enquiry.

## Public endpoint protection

- Contact and review POST/PUT/DELETE routes enforce same-origin browser requests when an Origin header is supplied.
- Contact and review forms include a hidden honeypot to reduce basic automated spam.
- Public forms require explicit consent where configured.

## Release verification

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run drive:check
```

Then test `/admin/login`, dashboard editing, enquiry submission and notification, review submission/moderation/edit/delete, visitor analytics, and images against the intended Google Drive account. Verify SMTP delivery separately.

## Storage caveat

Google Drive writes replace JSON documents and are not relational transactions. Duplicate prevention is enforced by application logic, not by a cross-instance unique constraint. Mutations are serialized only inside one running Node.js process, so concurrent multi-instance writes can lose updates. Keep backups and use a single persistent app process for best effort.
