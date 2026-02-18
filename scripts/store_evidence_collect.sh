#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/store_evidence_collect.sh <testflight|play> [options]

Options:
  --build-version <text>   Human/build version label (required in run notes)
  --build-link <url>       Link to App Store Connect build (for TestFlight)
  --report-url <url>       Pre-launch report URL (for Play)
  --artifacts <paths>      Comma/space-separated local artifact paths to keep
  --notes <text>           Free-form evidence notes
  --status <text>          status text (PASS/FAIL/PARTIAL)
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

TARGET="$1"
shift

if [[ "$TARGET" != "testflight" && "$TARGET" != "play" ]]; then
  echo "Invalid evidence target: $TARGET"
  usage
  exit 1
fi

BUILD_VERSION="${BUILD_VERSION:-}"
BUILD_LINK="${BUILD_LINK:-}"
REPORT_URL="${REPORT_URL:-}"
ARTIFACTS="${ARTIFACTS:-}"
NOTES="${NOTES:-}"
STATUS="${STATUS:-PENDING}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-version)
      BUILD_VERSION="$2"
      shift 2
      ;;
    --build-link)
      BUILD_LINK="$2"
      shift 2
      ;;
    --report-url)
      REPORT_URL="$2"
      shift 2
      ;;
    --artifacts)
      ARTIFACTS="$2"
      shift 2
      ;;
    --notes)
      NOTES="$2"
      shift 2
      ;;
    --status)
      STATUS="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1"
      usage
      exit 1
      ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVIDENCE_DIR="$REPO_ROOT/release/evidence/store"
mkdir -p "$EVIDENCE_DIR"

TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [[ "$TARGET" == "testflight" ]]; then
  TARGET_FILE="$EVIDENCE_DIR/testflight-smoke-notes.md"
  HEADER="## TestFlight evidence run"
else
  TARGET_FILE="$EVIDENCE_DIR/play-prelaunch-report.md"
  HEADER="## Play pre-launch evidence run"
fi

{
  echo
  echo "$HEADER"
  echo "- Timestamp (UTC): $TIMESTAMP"
  echo "- Branch: $(cd "$REPO_ROOT" && git rev-parse --abbrev-ref HEAD)"
  echo "- Commit: $(cd "$REPO_ROOT" && git rev-parse HEAD)"
  echo "- Build version: ${BUILD_VERSION:-n/a}"
  if [[ "$TARGET" == "testflight" ]]; then
    echo "- TestFlight build link: ${BUILD_LINK:-n/a}"
  else
    echo "- Play pre-launch report URL: ${REPORT_URL:-n/a}"
  fi
  echo "- Evidence status: $STATUS"
  echo "- Artifact paths: ${ARTIFACTS:-n/a}"
  echo "- Notes: ${NOTES:-n/a}"
  echo "- Screenshot/video requirement: save screenshots under release/evidence/store/ and link them here"
  echo
} >> "$TARGET_FILE"

echo "Updated $TARGET_FILE"
