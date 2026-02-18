#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVIDENCE_DIR="$REPO_ROOT/release/evidence/store"
mkdir -p "$EVIDENCE_DIR"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/store_prepare_artifacts.sh [--platform ios|android|all] [--build]

Notes:
  - Without --build, this only prepares and validates evidence/checkpoints.
  - With --build, requires EXPO_TOKEN and may trigger an EAS cloud build.
EOF
}

PLATFORM="all"
RUN_BUILD=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    --build)
      RUN_BUILD=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" && "$PLATFORM" != "all" ]]; then
  echo "Unsupported platform: $PLATFORM"
  exit 1
fi

APP_JSON="$REPO_ROOT/mobile/app.json"
if [[ ! -f "$APP_JSON" ]]; then
  echo "Missing mobile/app.json"
  exit 1
fi

APP_SLUG="$(APP_JSON="$APP_JSON" node -e "const fs=require('fs'); const app=JSON.parse(fs.readFileSync(process.env.APP_JSON,'utf8')); console.log((app.expo && app.expo.slug) || 'mobile');")"
APP_OWNER="$(APP_JSON="$APP_JSON" node -e "const fs=require('fs'); const app=JSON.parse(fs.readFileSync(process.env.APP_JSON,'utf8')); console.log((app.expo && app.expo.owner) || 'YOUR_EXPO_ACCOUNT');")"
IOS_BUNDLE="$(APP_JSON="$APP_JSON" node -e "const fs=require('fs'); const app=JSON.parse(fs.readFileSync(process.env.APP_JSON,'utf8')); const ios=(app.expo && app.expo.ios) || {}; console.log(ios.bundleIdentifier || 'com.example.ios');")"
ANDROID_PACKAGE="$(APP_JSON="$APP_JSON" node -e "const fs=require('fs'); const app=JSON.parse(fs.readFileSync(process.env.APP_JSON,'utf8')); const android=(app.expo && app.expo.android) || {}; console.log(android.package || 'com.example.android');")"

TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
LOG_FILE="$EVIDENCE_DIR/store-prepare-artifacts-${TIMESTAMP}.txt"

{
  echo "Store artifact prep run"
  echo "Timestamp: $TIMESTAMP"
  echo "Repository: $REPO_ROOT"
  echo "Branch: $(cd "$REPO_ROOT" && git rev-parse --abbrev-ref HEAD)"
  echo "Commit: $(cd "$REPO_ROOT" && git rev-parse HEAD)"
  echo "Platform: $PLATFORM"
  echo "Expo app slug: $APP_SLUG"
  echo "Expo owner: $APP_OWNER"
  echo "iOS bundle id: $IOS_BUNDLE"
  echo "Android package: $ANDROID_PACKAGE"
  echo
  echo "Pre-flight checks:"
  echo "- Node: $(node -v)"
  echo "- npm: $(npm -v)"
  if [[ -n "${EXPO_TOKEN:-}" ]]; then
    echo "- EXPO_TOKEN: present"
  else
    echo "- EXPO_TOKEN: missing (manual upload required)"
  fi
  echo
  echo "Where to find artifacts after EAS upload:"
  echo "- Expo dashboard: https://expo.dev/accounts/${APP_OWNER}/projects/${APP_SLUG}/builds"
  echo "- iOS .ipa: Apple App Store Connect > My Apps > TestFlight"
  echo "- Android .aab: Google Play Console > Internal testing track"
  echo
} | tee "$LOG_FILE"

if [[ "$RUN_BUILD" == "true" ]]; then
  if [[ -z "${EXPO_TOKEN:-}" ]]; then
    echo "RUN_BUILD requested but EXPO_TOKEN is missing." >&2
    echo "Set EXPO_TOKEN and retry, or run without --build for offline checks." >&2
    exit 1
  fi

  if [[ ! -x "$(command -v npx)" ]]; then
    echo "npx not found in PATH" >&2
    exit 1
  fi

  echo "Starting EAS build with platform=$PLATFORM profile=production"
  (cd "$REPO_ROOT/mobile" && npx eas-cli build --platform "$PLATFORM" --profile production --non-interactive)
fi

echo "Artifact prep log: $LOG_FILE"
