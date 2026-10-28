#!/bin/sh
# Xcode Cloud — runs before xcodebuild.
#   1. Forces the PRODUCTION API target (cloud builds are distribution builds).
#   2. Uses Xcode Cloud's monotonic build number so every upload is unique.
set -e

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"

echo "Forcing API target to prod for this distribution build…"
(cd "$REPO_ROOT" && node scripts/set-target.js prod)

if [ -n "$CI_BUILD_NUMBER" ]; then
  cd "$REPO_ROOT/ios"
  echo "Setting build number to $CI_BUILD_NUMBER"
  agvtool new-version -all "$CI_BUILD_NUMBER"
else
  echo "CI_BUILD_NUMBER not set — keeping the project's build number."
fi
