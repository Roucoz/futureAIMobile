#!/usr/bin/env bash
# One-command iOS release:
#   1. point the app at the PRODUCTION API
#   2. bump the build number (required by App Store Connect)
#   3. archive with the local App Store profile (command-line overrides only)
#   4. export the signed App Store IPA
#
# NOTE: the Xcode project itself stays on *automatic* signing because Xcode Cloud
# requires it. Manual signing is applied only to this local build via overrides.
#
# Usage:  npm run bumpAndRelease
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS="$ROOT/ios"
LOG_DIR="$IOS/build/logs"
ARCHIVE="$IOS/build/Tuxon.xcarchive"
EXPORT_DIR="$IOS/build/export"
mkdir -p "$LOG_DIR"

echo "▶ 1/4 · Setting API target to prod"
(cd "$ROOT" && node scripts/set-target.js prod)

echo "▶ 2/4 · Bumping iOS build number"
(cd "$IOS" && bundle exec ruby "$ROOT/scripts/bump-build-number.rb")

echo "▶ 3/4 · Using local App Store profile (project stays on automatic signing for Xcode Cloud)"

echo "▶ 4/4 · Archiving (this takes a few minutes)…"
rm -rf "$ARCHIVE"
if ! (cd "$IOS" && xcodebuild \
      -workspace FutureAIMobile.xcworkspace \
      -scheme FutureAIMobile \
      -configuration Release \
      -destination 'generic/platform=iOS' \
      -archivePath "$ARCHIVE" \
      CODE_SIGN_STYLE=Manual \
      PROVISIONING_PROFILE_SPECIFIER="Tuxon App Store" \
      CODE_SIGN_IDENTITY="Apple Distribution" \
      archive > "$LOG_DIR/archive.log" 2>&1); then
  echo "✖ Archive failed — see $LOG_DIR/archive.log"
  grep -nE "error:|ARCHIVE FAILED" "$LOG_DIR/archive.log" | tail -20 || true
  exit 1
fi
echo "✔ Archive OK"

echo "▶ Exporting signed IPA…"
rm -rf "$EXPORT_DIR"
if ! (cd "$IOS" && xcodebuild \
      -exportArchive \
      -archivePath "$ARCHIVE" \
      -exportPath "$EXPORT_DIR" \
      -exportOptionsPlist ExportOptions.plist > "$LOG_DIR/export.log" 2>&1); then
  echo "✖ Export failed — see $LOG_DIR/export.log"
  grep -nE "error:|EXPORT FAILED" "$LOG_DIR/export.log" | tail -20 || true
  exit 1
fi

IPA="$EXPORT_DIR/FutureAIMobile.ipa"
if [ ! -f "$IPA" ]; then
  echo "✖ Expected IPA not found at $IPA"
  exit 1
fi

BUILD=$(plutil -extract CFBundleVersion raw -o - "$ARCHIVE/Products/Applications/FutureAIMobile.app/Info.plist" 2>/dev/null || echo "?")
VERSION=$(plutil -extract CFBundleShortVersionString raw -o - "$ARCHIVE/Products/Applications/FutureAIMobile.app/Info.plist" 2>/dev/null || echo "?")

echo
echo "✅ Release ready — version $VERSION ($BUILD)"
ls -lh "$IPA"
echo
echo "Next: upload with Transporter, or Xcode → Window → Organizer → Archives → Distribute App."
