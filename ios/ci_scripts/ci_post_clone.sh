#!/bin/sh
# Xcode Cloud — runs after the repository is cloned.
# Installs Node + JS dependencies + CocoaPods so a React Native project can build.
set -e

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
echo "Repository root: $REPO_ROOT"
cd "$REPO_ROOT"

# React Native 0.85 needs Node >= 22.11
if ! command -v node >/dev/null 2>&1; then
  echo "Node not found — installing via Homebrew…"
  brew install node
fi
node -v
npm -v

echo "Installing JS dependencies…"
npm ci

echo "Installing CocoaPods dependencies…"
cd "$REPO_ROOT/ios"
bundle config set --local path 'vendor/bundle'
bundle install
bundle exec pod install --repo-update

echo "✅ Post-clone setup complete"
