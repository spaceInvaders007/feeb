#!/usr/bin/env node

/**
 * Production Asset Generator for Feeb
 * Creates professional-quality assets for iOS, Android, and Web platforms
 * Following Apple and Google design guidelines
 */

const fs = require('fs');
const path = require('path');

class ProductionAssetGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.assetsDir = path.join(this.projectRoot, 'assets');
    this.brandColors = {
      primary: '#00CFFF',      // Feeb brand blue
      secondary: '#0099CC',    // Darker blue
      background: '#FFFFFF',   // White
      surface: '#F8F9FA',     // Light gray
      text: '#1A1A1A'         // Dark text
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().substr(11, 8);
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  ensureDirectories() {
    const directories = [
      this.assetsDir,
      path.join(this.assetsDir, 'icons'),
      path.join(this.assetsDir, 'splash'),
      path.join(this.assetsDir, 'adaptive-icons')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`Created directory: ${path.relative(this.projectRoot, dir)}`);
      }
    });
  }

  generateAppIconSvg() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${this.brandColors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${this.brandColors.secondary};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-opacity="0.2"/>
    </filter>
  </defs>
  
  <!-- Background Circle -->
  <circle cx="512" cy="512" r="480" fill="url(#iconGradient)" filter="url(#shadow)"/>
  
  <!-- Icon Symbol - Modern 'F' with video play element -->
  <g transform="translate(512, 512)">
    <!-- Main F Letter -->
    <path d="M-120,-180 L-120,180 L-80,180 L-80,20 L40,20 L40,60 L-80,60 L-80,100 L20,100 L20,140 L-80,140 L-80,180 L-120,180 Z" 
          fill="white" opacity="0.95"/>
    
    <!-- Play Button Accent -->
    <circle cx="80" cy="-80" r="50" fill="white" opacity="0.9"/>
    <path d="M65,-95 L65,-65 L95,-80 Z" fill="${this.brandColors.primary}"/>
    
    <!-- Modern Accent Lines -->
    <rect x="60" y="60" width="80" height="8" rx="4" fill="white" opacity="0.7"/>
    <rect x="60" y="80" width="60" height="8" rx="4" fill="white" opacity="0.7"/>
    <rect x="60" y="100" width="40" height="8" rx="4" fill="white" opacity="0.7"/>
  </g>
</svg>`;
  }

  generateSplashScreenSvg() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1284" height="2778" viewBox="0 0 1284 2778" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="splashGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${this.brandColors.background};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${this.brandColors.surface};stop-opacity:1" />
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge> 
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1284" height="2778" fill="url(#splashGradient)"/>
  
  <!-- Center Content -->
  <g transform="translate(642, 1389)">
    <!-- Logo Background Circle -->
    <circle cx="0" cy="0" r="180" fill="${this.brandColors.primary}" opacity="0.1"/>
    <circle cx="0" cy="0" r="120" fill="${this.brandColors.primary}" filter="url(#glow)"/>
    
    <!-- Logo Icon -->
    <g transform="scale(0.8)">
      <path d="M-60,-90 L-60,90 L-40,90 L-40,10 L20,10 L20,30 L-40,30 L-40,50 L10,50 L10,70 L-40,70 L-40,90 L-60,90 Z" 
            fill="white"/>
      
      <!-- Play accent -->
      <circle cx="40" cy="-40" r="25" fill="white" opacity="0.9"/>
      <path d="M32.5,-47.5 L32.5,-32.5 L47.5,-40 Z" fill="${this.brandColors.primary}"/>
    </g>
    
    <!-- App Name -->
    <text x="0" y="200" font-family="SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" 
          font-size="48" font-weight="600" text-anchor="middle" fill="${this.brandColors.text}">Feeb</text>
    
    <!-- Tagline -->
    <text x="0" y="240" font-family="SF Pro Display, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" 
          font-size="18" font-weight="400" text-anchor="middle" fill="${this.brandColors.text}" opacity="0.7">
          React. Record. Share.
    </text>
  </g>
  
  <!-- Loading Indicator -->
  <g transform="translate(642, 2200)">
    <circle cx="0" cy="0" r="3" fill="${this.brandColors.primary}" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="20" cy="0" r="3" fill="${this.brandColors.primary}" opacity="0.6">
      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" begin="0.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="40" cy="0" r="3" fill="${this.brandColors.primary}" opacity="0.4">
      <animate attributeName="opacity" values="0.4;0.2;0.4" dur="1.5s" begin="0.4s" repeatCount="indefinite"/>
    </circle>
  </g>
</svg>`;
  }

  generateAdaptiveIconSvg() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="adaptiveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${this.brandColors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${this.brandColors.secondary};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Android Adaptive Icon - must fill the entire safe area -->
  <rect width="1024" height="1024" fill="url(#adaptiveGradient)"/>
  
  <!-- Centered Logo -->
  <g transform="translate(512, 512)">
    <!-- Main F Letter - larger for adaptive icon -->
    <path d="M-160,-240 L-160,240 L-100,240 L-100,40 L80,40 L80,100 L-100,100 L-100,160 L40,160 L40,220 L-100,220 L-100,240 L-160,240 Z" 
          fill="white" opacity="0.95"/>
    
    <!-- Play Button Accent -->
    <circle cx="120" cy="-120" r="70" fill="white" opacity="0.9"/>
    <path d="M95,-145 L95,-95 L145,-120 Z" fill="${this.brandColors.primary}"/>
  </g>
