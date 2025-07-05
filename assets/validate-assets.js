#!/usr/bin/env node

/**
 * Asset Validation Script
 * Validates that all required assets exist and meet specifications
 */

const fs = require('fs');
const path = require('path');

const requiredAssets = [
  { name: 'icon.png', minSize: 100000 }, // ~100KB minimum
  { name: 'splash.png', minSize: 50000 },
  { name: 'adaptive-icon.png', minSize: 50000 },
  { name: 'favicon.png', minSize: 1000 }
];

console.log('🔍 Validating production assets...');

let allValid = true;

requiredAssets.forEach(asset => {
  const filePath = path.join(__dirname, asset.name);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Missing: ${asset.name}`);
    allValid = false;
  } else {
    const stats = fs.statSync(filePath);
    if (stats.size < asset.minSize) {
      console.log(`⚠️  ${asset.name} seems too small (${stats.size} bytes)`);
    } else {
      console.log(`✅ ${asset.name} (${Math.round(stats.size/1024)}KB)`);
    }
  }
});

if (allValid) {
  console.log('\n🎉 All assets validated successfully!');
  process.exit(0);
} else {
  console.log('\n❌ Some assets are missing. Please convert SVG files to PNG.');
  process.exit(1);
}
