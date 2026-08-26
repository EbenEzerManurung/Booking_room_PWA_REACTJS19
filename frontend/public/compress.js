const sharp = require('sharp');
sharp('favicon.png')
  .resize(32, 32)
  .png({ compressionLevel: 9, quality: 80 })
  .toFile('favicon-32x32.png')
  .then(() => console.log('✅ Favicon compressed!'));
