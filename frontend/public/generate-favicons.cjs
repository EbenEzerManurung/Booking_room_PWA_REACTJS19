const sharp = require('sharp');
const fs = require('fs');

const sizes = [16, 32, 48, 64, 128, 180, 256];
const inputFile = 'favicon.png';

if (!fs.existsSync(inputFile)) {
  console.error('❌ favicon.png not found!');
  process.exit(1);
}

async function generateIcons() {
  console.log('🔄 Generating favicons...');
  
  for (const size of sizes) {
    try {
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png({ compressionLevel: 9 })
        .toFile(`favicon-${size}x${size}.png`);
      console.log(`✅ Generated ${size}x${size}`);
    } catch (err) {
      console.error(`❌ Error generating ${size}x${size}:`, err.message);
    }
  }
  
  console.log('✅ All favicons generated!');
}

generateIcons();
