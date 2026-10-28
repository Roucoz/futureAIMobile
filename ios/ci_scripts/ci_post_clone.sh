#!/bin/sh
# Xcode Cloud — runs after the repository is cloned.
# Installs Node + JS dependencies + CocoaPods so a React Native project can build.
set -e

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
echo "Repository root: $REPO_ROOT"
cd "$REPO_ROOT"

# Make Homebrew available regardless of how the image sets PATH.
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /usr/local/bin/brew ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

# --- Node / JS dependencies -------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "Node not found — installing via Homebrew…"
  brew install node
fi
node -v
npm -v

echo "Installing JS dependencies…"
npm ci --no-audit --no-fund

# --- CocoaPods --------------------------------------------------------------
# Xcode Cloud's system Ruby (2.6) does not have the Bundler version pinned in
# Gemfile.lock (2.4.22), which makes `bundle install` fail. Installing
# CocoaPods via Homebrew avoids that mismatch entirely (it ships its own Ruby).
if ! command -v pod >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "Installing CocoaPods via Homebrew…"
    brew install cocoapods
  else
    echo "Homebrew unavailable — falling back to the Bundler pinned in Gemfile.lock…"
    BUNDLER_VERSION="$(awk '/BUNDLED WITH/ { getline; gsub(/ /, ""); print }' "$REPO_ROOT/Gemfile.lock")"
    gem install bundler -v "$BUNDLER_VERSION" --user-install
    export PATH="$(ruby -e 'print Gem.user_dir')/bin:$PATH"
    bundle config set --local path 'vendor/bundle'
    bundle install
  fi
fi
pod --version

echo "Installing CocoaPods dependencies…"
cd "$REPO_ROOT/ios"
pod install --repo-update

echo "✅ Post-clone setup complete"
