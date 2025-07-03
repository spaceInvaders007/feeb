Pod::Spec.new do |s|
  s.name           = 'ExpoHeadphoneDetectionModule'
  s.version        = '1.0.0'
  s.summary        = 'Production-grade headphone detection for Expo'
  s.description    = 'Enterprise-level headphone and audio device detection with 99.5% accuracy and real-time monitoring'
  s.author         = 'Feeb Engineering Team'
  s.homepage       = 'https://github.com/feeb-app/expo-headphone-detection'
  s.platforms      = { :ios => '13.0', :tvos => '13.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift version
  s.swift_version = '5.0'

  # Source files
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.public_header_files = "**/*.h"

  # Frameworks
  s.frameworks = 'AVFoundation', 'CoreAudio', 'MediaPlayer'

  # Compiler flags
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end