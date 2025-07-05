// Create a file: test-headphone.ts
console.log('Testing expo-headphone-detection import...');

try {
  const headphoneModule = require('expo-headphone-detection');
  console.log('✅ Module imported successfully:', headphoneModule);
} catch (error) {
  console.error('❌ Module import failed:', error);
}

try {
  const { isHeadphoneConnectedAsync } = require('expo-headphone-detection');
  console.log('✅ Named import successful:', typeof isHeadphoneConnectedAsync);
} catch (error) {
  console.error('❌ Named import failed:', error);
}