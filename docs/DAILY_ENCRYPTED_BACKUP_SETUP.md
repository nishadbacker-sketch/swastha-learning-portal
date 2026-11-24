# Swastha Learning Clinic — Encrypted Daily Database Backups

**Status: WORKFLOW INSTALLED, BUT NOT ACTIVE UNTIL ALL REQUIRED CREDENTIALS ARE CONFIGURED AND A FIRST BACKUP IS VERIFIED.**

Supabase production ref: `cyhfsfwwpqgsxefcxkzp`. The Free plan does not provide the paid-tier automated daily backup service. This workflow exports `public`, `auth`, `storage` **metadata**, and `supabase_migrations` every day at **08:00 IST** (02:30 UTC, subject to GitHub scheduler delays) to a **private S3-compatible storage bucket**. The output is encrypted **before** upload and the uploaded encrypted object is downloaded and checksummed.

## You must supply a private storage destination

Create a **private** bucket in Cloudflare R2, Backblaze B2, AWS S3, or another S3-compatible provider. Use a bucket dedicated to Swastha backups. Create a dedicated access key with **PutObject/GetObject/ListBucket only as needed**, scoped to that bucket; do not use your account's global/root API key. Never enable public bucket access or publish a share URL. Configure lifecycle retention (e.g., 30–90 days depending on your policy), and consider object versioning/retention locks to protect against deletion. Confirm any storage provider costs and limits yourself before accepting charges.

The workflow doesn't need your production Supabase **service-role key**. It needs a **PostgreSQL connection string** for an authorized database account. In the Supabase production dashboard → **Connect**, use a supported pooler/direct Postgres connection string for the approved project. Ensure your password is URL-encoded when required and TLS is enabled. Choose a connection with the permissions required to dump `auth`, `public`, `storage` and `supabase_migrations`. This credential must not be the public/anon API key.

## Create your offline encryption key (keep it OFF GitHub)

On a trusted, encrypted administrator computer, install [age](https://github.com/FiloSottile/age) and run:

```bash
umask 077
age-keygen -o swastha-backup-private.agekey
age-keygen -y swastha-backup-private.agekey
```

The second command prints a public **age1...** recipient. Store the **private** `.agekey` securely in at least two separate protected locations, with a documented authorized recovery owner. **Never upload the private key to GitHub or paste it into chat.** If it is lost, backups cannot be decrypted.

## Set repository Action secrets

Open [GitHub Actions repository secrets](https://github.com/nishadbacker-sketch/swastha-learning-portal/settings/secrets/actions). Set:

| GitHub Actions secret | Value |
| --- | --- |
| `SUPABASE_BACKUP_DB_URL` | Production Supabase PostgreSQL connection URI (not anon key) |
| `BACKUP_AGE_RECIPIENT` | The **public** `age1...` encryption recipient |
| `BACKUP_S3_ENDPOINT` | HTTPS S3-compatible endpoint (for R2 `https://ACCOUNT_ID.r2.cloudflarestorage.com`) |
| `BACKUP_S3_BUCKET` | Name of your **private** backup bucket |
| `BACKUP_S3_ACCESS_KEY_ID` | Bucket-scoped S3 access key |
| `BACKUP_S3_SECRET_ACCESS_KEY` | Matching S3 secret access key |
| `BACKUP_S3_REGION` | Optional; default `auto` (e.g. for Cloudflare R2). Use appropriate region for AWS S3/B2. |

The credentials are loaded inside GitHub Actions, not saved in source code. Protect the repository's Actions workflow edit permissions, since anyone able to change a workflow can potentially abuse its configured credentials. Prefer a private separate backup repository and GitHub Environment protection when a security review is available.

**Safety:** if any required secret is absent, the workflow **fails visibly**, without connecting to production or claiming a successful backup. It does **not** quietly skip backups.

## Start and verify first backup

Once storage and secrets are configured:

1. Open [Daily Encrypted Supabase Backup](https://github.com/nishadbacker-sketch/swastha-learning-portal/actions/workflows/daily-encrypted-backup.yml).
2. Click **Run workflow**, select `main`, and run.
3. Verify all steps finish successfully, especially **Export, encrypt, upload and verify production database**.
4. In the private bucket, locate `swastha-prod/db/YYYY-MM-DDTHH-MM-SSZ-postgres17.dump.age` and verify its size and creation date.
5. Ensure the workflow logs show a checksum and upload confirmation **without showing any row data**.
6. The presence of an encrypted file alone is not proof it will restore. Conduct a controlled restore drill on a separate, access-restricted disposable database. Do **not** overwrite production or import real children's records into the public staging portal.
7. Establish failure alerts (at minimum GitHub Actions failure notifications), expiry/lifecycle policies, and periodic verification. Record a recovery owner.

## Decrypt and inspect locally (trusted administrator workstation only)

```bash
umask 077
age --decrypt --identity swastha-backup-private.agekey --output recovered.dump YYYY-MM-DDTHH-MM-SSZ-postgres17.dump.age
pg_restore --list recovered.dump > recovered-contents.txt
```

This creates a **highly sensitive plaintext database file**, containing student and Auth data. Inspect the dump privately, then securely remove transient plaintext and protect the encrypted source. **Do not attempt `pg_restore` against the production project.** A cross-project restore requires reviewing roles, extensions, Supabase-managed schemas and privileges; it is not a one-command production recovery. See [Supabase's official backup/restore guidance](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

### Coverage and limitations

- The command backs up selected PostgreSQL schemas including **Auth users** and portal tables (subject to database connection privileges). It is a **logical snapshot**, not point-in-time recovery.
- **Does not include actual files** stored in Supabase Storage buckets; `storage` is only metadata. If user-uploaded files exist, configure separate Storage object backups.
- Does not preserve every Supabase project configuration, API/auth secrets, external provider settings, Hostinger variables or integrations. Capture these in a separate secret-managed disaster-recovery inventory.
- The GitHub schedule is **best effort**, not an SLA. Monitor daily successes and file freshness.
- Current workflow includes no automatic delete operations; retention is a private bucket/provider policy decision.
- A GitHub Actions green check without verifying the encrypted object and practicing restore is **not** disaster recovery.
- The repository's GitHub Actions logs, source files and artifacts **must not contain plaintext dumps, parent records, children's names, secret API keys or private decryption identities**.

## Reference

- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase — Backup and Restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [PostgreSQL — pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
