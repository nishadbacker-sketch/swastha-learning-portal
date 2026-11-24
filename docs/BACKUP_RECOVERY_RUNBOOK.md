# Swastha Learning Clinic — Database Backup & Recovery Runbook

**Reviewed:** 24 November 2026  
**Production Supabase:** `cyhfsfwwpqgsxefcxkzp`  
**Isolated staging Supabase:** `cuxftykygloeczviknbn`  
**Status:** **Backup process not yet enabled or restoration-tested. Do not assume student information is recoverable.**

## Verified findings

- The Supabase organization `swastha-learning-portal` is on the **Free** plan (checked using the connected Supabase organization API).
- The production and staging projects were both **ACTIVE_HEALTHY** at review time.
- The provider documents that automated daily backups are provided on Pro, Team and Enterprise plans; Free projects should regularly make and store off-site logical exports.
- Point-in-time recovery requires an eligible paid plan and additional configuration; **it has not been enabled or verified** for this project.
- No actual database dump, off-site storage confirmation, or restore rehearsal has been completed. GitHub repository code and Hostinger web app deployments are not database backups.

## Priority 0 — Choose a real backup arrangement

**Best option for families' sensitive information:** upgrade the production Supabase organization to a suitable paid plan and verify **Database → Backups** shows real, recent daily recovery points. If shorter recovery objectives are essential, evaluate PITR availability and cost. Purchases/upgrades require separate user approval.

If remaining on Free, establish **scheduled secure off-site exports** and check that the exports actually complete. These are not created by the current GitHub CI workflow.

**Never export actual child/parent records into GitHub commits, chat uploads, public CI logs, open issues, or the partially migrated staging project.**

## Manual export procedure on a trusted, secured administrator computer

Prerequisites: installed [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), Docker and a secure, encrypted storage destination. In production Supabase dashboard, use **Connect** to obtain an authorized Postgres database connection string. Do not paste it into chat or commit it in any repository.

Run commands in a *private local terminal*. Enter the connection URL using a securely managed environment variable `SUPABASE_DB_URL`; never put the URL in GitHub Actions logs.

```bash
# Store export files outside the repository in a private directory.
mkdir -p "$HOME/swastha-private-backups"
cd "$HOME/swastha-private-backups"
umask 077
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$stamp"

# Use an existing privately configured SUPABASE_DB_URL environment variable.
test -n "$SUPABASE_DB_URL" || { echo "Database URL not configured"; exit 1; }

supabase db dump --db-url "$SUPABASE_DB_URL" --role-only -f "$stamp/roles.sql"
supabase db dump --db-url "$SUPABASE_DB_URL" -f "$stamp/schema.sql"
supabase db dump --db-url "$SUPABASE_DB_URL" --use-copy --data-only -f "$stamp/data.sql"

# Confirm nonempty backups; metadata and checksums are not substitutes for a restore test.
test -s "$stamp/roles.sql" && test -s "$stamp/schema.sql" && test -s "$stamp/data.sql"
sha256sum "$stamp"/*.sql > "$stamp/SHA256SUMS"
```

Protect export data with encrypted at-rest storage, strict access controls, and a second **encrypted off-site** copy. Treat Auth data, family contact numbers, medical/learning assessments and appointment notes as highly sensitive. Protect the local disk and avoid unencrypted email, portable drives or consumer chat uploads.

If `sha256sum` is unavailable on macOS, use `shasum -a 256 "$stamp"/*.sql > "$stamp/SHA256SUMS"`.

**Backup scheduling:** while on Free, run secure exports at least daily if the portal records daily changes; verify success and retain prior versions. Decide retention, access, encryption-key escrow and incident contacts before onboarding at scale.

## Restore rehearsal: never on production

1. Provision a separate, authorized **empty restore-test target**, not the existing Swastha staging project unless explicitly approved to replace its current content. This may have a charge.
2. Review extension versions, database privileges, schema/role dependencies and Supabase Auth compatibility. Follow [Supabase's backup and restore documentation](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) for the chosen target.
3. Restore encrypted backups securely to that private target; do not expose recovered child data to publicly accessible staging. The restore can include real personal information and thus requires access restrictions.
4. Verify schema, triggers, role policies, synthetic login behavior **where appropriate**, and record counts without exposing student identities in logs.
5. Document the latest valid backup timestamp, observed restore time, missing objects/settings, and the precise recovery procedure.
6. Destroy temporary sensitive restore data through an approved secure process and retain a signed-off, privacy-safe test summary.

**Caution:** Database backups do **not** back up Supabase Storage API file objects (only metadata). If future documents/images are stored in Storage, implement separate secure object backups. Review the separate needs for Auth configuration, secrets, scheduled jobs, and Hostinger configuration.

## Release and recovery decision record

| Check | Result |
| --- | --- |
| Supabase organization plan | Free — verified |
| Paid daily backup availability on this project | Not configured/verified |
| Free-tier secure exports | Not performed |
| Off-site encrypted backup copy | Not verified |
| Private restore rehearsal | Not performed |
| Hostinger GitHub deployed commit | `acac78c` reported current by user; matched successful GitHub CI |
| Staging accounts and authenticated RLS tests | Pending |

**Launch blocker:** Choose backup strategy, capture and protect a real backup, and prove it can be restored safely before increasing live family enrolment. No live database restore, drop, schema replacement, data export or records mutation was performed during this review.

## Official references

- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase CLI: Database dump](https://supabase.com/docs/reference/cli/supabase-db-dump)
- [Supabase Backup & Restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
