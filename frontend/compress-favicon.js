const sharp = require('sharp');

sharp('public/favicon.png')
  .resize(256, 256, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  })
  .png({ 
    compressionLevel: 9, 
    quality: 80,
    palette: true
  })
  .toFile('public/favicon-compressed.png')
  .then(() => {
    console.log('✅ Favicon compressed successfully!');
    console.log('📁 File: public/favicon-compressed.png');
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });
