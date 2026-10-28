#!/usr/bin/env ruby
# frozen_string_literal: true

# Reads the *installed* App Store provisioning profile for com.tuxon.app and
# configures iOS Release signing + ExportOptions.plist from it, so the Team ID
# is taken from Apple's own profile instead of being guessed.
#
# Usage: bundle exec ruby scripts/configure-ios-signing.rb [bundle-id]
#   default bundle-id: com.tuxon.app

require 'xcodeproj'
require 'json'

BUNDLE_ID = ARGV[0] || 'com.tuxon.app'
IOS_DIR   = File.expand_path('../ios', __dir__)
PROJ_PATH = File.join(IOS_DIR, 'FutureAIMobile.xcodeproj')
EXPORT_PLIST = File.join(IOS_DIR, 'ExportOptions.plist')

PROFILE_DIRS = [
  File.expand_path('~/Library/MobileDevice/Provisioning Profiles'),
  File.expand_path('~/Library/Developer/Xcode/UserData/Provisioning Profiles'),
].select { |d| Dir.exist?(d) }

def decode(path)
  # Provisioning profiles contain date fields that break `plutil -convert json`,
  # so parse with Python's plistlib (dates serialized as strings).
  out = `security cms -D -i "#{path}" 2>/dev/null | python3 -c '
import sys, plistlib, json
p = plistlib.loads(sys.stdin.buffer.read())
print(json.dumps(p, default=str))
' 2>/dev/null`
  return nil if out.strip.empty?
  JSON.parse(out)
rescue JSON::ParserError
  nil
end

profiles = PROFILE_DIRS.flat_map { |d| Dir[File.join(d, '*.mobileprovision')] }.filter_map do |file|
  plist = decode(file)
  next unless plist
  ent = plist['Entitlements'] || {}
  app_id = ent['application-identifier'].to_s
  next unless app_id.end_with?(BUNDLE_ID)
  {
    file: file,
    name: plist['Name'].to_s,
    team: Array(plist['TeamIdentifier']).first.to_s,
    aps: ent['aps-environment'].to_s,
    devices: Array(plist['ProvisionedDevices']).length,
    expires: plist['ExpirationDate'].to_s,
  }
end

if profiles.empty?
  abort <<~MSG
    ✖ No installed provisioning profile found for #{BUNDLE_ID}.

    Create it in developer.apple.com → Certificates, Identifiers & Profiles:
      Profiles → + → App Store → App ID "#{BUNDLE_ID}"
      → select your Apple Distribution certificate
      → Name it "Tuxon App Store" → Generate → Download
    Then double-click the .mobileprovision to install it and re-run this script.
  MSG
end

puts 'Found profiles:'
profiles.each do |p|
  puts "  • #{p[:name]} | team=#{p[:team]} | aps=#{p[:aps]} | devices=#{p[:devices]}"
end

# Prefer an App Store / production profile, else fall back to any match.
chosen = profiles.find { |p| p[:aps] == 'production' } || profiles.first
puts "\nUsing: #{chosen[:name]} (team #{chosen[:team]}, aps #{chosen[:aps]})"

# Warn if no distribution identity is installed yet.
identities = `security find-identity -v -p codesigning 2>/dev/null`
unless identities.include?('Apple Distribution')
  warn "\n⚠ No 'Apple Distribution' certificate found in the keychain."
  warn '  Create one: Xcode → Settings → Accounts → Manage Certificates… → + → Apple Distribution'
end

# --- Update the Xcode project (Release config only) ---
proj = Xcodeproj::Project.open(PROJ_PATH)
target = proj.targets.find { |t| t.name == 'FutureAIMobile' }
abort('FutureAIMobile target not found') unless target

release = target.build_configurations.find { |c| c.name == 'Release' }
release.build_settings['DEVELOPMENT_TEAM'] = chosen[:team]
release.build_settings['CODE_SIGN_STYLE'] = 'Manual'
release.build_settings['CODE_SIGN_IDENTITY'] = 'Apple Distribution'
release.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = chosen[:name]
proj.save
puts "✔ Xcode Release config: team=#{chosen[:team]}, profile=\"#{chosen[:name]}\""

# --- Update ExportOptions.plist ---
export = <<~XML
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
  \t<key>method</key>
  \t<string>app-store-connect</string>
  \t<key>teamID</key>
  \t<string>#{chosen[:team]}</string>
  \t<key>signingStyle</key>
  \t<string>manual</string>
  \t<key>provisioningProfiles</key>
  \t<dict>
  \t\t<key>#{BUNDLE_ID}</key>
  \t\t<string>#{chosen[:name]}</string>
  \t</dict>
  \t<key>uploadSymbols</key>
  \t<true/>
  \t<key>stripSwiftSymbols</key>
  \t<true/>
  </dict>
  </plist>
XML
File.write(EXPORT_PLIST, export)
puts "✔ ExportOptions.plist updated (team #{chosen[:team]})"
puts "\nReady to archive."
