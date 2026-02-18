#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVIDENCE_DIR="$ROOT_DIR/release/evidence/admin"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="$EVIDENCE_DIR/deploy-${TIMESTAMP}.txt"

mkdir -p "$EVIDENCE_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Supabase Admin Moderation Deploy ==="
echo "UTC: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Repo: $ROOT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: supabase CLI is not installed."
  exit 1
fi

echo "supabase version: $(supabase --version)"

cd "$ROOT_DIR"

if [[ -n "${PROJECT_REF:-}" ]]; then
  echo "Linking project with PROJECT_REF"
  supabase link --project-ref "$PROJECT_REF"
else
  echo "PROJECT_REF is not set. Skipping supabase link."
fi

echo "Applying migrations with supabase db push"
supabase db push --yes

ADMIN_FUNCTIONS=(
  "admin-verification-queue"
  "admin-verification-case"
  "admin-claim-verification-request"
  "admin-get-verification-doc-url"
  "admin-decide-verification"
  "admin-settings"
  "admin-audit-logs"
  "scheduled-retention-cleanup"
)

for fn in "${ADMIN_FUNCTIONS[@]}"; do
  echo "Deploying function: ${fn}"
  supabase functions deploy "$fn"
done

echo "Bucket verification note:"
echo "- Confirm 'verification-docs' exists and is PRIVATE in Supabase Storage."
echo "- Confirm signed URL TTL is 60s via admin-get-verification-doc-url smoke."

echo "=== Deploy completed successfully ==="
echo "Log: $LOG_FILE"
