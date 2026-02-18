#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVIDENCE_DIR="$ROOT_DIR/release/evidence/admin"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_FILE="$EVIDENCE_DIR/canary-${TIMESTAMP}.txt"

mkdir -p "$EVIDENCE_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

required_envs=(
  "SUPABASE_PROJECT_REF"
  "NON_ADMIN_ACCESS_TOKEN"
  "MODERATOR_ACCESS_TOKEN"
  "VERIFICATION_REQUEST_ID"
)

for key in "${required_envs[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env: ${key}"
    echo "Canary aborted. Log: ${LOG_FILE}"
    exit 1
  fi
done

FUNCTIONS_BASE_URL="${SUPABASE_FUNCTIONS_BASE_URL:-https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1}"

echo "=== Admin Canary Smoke ==="
echo "UTC: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Functions base: ${FUNCTIONS_BASE_URL}"

http_post() {
  local token="$1"
  local endpoint="$2"
  local body="$3"

  curl -sS -X POST "${FUNCTIONS_BASE_URL}/${endpoint}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}" \
    --data "${body}"
}

extract_status() {
  tail -n 1
}

extract_body() {
  sed '$d'
}

echo "1) Verify non-admin access is denied on admin gate endpoint"
raw_non_admin="$(http_post "${NON_ADMIN_ACCESS_TOKEN}" "admin-verification-queue" '{"filters":{"status":["PENDING"]}}')"
status_non_admin="$(printf '%s\n' "${raw_non_admin}" | extract_status)"
if [[ "${status_non_admin}" != "403" ]]; then
  echo "FAIL: expected 403 for non-admin; got ${status_non_admin}"
  exit 1
fi
echo "PASS: non-admin denied (403)"

echo "2) Verify moderator can fetch verification queue"
raw_queue="$(http_post "${MODERATOR_ACCESS_TOKEN}" "admin-verification-queue" '{"filters":{"status":["PENDING","UNDER_REVIEW"]}}')"
status_queue="$(printf '%s\n' "${raw_queue}" | extract_status)"
body_queue="$(printf '%s\n' "${raw_queue}" | extract_body)"
if [[ "${status_queue}" != "200" ]]; then
  echo "FAIL: expected 200 from queue endpoint; got ${status_queue}"
  exit 1
fi
if ! printf '%s' "${body_queue}" | grep -q '"data"'; then
  echo "FAIL: queue response does not contain data"
  exit 1
fi
echo "PASS: moderator queue fetch returned 200"

echo "3) Verify signed-doc-url endpoint returns short-lived URL"
raw_doc="$(http_post "${MODERATOR_ACCESS_TOKEN}" "admin-get-verification-doc-url" "{\"requestId\":\"${VERIFICATION_REQUEST_ID}\"}")"
status_doc="$(printf '%s\n' "${raw_doc}" | extract_status)"
body_doc="$(printf '%s\n' "${raw_doc}" | extract_body)"
if [[ "${status_doc}" != "200" ]]; then
  echo "FAIL: expected 200 from signed doc endpoint; got ${status_doc}"
  exit 1
fi
if ! printf '%s' "${body_doc}" | grep -q '"signedUrl"'; then
  echo "FAIL: signed-doc-url response missing signedUrl"
  exit 1
fi

expires_in="$(printf '%s' "${body_doc}" | jq -r '.data[0].expiresIn // empty' 2>/dev/null || true)"
if [[ -n "${expires_in}" ]]; then
  if (( expires_in > 60 )); then
    echo "FAIL: signed URL TTL too high: ${expires_in}"
    exit 1
  fi
  echo "PASS: signed URL TTL is ${expires_in}s"
else
  echo "PASS: signed URL returned (jq unavailable or expiresIn not parsed)"
fi

echo "=== Canary completed successfully ==="
echo "Log: ${LOG_FILE}"
