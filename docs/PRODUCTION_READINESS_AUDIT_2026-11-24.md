# Production readiness audit — 24 November 2026

This is an operational assessment of the **Swastha Learning Clinic** portal, not a claim of production sign-off.

## Release state and deployment

- Repository: `nishadbacker-sketch/swastha-learning-portal`, branch `main`.
- Historical Hostinger publication was reported as `b01d87a`; it predates the newest parent notifications, announcements, report, and testing changes.
- GitHub Actions checks include Next.js production build, local startup, route/API smoke tests, parent source regression, Supabase anonymous access, and opt-in authenticated staging checks.
- **The GitHub successful build is not proof of Hostinger publication.** A Hostinger owner must compare the deployed checkout SHA with the latest successful GitHub commit and confirm production startup logs and routes.

## Production Supabase findings (read-only review)

- Production project reference: `cyhfsfwwpqgsxefcxkzp`.
- Supabase security advisor found **2 RLS-without-policy notices**: `public.admin_audit_events` and `public.payments`. Both deliberately have deny-by-default access. Do not add public policies as a reflexive workaround.
- **31 authenticated SECURITY DEFINER API functions** flagged for individual authorization review. A static SQL body scan found authentication/role-related guards in each inspected callable definer function, but static matching is **not** a penetration test or proof that all checks are correct.
- A metadata audit found no public-schema SQL functions executable by the anonymous role at the time checked.
- Supabase health advisor reported no lint notices.
- Performance advisor reported missing covering foreign-key indexes. Review query profiles before prioritizing indexes; avoid removing unused indexes solely on a young database.
- Public appointment intake currently uses form validation, Origin allowlisting and a honeypot. Origin can be spoofed; these are not equivalent to rate limiting or abuse prevention.
- The appointment intake endpoint now limits **actual streamed request bytes**, not only Content-Length, to 12,000 bytes; a non-mutating oversized-body smoke test was added.
- No production student, parent, teacher, assessment, appointment, or payment record was changed during this review.

## Staging readiness

- Staging project: `cuxftykygloeczviknbn`.
- Staging has 30 public tables and matching production field names/types/nullability, but **not all** production procedures, triggers, RLS policies and operational settings.
- Authenticated staging tests are **SKIPPED until** synthetic Parent A, Parent B and active Teacher accounts exist and all staging CI secrets are configured. Never count the skipped step as a security pass.
- The staging fixture and isolated account procedure are documented in `docs/STAGING_SETUP.md`. Do not copy real family data.
- Do not point the public Hostinger portal to the staging Supabase project.

## Mandatory GitHub Actions database-security gate

The detailed GitHub Actions logs on 2026-11-24 showed that anonymous Supabase access checks had been **skipped**, because GitHub Actions secrets were absent. A successful build with skipped security checks was misleading.

The `main` workflow now explicitly **fails** unless both repository **Actions secrets** are present:

- `NEXT_PUBLIC_SUPABASE_URL` — URL of the **production** Supabase project.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the **public/anonymous** API key for that project, NOT a service-role key.

Configuration: GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**. Use the values from Supabase project `cyhfsfwwpqgsxefcxkzp` → Project Settings → API Keys. Never paste API keys into an issue, PR, chat or public commit. Do **not** change Hostinger production variables simply because CI variables are missing.

Until these are set, a red security gate is **intentional and correct**. Re-run the workflow, confirm the database-security tests actually execute and pass, and separately check staging tests are not falsely counted as passing. Staging checks remain optional but should be completed before real-user launch.

## Go/no-go blockers for onboarding real families at scale

1. **Deployment:** Confirm latest tested `main` SHA in Hostinger deployment logs. Verify `/login`, `/register`, `/parent/dashboard`, `/teacher/dashboard`, `/admin/dashboard` using authorized accounts.
2. **Authenticated role isolation:** Run staging sign-in/RLS tests (two parents, active teacher, inactive teacher, clinic admin, admin, creator) with synthetic data. Cover direct Supabase API calls and URL access; then exercise parent submission → teacher review → approved report and IDP.
3. **Backups and recovery:** Confirm whether Supabase project's current plan has automated backups and point-in-time recovery. Produce a secure logical backup/restore rehearsal on an isolated target without copying customer data to public artifacts. Document rollback of both Hostinger commit and database migrations. **Backup/PITR status could not be read via available tools; do not assume these are enabled.**
4. **Public endpoint protection:** Add durable per-client throttling, observability and abuse handling before promoting the appointment endpoint at volume. Rate-limit controls should not rely solely on Origin or in-memory per-process counters.
5. **Authentication security:** Review password leak protection, account recovery, verification configuration and administrator account protections in the Supabase dashboard.
6. **Release monitoring:** Check Hostinger error logs after deployment, monitor Supabase auth/database errors, and define an incident/rollback owner.

## Hard constraints

- Keep existing student IDs, automatic teacher assignment, child linking, teacher records and appointment history.
- Never deploy staging environment variables to production.
- Never include service-role secrets in client-side `NEXT_PUBLIC_*` variables.
- Never use genuine children's records to seed staging or test write workflows.
- Do not run anonymous tests that invoke write-capable RPCs on production: even negative tests could mutate records if authorizations regress.

## Reference pages

- [Supabase RLS advisor: no policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Supabase SECURITY DEFINER lint](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
