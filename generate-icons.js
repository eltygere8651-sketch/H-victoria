import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/logo_app.svg');

const targets = [
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'apple-icon-180x180.png', size: 180 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'apple-touch-icon-precomposed.png', size: 180 },
  { name: 'favicon.png', size: 32 }
];

async function generate() {
  console.log('Generating PWA icons from SVG...');
  for (const target of targets) {
    const dest = path.resolve('public', target.name);
    await sharp(svgPath)
      .resize(target.size, target.size)
      .png()
      .toFile(dest);
    console.log(`Generated: ${target.name} (${target.size}x${target.size})`);
    
    // Copy also to dist if it exists
    const distDest = path.resolve('dist', target.name);
    if (fs.existsSync(path.resolve('dist'))) {
      fs.copyFileSync(dest, distDest);
      console.log(`Copied to dist: ${target.name}`);
    }
  }
  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
