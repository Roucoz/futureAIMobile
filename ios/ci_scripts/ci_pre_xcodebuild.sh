#!/bin/sh
# Xcode Cloud — runs before xcodebuild.
# Uses Xcode Cloud's monotonic build number so every TestFlight/App Store
# upload has a unique build number (avoids duplicate-build rejections).
set -e

if [ -n "$CI_BUILD_NUMBER" ]; then
  REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
  cd "$REPO_ROOT/ios"
  echo "Setting build number to $CI_BUILD_NUMBER"
  agvtool new-version -all "$CI_BUILD_NUMBER"
else
  echo "CI_BUILD_NUMBER not set — keeping the project's build number."
fi
