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

Both now use the same validated intake endpoint. The API continues to save the enquiry before attempting any mail.

When enabled, `lib/server/appointment-notification.ts` uses server-only Nodemailer SMTP credentials to send **one generic staff alert per successfully processed endpoint call** to the fixed clinic mailbox `support@swasthalearning.com`.

The alert includes only a link to the authorized follow-up queue:
`https://portal.swasthalearning.com/teacher/appointments`

It does **not** contain names, phone numbers, dates of birth, reasons for consultation, child details, reports, or medical data. It is **not** a parent appointment confirmation. The current appointment form collects WhatsApp numbers but no email address verified as belonging to the guardian. Do not infer an email recipient by matching a phone number.

A failed SMTP delivery is logged generically and does not roll back a successfully saved appointment.

### Hostinger Web App configuration (not configured yet)

Environment variables must be set **only in the server environment**, not in public `NEXT_PUBLIC_*` variables:

| Variable | Example |
| --- | --- |
| `SWASTHA_SMTP_HOST` | `smtp.hostinger.com` |
| `SWASTHA_SMTP_PORT` | `465` |
| `SWASTHA_SMTP_USER` | `support@swasthalearning.com` |
| `SWASTHA_SMTP_PASSWORD` | Private Hostinger mailbox SMTP password — never commit |
| `SWASTHA_ENABLE_APPOINTMENT_STAFF_EMAIL` | `false` initially |

**DO NOT set the enable flag to `true` in production yet.** Public appointment submissions can be retried or abused. Before activation, add production-grade persistent rate limits, spam/bot challenge checks, an idempotent notification outbox keyed to the database enquiry ID, delivery retry limits, and throttling. The current implementation sends per accepted request and **does not yet guarantee exactly-once notification delivery**. A false flag is the safe default.

### Next secured production rollout

1. Verify that new and existing appointment forms still save exactly one enquiry per intended submission. Check both the main website embed and `/appointment`.
2. Review form anti-abuse measures and add a durable idempotency key, outbox and server-side rate limiting.
3. Provision the server-only SMTP credentials in Hostinger, leaving the flag off. Confirm SMTP account settings with the email provider.
4. Test email notifications in a **staging environment with synthetic enquiries and a controlled inbox**, and verify errors cannot expose credentials.
5. After successful tests, enable one category at a time and monitor delivery.
6. Add linked-parent notifications only after collecting and verifying guardian email ownership and providing consent/preference controls.
7. Expand to assessment assigned/submitted/reviewed, activity and development-plan updates through a common authenticated event outbox. Never email child assessment details or attach reports.

## Safety and status

- No new DB tables, triggers, RLS rules, permissions or account roles were changed.
- No mailing to all users, parents or teachers was activated.
- Staff notification remains **off**, even when Supabase Auth verification emails work. These are distinct delivery systems.
- Supabase Auth uses its own custom SMTP settings; the optional operational sender would need separate Hostinger Web App secrets.
- Backups and authenticated user-isolation tests remain outstanding release gates.
