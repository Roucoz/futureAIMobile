#!/usr/bin/env ruby
# frozen_string_literal: true

# Increments CURRENT_PROJECT_VERSION (the iOS build number) on the FutureAIMobile
# target so every upload to App Store Connect has a unique build number.
#
# Usage: bundle exec ruby scripts/bump-build-number.rb
require 'xcodeproj'

PROJ_PATH = File.expand_path('../ios/FutureAIMobile.xcodeproj', __dir__)

proj = Xcodeproj::Project.open(PROJ_PATH)
target = proj.targets.find { |t| t.name == 'FutureAIMobile' }
abort('FutureAIMobile target not found') unless target

current = target.build_configurations.map { |c| c.build_settings['CURRENT_PROJECT_VERSION'].to_i }.max
new_version = current + 1

target.build_configurations.each do |c|
  c.build_settings['CURRENT_PROJECT_VERSION'] = new_version.to_s
end
# Keep project-level configs in sync too (used by some tooling).
proj.build_configurations.each do |c|
  c.build_settings['CURRENT_PROJECT_VERSION'] = new_version.to_s
end

proj.save
puts "Build number: #{current} -> #{new_version}"
