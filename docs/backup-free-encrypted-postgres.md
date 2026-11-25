# Swastha free encrypted PostgreSQL backups

This is a **prepared workflow**, not an active backup until all three GitHub Actions secrets are set and this change is merged into `main`.

## One-time credential setup — do not paste any of these secrets in chat or commit them

1. In Supabase, open the production project > Connect, copy a PostgreSQL connection URI suitable for a backup client and confirm it can reach the database. Use a dedicated least-privilege backup login where possible. The session pooler can be used if a direct IPv6 connection is unavailable. Save the URI as the repository Actions secret `SWASTHA_BACKUP_DB_URL`.
2. Generate a **unique long random** encryption passphrase (prefer 32+ random bytes encoded as text). Save it securely **outside** GitHub/Drive in an administrator-controlled password manager or offline recovery store. Add a copy as the repository Actions secret `SWASTHA_BACKUP_PASSPHRASE`. Losing it makes encrypted backups unrecoverable.
3. On a trusted administrator computer, use `rclone config` to configure a Google Drive remote **named `swastha-drive`**. The remote must be rooted at the private folder [Swastha Learning Clinic — Backups](https://drive.google.com/drive/folders/1mVAH_P6zlwKkJXnSKqI_AmvB8ZPSbAdV); set `root_folder_id=1mVAH_P6zlwKkJXnSKqI_AmvB8ZPSbAdV` and ensure the OAuth identity has permission to upload to it. Export the entire local rclone config as base64 (without line wrapping) and save it as the GitHub Actions secret `SWASTHA_RCLONE_CONFIG_B64`. The rclone configuration contains sensitive OAuth tokens: treat it as a password; never commit it.
4. In GitHub repository **Settings > Secrets and variables > Actions**, add the three encrypted repository secrets. Protect who can change the backup workflow or access Actions secrets, especially because the application's GitHub repository is public.
5. Merge this change only once the secrets are set. Trigger the workflow manually first in **Actions > Encrypted Supabase offsite backup** and confirm a non-empty `.dump.gpg` and `.sha256` appear in Drive > **Production Database — Encrypted**. Validate the remote checksum and actually decrypt and restore to an isolated test database before relying on the backup. Never restore into the production database during testing.

## Daily schedule

The workflow uses GitHub Actions cron `30 20 * * *`, which is **02:00 IST the following day**. GitHub scheduled actions are best effort and may be delayed.

It uses PostgreSQL 17 `pg_dump` custom format, GnuPG symmetric AES-256 encryption before upload, and a checksum. Backup plaintext remains only on the ephemeral GitHub runner and is removed before the upload step.

**Free tier:** The tools are free and this workflow can fit GitHub Actions' free usage and the Google Drive account's available space, but capacity and quota depend on the account. No charges are guaranteed to remain zero if usage exceeds a plan limit.

## Restore outline

On an isolated PostgreSQL 17 test server:
- Download the encrypted file and checksum.
- Check `sha256sum -c <filename>.gpg.sha256`.
- Decrypt using the recovery passphrase stored separately from Drive and GitHub.
- Inspect with `pg_restore --list`; restore using `pg_restore` with careful review of extensions, managed Supabase roles, `auth` and `storage` schemas, ownership and permissions.
- Verify student, parent, teacher, assessment, RLS, certificate, and verification workflows without changing production.

**Not included in a pg_dump:** Supabase Storage object bytes, Supabase project settings and API keys, platform-managed services and external providers. These need separate recovery procedures. Never put live secrets into Google Drive in plaintext.

## Retention

Automatic deletion is intentionally **not enabled** until a successful encrypted backup and restore have been verified. At that point, configure a 30-day retention procedure with a weekly or monthly longer-lived recovery point.
