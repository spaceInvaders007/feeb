const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Store original resolver
const originalResolveRequest = config.resolver.resolveRequest;

// Simple but effective resolver debugging
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only log if we find the problematic undefined module
  if (moduleName === 'undefined' || moduleName === undefined || moduleName === null || moduleName === '') {
    console.error('\n❌ ============ FOUND THE UNDEFINED MODULE! ============');
    console.error(`❌ Module name: "${moduleName}"`);
    console.error(`❌ Origin file: ${context.originModulePath}`);
    console.error(`❌ Platform: ${platform}`);
    console.error('❌ ==================================================\n');
    
    // Show the problematic file content
    if (context.originModulePath) {
      try {
        const fs = require('fs');
        const content = fs.readFileSync(context.originModulePath, 'utf8');
        console.error('📄 Problematic file content:');
        console.error(content.substring(0, 1000)); // First 1000 chars
        console.error('\n📄 End of file content\n');
      } catch (error) {
        console.error('❌ Could not read file:', error.message);
      }
    }
    
    throw new Error(
      `UNDEFINED MODULE ERROR!\n` +
      `Module: "${moduleName}"\n` +
      `Origin: ${context.originModulePath}\n` +
      `Check the file content logged above.`
    );
  }
  
  // Normal resolution
  try {
    return originalResolveRequest
      ? originalResolveRequest(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    // Only log resolution failures for our module
    if (moduleName && moduleName.includes('headphone')) {
      console.error(`❌ Failed to resolve headphone module: "${moduleName}"`);
      console.error(`   From: ${context.originModulePath}`);
      console.error(`   Error: ${error.message}`);
    }
    throw error;
  }
};

// Add alias to help resolve our module correctly
config.resolver.alias = {
  ...config.resolver.alias,
  'expo-headphone-detection': path.resolve(__dirname, 'modules/expo-headphone-detection/build/index.js')
};

// Ensure we can resolve files from the modules directory
config.resolver.nodeModulesPaths = [
  ...config.resolver.nodeModulesPaths,
  path.resolve(__dirname, 'modules')
];

console.log('🔧 [METRO] Simple debugging config loaded');
console.log('🔧 [METRO] Alias for expo-headphone-detection:', path.resolve(__dirname, 'modules/expo-headphone-detection/build/index.js'));

module.exports = config;