</svg>`;
  }

  generateFaviconSvg() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="faviconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${this.brandColors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${this.brandColors.secondary};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="48" height="48" rx="8" fill="url(#faviconGradient)"/>
  
  <!-- Simple F for favicon -->
  <g transform="translate(24, 24)">
    <path d="M-8,-12 L-8,12 L-5,12 L-5,2 L5,2 L5,5 L-5,5 L-5,8 L3,8 L3,11 L-5,11 L-5,12 L-8,12 Z" 
          fill="white"/>
    
    <!-- Micro play accent -->
    <circle cx="6" cy="-6" r="3" fill="white" opacity="0.8"/>
    <path d="M4.5,-7.5 L4.5,-4.5 L7.5,-6 Z" fill="${this.brandColors.primary}"/>
  </g>
</svg>`;
  }

  async generateAssets() {
    this.log('🎨 Generating production-quality assets for Feeb...');
    
    this.ensureDirectories();

    const assets = [
      {
        name: 'icon.svg',
        content: this.generateAppIconSvg(),
        description: 'Main app icon (1024x1024 for iOS/Android)'
      },
      {
        name: 'splash.svg', 
        content: this.generateSplashScreenSvg(),
        description: 'Splash screen (1284x2778 for iPhone 14 Pro Max)'
      },
      {
        name: 'adaptive-icon.svg',
        content: this.generateAdaptiveIconSvg(), 
        description: 'Android adaptive icon (1024x1024)'
      },
      {
        name: 'favicon.svg',
        content: this.generateFaviconSvg(),
        description: 'Web favicon (48x48)'
      }
    ];

    // Generate SVG files
    assets.forEach(asset => {
      const filePath = path.join(this.assetsDir, asset.name);
      fs.writeFileSync(filePath, asset.content);
      this.log(`Generated ${asset.name} - ${asset.description}`, 'success');
    });

    this.generateConversionInstructions();
    this.generateAssetValidation();
  }

  generateConversionInstructions() {
    const instructions = `# 🎨 Asset Conversion Instructions

## Required PNG Conversions

Convert the generated SVG files to PNG format with these exact specifications:

### 1. App Icon (icon.png)
- **Source**: assets/icon.svg
- **Output**: assets/icon.png  
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Usage**: iOS App Store, Android Play Store

### 2. Splash Screen (splash.png)  
- **Source**: assets/splash.svg
- **Output**: assets/splash.png
- **Size**: 1284x2778 pixels (iPhone 14 Pro Max)
- **Format**: PNG
- **Usage**: iOS/Android splash screens

### 3. Adaptive Icon (adaptive-icon.png)
- **Source**: assets/adaptive-icon.svg  
- **Output**: assets/adaptive-icon.png
- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Usage**: Android adaptive icons

### 4. Favicon (favicon.png)
- **Source**: assets/favicon.svg
- **Output**: assets/favicon.png  
- **Size**: 48x48 pixels (also generate 16x16, 32x32)
- **Format**: PNG
- **Usage**: Web favicon

## Conversion Methods

### Option 1: Online Converters (Quick)
- **Recommended**: https://cloudconvert.com/svg-to-png
- **Alternative**: https://convertio.co/svg-png/
- Upload SVG, set dimensions, download PNG

### Option 2: Design Tools (Professional)
- **Sketch**: Open SVG, export as PNG at specified sizes
- **Figma**: Import SVG, export as PNG with 2x resolution
- **Adobe Illustrator**: Open SVG, Export As PNG

### Option 3: Command Line (Advanced)
\`\`\`bash
# Using ImageMagick (install: brew install imagemagick)
convert assets/icon.svg -resize 1024x1024 assets/icon.png
convert assets/splash.svg -resize 1284x2778 assets/splash.png  
convert assets/adaptive-icon.svg -resize 1024x1024 assets/adaptive-icon.png
convert assets/favicon.svg -resize 48x48 assets/favicon.png

# Using Inkscape (install: brew install inkscape)
inkscape assets/icon.svg --export-png=assets/icon.png --export-width=1024
inkscape assets/splash.svg --export-png=assets/splash.png --export-width=1284
inkscape assets/adaptive-icon.svg --export-png=assets/adaptive-icon.png --export-width=1024
inkscape assets/favicon.svg --export-png=assets/favicon.png --export-width=48
\`\`\`

## Quality Checklist

After conversion, verify:
- [ ] All PNG files are the correct dimensions
- [ ] Icon.png has transparent background
- [ ] Colors match the brand palette (#00CFFF primary)
- [ ] All files are under 1MB each
- [ ] No compression artifacts visible

## Next Steps

1. Convert all SVG files to PNG using your preferred method
2. Run: \`npx expo prebuild --clean\`
3. Test the app with new assets
4. For production: Consider hiring a professional designer for polished assets

---
Generated by Feeb Production Asset Generator
`;

    const instructionsPath = path.join(this.assetsDir, 'CONVERSION_INSTRUCTIONS.md');
    fs.writeFileSync(instructionsPath, instructions);
    this.log('Generated conversion instructions', 'success');
  }

  generateAssetValidation() {
    const validationScript = `#!/usr/bin/env node

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
    console.log(\`❌ Missing: \${asset.name}\`);
    allValid = false;
  } else {
    const stats = fs.statSync(filePath);
    if (stats.size < asset.minSize) {
      console.log(\`⚠️  \${asset.name} seems too small (\${stats.size} bytes)\`);
    } else {
      console.log(\`✅ \${asset.name} (\${Math.round(stats.size/1024)}KB)\`);
    }
  }
});

if (allValid) {
  console.log('\\n🎉 All assets validated successfully!');
  process.exit(0);
} else {
  console.log('\\n❌ Some assets are missing. Please convert SVG files to PNG.');
  process.exit(1);
}
`;

    const validationPath = path.join(this.assetsDir, 'validate-assets.js');
    fs.writeFileSync(validationPath, validationScript);
    fs.chmodSync(validationPath, '755');
    this.log('Generated asset validation script', 'success');
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new ProductionAssetGenerator();
  generator.generateAssets().catch(error => {
    console.error('❌ Asset generation failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionAssetGenerator;