#!/usr/bin/env bash
# Swastha Learning Clinic — encrypted off-site production database snapshot.
# Never redirect stdout to a public CI artifact: this process contains PII.
set -Eeuo pipefail
umask 077

die() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }
for name in SUPABASE_BACKUP_DB_URL BACKUP_AGE_RECIPIENT BACKUP_S3_ENDPOINT BACKUP_S3_BUCKET AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  [[ -n "${!name:-}" ]] || die "Required GitHub Actions secret $name is missing. No backup was attempted."
done

# Hard fail if the staging URL or any other project is supplied by mistake.
[[ "$SUPABASE_BACKUP_DB_URL" == *"cyhfsfwwpqgsxefcxkzp"* ]] ||
  die "Database connection is not the approved Swastha production project."
[[ "$BACKUP_AGE_RECIPIENT" == age1* ]] ||
  die "BACKUP_AGE_RECIPIENT must be an age public recipient (age1...)."
[[ "$BACKUP_S3_ENDPOINT" == https://* ]] ||
  die "Off-site storage endpoint must be HTTPS."
[[ "$BACKUP_S3_BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] ||
  die "Invalid S3-compatible bucket name."

command -v docker >/dev/null || die "Docker missing."
command -v age >/dev/null || die "age missing."
command -v aws >/dev/null || die "AWS CLI missing."
command -v sha256sum >/dev/null || die "sha256sum missing."

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
stamp="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
object="swastha-prod/db/${stamp}-postgres17.dump.age"
encrypted="$workdir/database.dump.age"
downloaded="$workdir/verified.dump.age"

# pg_dump writes its custom-format archive ONLY to the encrypted age pipe.
# No plaintext SQL file or unencrypted artifact is stored on the runner.
# Explicit schemas include identity records (auth) and Storage metadata.
# Actual Storage files are NOT included and need their own backup.
docker run --rm \
  --env SUPABASE_BACKUP_DB_URL --env PGSSLMODE=require \
  postgres:17 \
  sh -eu -c 'exec pg_dump --dbname="$SUPABASE_BACKUP_DB_URL" --format=custom --no-owner --no-acl --schema=public --schema=auth --schema=storage --schema=supabase_migrations' \
  | age --recipient "$BACKUP_AGE_RECIPIENT" --output "$encrypted"

[[ -s "$encrypted" ]] || die "Encrypted dump is empty."
local_sha="$(sha256sum "$encrypted" | awk '{print $1}')"
export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-auto}"
export AWS_EC2_METADATA_DISABLED=true
aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3 cp "$encrypted" "s3://$BACKUP_S3_BUCKET/$object" --only-show-errors
aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3 cp "s3://$BACKUP_S3_BUCKET/$object" "$downloaded" --only-show-errors
remote_sha="$(sha256sum "$downloaded" | awk '{print $1}')"
[[ "$local_sha" == "$remote_sha" ]] || die "OFF-SITE VERIFICATION FAILED: checksum mismatch."
printf 'Verified encrypted off-site snapshot: %s UTC, bytes=%s, sha256=%s\n' "$stamp" "$(wc -c < "$encrypted")" "$local_sha"
printf 'Destination object key: %s\n' "$object"
