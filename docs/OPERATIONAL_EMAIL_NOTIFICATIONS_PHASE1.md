# Phase 1 — Swastha operational email notifications (24 November 2026)

**Current release state:** Prepared and tested as source code. The operational staff email transport is **disabled by default**. No family, student, or appointment records have been modified and no bulk email was sent.

## Registration verification: already active through Supabase Auth

- Production Supabase Auth handles signup email confirmation from the configured `support@swasthalearning.com` sender.
- The user confirmed receiving and clicking a signup verification email.
- The new login/register UI displays the appropriate verification-pending message.
- **Do not send an extra welcome email directly from the browser.** Later, an optional welcome email should come from a verified server-side authentication event and use one unique delivery event key.

## Appointment enquiry: prepared internal notification

Two appointment entry points existed:
- `app/api/appointment-intake/route.ts` saves public website enquiries.
- `app/appointment/page.tsx` previously inserted directly from the browser.

Both now use the same validated intake endpoint. The API saves the enquiry; a database trigger queues an internal staff notification. The HTTP endpoint never sends SMTP messages.

The production migration `supabase/migrations/20261124190000_notification_outbox.sql` has been applied, creating a private, RLS-protected notification outbox. Each newly inserted enquiry queues a `pending` event with a unique `(event_type, entity_id)` key. Existing appointment records are not backfilled and existing student-linking/follow-up triggers are retained. The server-only mail transport `lib/server/appointment-notification.ts` is prepared, but **no outbox delivery worker is connected yet**. Automatic appointment messages remain disabled, regardless of the value of the flag.

The alert includes only a link to the authorized follow-up queue:
`https://portal.swasthalearning.com/teacher/appointments`

It does **not** contain names, phone numbers, dates of birth, reasons for consultation, child details, reports, or medical data. It is **not** a parent appointment confirmation. The current appointment form collects WhatsApp numbers but no email address verified as belonging to the guardian. Do not infer an email recipient by matching a phone number.

SMTP delivery does not occur during appointment submission. The separate worker, retries and sent/failed acknowledgements are still to be implemented and staging-tested.

### Hostinger Web App configuration (variable names confirmed on screenshot, values not independently verified)

Environment variables must be set **only in the server environment**, not in public `NEXT_PUBLIC_*` variables:

| Variable | Example |
| --- | --- |
| `SWASTHA_SMTP_HOST` | `smtp.hostinger.com` |
| `SWASTHA_SMTP_PORT` | `465` |
| `SWASTHA_SMTP_USER` | `support@swasthalearning.com` |
| `SWASTHA_SMTP_PASSWORD` | Private Hostinger mailbox SMTP password — never commit |
| `SWASTHA_ENABLE_APPOINTMENT_STAFF_EMAIL` | `false` initially |

**DO NOT set the enable flag to `true` in production yet.** Public appointment submissions can be retried or abused. Before activation, add production-grade persistent rate limits, spam/bot challenge checks, a delivery worker with lease-based claims, bounded retries, and throttling. The private outbox is now idempotent per saved enquiry, but duplicate HTTP submissions may create separate enquiries. Exactly-once SMTP delivery cannot be guaranteed; use a safe retry policy and monitor failures. A false flag is the safe default.

### Next secured production rollout

1. Verify that new and existing appointment forms still save exactly one enquiry per intended submission. Check both the main website embed and `/appointment`.
2. Review form anti-abuse measures and add a durable request idempotency key and server-side rate limiting. Outbox uniqueness per enquiry is implemented.
3. Confirm server-only SMTP credential values in Hostinger without disclosing them; leave the flag off.
4. Test email notifications in a **staging environment with synthetic enquiries and a controlled inbox**, and verify errors cannot expose credentials.
5. After successful tests, enable one category at a time and monitor delivery.
6. Add linked-parent notifications only after collecting and verifying guardian email ownership and providing consent/preference controls.
7. Expand to assessment assigned/submitted/reviewed, activity and development-plan updates through a common authenticated event outbox. Never email child assessment details or attach reports.

## Safety and status

- One new database table in private schema `swastha_private` and its appointment-insert queue trigger were added; no existing roles, RLS policies, student linkages or appointment records were altered.
- No mailing to all users, parents or teachers was activated.
- Staff notification remains **off**, even when Supabase Auth verification emails work. These are distinct delivery systems.
- Supabase Auth uses its own custom SMTP settings; the optional operational sender needs separate Hostinger Web App secrets (variable names confirmed present).
- Backups and authenticated user-isolation tests remain outstanding release gates.

## Phase 2 update — duplicate protection and server-only rate limiting (24 November 2026)

- Added `appointment_enquiries.submission_key` with a unique partial index. Existing rows retain NULL, and the portal appointment form reuses one random UUID across retries.
- Added `swastha_private.appointment_rate_limits`, an atomic counter table with RLS and no anon/authenticated access.
- Added `public.swastha_limit_appointment_request(text,text)`: only `service_role` may execute. The server HMAC-hashes IP and WhatsApp numbers before passing identifiers to the limiter. Limits: 120 total and eight per identifier per 15 minutes; three per phone identifier per 60 minutes. The IP value comes from proxy forwarding headers: the global limit provides a backstop if those headers are manipulated.
- The appointment API now requires `SUPABASE_SERVICE_ROLE_KEY` as a server-only Hostinger environment variable; the user reported adding a new Supabase secret key under that name. The app credentials and live SMTP delivery have not been independently verified.
- Explicit `service_role` SELECT/INSERT grants were added to `public.appointment_enquiries` after verifying none existed; public and normal users still have no table INSERT grants.
- The limiter fails closed with 503 if its RPC cannot be reached; rejected submissions receive 429.
- New appointments must still be tested from both the main website and the portal with synthetic details. The queue worker and SMTP sending remain disabled.
- Important: request-id deduplication only works for sources submitting the same key. The main website legacy form has not yet been updated to send a key; abuse prevention requires a proper bot challenge and reliable trusted-proxy configuration. The rate limiter has simple fixed windows, not a sophisticated distributed anti-spam service.
