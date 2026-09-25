#!/usr/bin/env ruby
# frozen_string_literal: true

# Configures the iOS Xcode project for release publishing.
#
#   * Sets PRODUCT_BUNDLE_IDENTIFIER  -> com.tuxon.app  (both Debug & Release)
#   * Sets CODE_SIGN_STYLE            -> Automatic
#   * Adds TUXON_DISPLAY_NAME         -> Tuxon   (consumed by Info.plist)
#   * Adds a build phase that swaps in the dev GoogleService-Info.plist when
#     TUXON_ENV=dev (used for the "Tuxon Dev" app, bundle id com.tuxon.dev).
#
# Run:  bundle exec ruby scripts/configure-ios-project.rb
require 'xcodeproj'

IOS_DIR   = File.expand_path('../ios', __dir__)
PROJ_PATH = File.join(IOS_DIR, 'FutureAIMobile.xcodeproj')
TARGET    = 'FutureAIMobile'
BUNDLE_ID = 'com.tuxon.app'
DISPLAY   = 'Tuxon'

proj = Xcodeproj::Project.open(PROJ_PATH)
target = proj.targets.find { |t| t.name == TARGET }
abort("Target #{TARGET} not found") unless target

target.build_configurations.each do |config|
  s = config.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = BUNDLE_ID
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['TUXON_DISPLAY_NAME'] = DISPLAY
  puts "  #{config.name}: bundle id=#{BUNDLE_ID}, display=#{DISPLAY}, signing=Automatic"
end

# Build phase: pick the right GoogleService-Info.plist for the built app.
#   prod (default):  GoogleService-Info.plist       (com.tuxon.app)
#   dev (TUXON_ENV): GoogleService-Info-Dev.plist   (com.tuxon.dev)
swap_script = <<~SH
  # TUXON app env (defaults to prod). Set TUXON_ENV=dev when archiving the dev app.
  if [ "$TUXON_ENV" = "dev" ]; then
    SRC="$SRCROOT/FutureAIMobile/GoogleService-Info-Dev.plist"
    if [ ! -f "$SRC" ]; then
      echo "warning: TUXON_ENV=dev but GoogleService-Info-Dev.plist not found. Download it from Firebase (com.tuxon.dev)."
      exit 0
    fi
  else
    SRC="$SRCROOT/FutureAIMobile/GoogleService-Info.plist"
  fi
  DEST="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/GoogleService-Info.plist"
  if [ -n "$DEST" ]; then
    cp "$SRC" "$DEST"
    echo "GoogleService-Info.plist -> $TUXON_ENV (default prod)"
  fi
SH

# Remove any previous copy of the phase to keep the script idempotent.
target.build_phases.delete_if do |phase|
  phase.respond_to?(:name) && phase.name == 'Select GoogleService-Info.plist'
end
phase = target.new_shell_script_build_phase('Select GoogleService-Info.plist')
phase.shell_script = swap_script

proj.save
puts "Saved #{PROJ_PATH}"
