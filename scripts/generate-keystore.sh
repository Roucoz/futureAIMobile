#!/usr/bin/env bash
# Generates the Android release keystore + keystore.properties (both git-ignored).
#
# ⚠️  WARNING — RUN THIS ONCE ONLY.
# The keystore you sign the FIRST Play Store upload with is the ONLY key that can
# sign future updates. Keep a safe backup (cloud vault + offline). If you lose it
# you CANNOT update the app — you'd have to publish a new app under a new id.
#
# If keystore.properties already exists this script refuses to overwrite it.
set -euo pipefail
cd "$(dirname "$0")/.."

KEYSTORE="android/tuxon-release.keystore"
PROPS="android/keystore.properties"

if [ -f "$PROPS" ]; then
  echo "✅ keystore.properties already exists at $PROPS — not regenerating."
  echo "   (Re-run only if you intend to create a BRAND-NEW app identity.)"
  exit 0
fi

STORE_PASS=$(openssl rand -hex 20)

keytool -genkeypair -v \
  -keystore "$KEYSTORE" \
  -alias tuxon \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$STORE_PASS" -keypass "$STORE_PASS" \
  -dname "CN=Tuxon, OU=Mobile, O=Tuxon, C=US" 2>&1 | tail -2

printf 'storeFile=../tuxon-release.keystore\nstorePassword=%s\nkeyAlias=tuxon\nkeyPassword=%s\n' \
  "$STORE_PASS" "$STORE_PASS" > "$PROPS"
chmod 600 "$PROPS"

echo
echo "✅ Created $KEYSTORE and $PROPS"
echo "🔐 BACK THIS UP somewhere safe (cloud vault + offline copy): $KEYSTORE"
echo "🔐 Back up the passwords in $PROPS too (or use `keytool -exportcert`-based recovery docs)."
