# Swastha Learning Clinic — Support Email, Verification and Notifications Setup

**Sender requested:** `support@swasthalearning.com`  
**Prepared:** 24 November 2026  
**Status:** Portal auth UI and editable templates are prepared. **SMTP sending and Supabase email-confirmation enforcement are not enabled or verified.** No mail has been sent. No existing users were altered.

## 1. Ensure the mailbox exists and sends mail

Sign into [Hostinger hPanel](https://hpanel.hostinger.com/) → **Emails**. Select `swasthalearning.com`. Verify that `support@swasthalearning.com` is a provisioned **mailbox with sending rights**, not just an alias. Send a normal test message to an inbox you control, and reply to confirm incoming and outgoing delivery.

For **Hostinger Email** (not Titan or a different third-party email service), documented SMTP is:
- SMTP server: `smtp.hostinger.com`
- Port: `465` with SSL/TLS (or 587 with STARTTLS if Hostinger's account instructions support it)
- SMTP username: `support@swasthalearning.com`
- SMTP password: the **mailbox** password, not the Hostinger account login
- From email: `support@swasthalearning.com`
- Sender name: `Swastha Learning Clinic`

Verify settings in your *actual* mail hosting product first. Do not share the mailbox password in chat, GitHub or screenshots.

### Domain authentication

Use the email provider's DNS instructions to verify MX, SPF, DKIM and DMARC records for `swasthalearning.com`. Do not blindly overwrite SPF/MX/DMARC: first inspect existing records and avoid multiple conflicting SPF records. Use a restrictive DMARC policy only after successful test deliveries.

## 2. Configure Supabase Auth to send from the support address

Production project: https://supabase.com/dashboard/project/cyhfsfwwpqgsxefcxkzp

1. Open **Authentication → SMTP Settings** in Supabase.
2. Enable custom SMTP and enter the provider-verified SMTP host, port, mailbox username and password above.
3. Set **Sender email** `support@swasthalearning.com` and **Sender name** `Swastha Learning Clinic`.
4. Review rate limits/transactional sending quotas and test delivery using an account you control.
5. Under **Authentication → URL Configuration**, set **Site URL** `https://portal.swasthalearning.com` and allow these exact redirect URLs:
   - `https://portal.swasthalearning.com/login`
   - `https://portal.swasthalearning.com/reset-password`
   - `https://portal.swasthalearning.com/` (optional, only if needed)
6. Under **Authentication → Providers → Email**, enable **Confirm email** only **after SMTP has been proved working**, so new registrations aren't locked out due to failed delivery.

**Never use `service_role` keys for SMTP** and never expose SMTP credentials in `NEXT_PUBLIC_*` variables.

### Account migration safeguards

Enabling email confirmation changes the behavior of *new* signups. **Do not revoke existing sessions, force-email-confirm previously created accounts, or overwrite Auth records.** Check and pilot with one new fictional account before changing production configuration. New signups with no session will see **Check your email**. Existing confirmed-session signups keep the existing immediate registration completion message.

## 3. Branded Auth templates (prepared, not installed in Supabase)

Open production **Authentication → Email Templates** and paste the corresponding HTML and subject from the repository:
- `docs/email-templates/confirm-signup.html` → **Confirm signup**. Subject: `Confirm your Swastha Learning Clinic email`.
- `docs/email-templates/reset-password.html` → **Reset password**. Subject: `Reset your Swastha Learning Clinic password`.
- `docs/email-templates/invite-user.html` → **Invite user**. Subject: `Your Swastha Learning Clinic invitation`.
- `docs/email-templates/magic-link.html` → **Magic link**. Subject: `Your Swastha Learning Clinic sign-in link`.
- `docs/email-templates/change-email.html` → **Change email address**. Subject: `Confirm your Swastha Learning Clinic email change`.

These use Supabase's `{{ .ConfirmationURL }}` variable. Test each generated link's redirect. **Supabase Free users with default SMTP may be unable to customize templates; custom SMTP is required.** Recovery flow is wired through `/forgot-password` and `/reset-password`.

For security, do not include password values, raw Auth tokens, child details or health assessments inside emails.

## 4. Other routine notifications — implementation plan, NOT enabled

Authentication emails above are handled by **Supabase Auth**. The following **operational** notifications are not sent by Supabase Auth automatically and require a separate, authenticated and auditable notification service. Treat these as the planned notification catalog.

| Event | Intended recipient | Low-sensitivity message | Delivery rule |
| --- | --- | --- | --- |
| New registration (after verification) | parent | Account ready; sign into the portal | Only after verified registration; avoid duplicates |
| Appointment enquiry received | contact address only if provided and verified | Your enquiry has been received; sign in/contact clinic | No medical/child details |
| Appointment status updated | linked parent or verified contact | Your appointment information has changed | Only for verified linked parent/contact |
| Appointment follow-up due | assigned staff/admin | A follow-up requires attention in the clinic portal | Do not include family phone, case notes or diagnoses |
| Assessment assigned | linked parent | New assessment available in portal | Do not include questions or responses |
| Assessment submitted | assigned teacher | A review is waiting in portal | Include link to authorized portal, not detailed responses |
| Assessment approved | linked parent | A report is ready in your secure portal | Never attach assessment report or child details |
| Teacher assignment changed | relevant staff | Your student assignments changed | Portal login required |
| IDP / learning activity changed | linked parent, if opted-in | New learning activity/update in portal | Don't send private IDP details |
| Security events | account owner or authorized admin | Verify important account changes | Use appropriate Auth security notifications |

**Required before enabling operational notifications:**
- Reliable outbound provider (SMTP/API), stored only in a protected server-side secret.
- A trusted server-side event source, queue, idempotency keys and retries. Do not send arbitrary emails from a public request route.
- Secure recipient resolution using the existing RLS-backed parent/student and staff relationships; never match on an unverified phone number alone.
- Explicit parent opt-in for optional activity updates, opt-out/preferences, minimum-necessary content and retention policy.
- Template previews, rate limiting, delivery logs without personal/assessment details, and test deliveries.
- Define rules for minor/guardian communications, privacy and staff access.
- Separate staging tests using fictional identities; no mass emailing existing families when features are first enabled.

**No operational mail webhook, database trigger, or delivery queue is activated by this setup**, to avoid unintended emails or leaked student data before credentials, consent rules and backups are confirmed.

## 5. Test and release checklist

1. Send a mailbox test **from** and **to** `support@swasthalearning.com` and inspect SPF/DKIM.
2. Configure **custom SMTP** in **production Supabase**, send test verification to a fictional address you own.
3. Confirm the link opens the right portal login and enables sign-in; check rate limits and spam folder.
4. Request recovery at `/forgot-password`, follow link to `/reset-password`, choose a new password and sign in.
5. Verify invitation and email-change templates in staging before production use.
6. Confirm production Hostinger deployment includes these pages and the registration status adjustment.
7. Only then enable **Confirm email** for new signups, carefully monitoring support requests and existing accounts.
8. Set up the separately authorized operational notification sender, then test each event type using fictional data, check duplicates and recipient isolation.

## References

- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
- [Hostinger Email configuration](https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email/)
