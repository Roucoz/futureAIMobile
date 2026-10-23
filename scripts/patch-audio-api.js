#!/usr/bin/env node

/**
 * Patch react-native-audio-api for older iOS SDKs.
 *
 * `react-native-audio-api@0.13.x` sets `AVAudioSessionCategoryOptionAllowBluetoothHFP`
 * unconditionally. That identifier only exists in the iOS 26 SDK (Apple renamed
 * `AVAudioSessionCategoryOptionAllowBluetooth` → `...HFP`); on Xcode 16 / iOS 18
 * SDKs the pod fails to compile with:
 *
 *   error use of undeclared identifier 'AVAudioSessionCategoryOptionAllowBluetoothHFP'
 *
 * The old name is the same option bit and still compiles on new SDKs (deprecated
 * at worst), so this rewrites the constant after install. The app never requests
 * `allowBluetoothHFP`; the ringtone only plays through the default output.
 *
 * Runs from `postinstall`, is idempotent, and does nothing when the package is
 * absent or already fixed.
 */

const fs = require('fs');
const path = require('path');

const RELATIVE =
  'node_modules/react-native-audio-api/ios/audioapi/ios/system/AudioSessionManager.mm';
const NEW_CONSTANT = 'AVAudioSessionCategoryOptionAllowBluetoothHFP';
const OLD_CONSTANT = 'AVAudioSessionCategoryOptionAllowBluetooth';

const file = path.join(__dirname, '..', RELATIVE);

if (!fs.existsSync(file)) {
  // Package not installed (fresh clone before npm install) — nothing to do.
  process.exit(0);
}

const source = fs.readFileSync(file, 'utf8');

if (!source.includes(NEW_CONSTANT)) {
  process.exit(0);
}

fs.writeFileSync(file, source.split(NEW_CONSTANT).join(OLD_CONSTANT), 'utf8');
console.log(
  `[patch-audio-api] ${NEW_CONSTANT} → ${OLD_CONSTANT} (iOS SDK compatibility)`,
);
