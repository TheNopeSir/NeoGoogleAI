// scripts/generate-icons.js
// Generates all PWA/favicon PNG icons from the source SVG using Sharp
// Run: node scripts/generate-icons.js

import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

// Ensure public dir exists
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

// Base icon SVG — rounded corners, green background, bold "NA"
const baseSvg = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" rx="90" ry="90" fill="#4ade80"/>
  <text
    x="256"
    y="348"
    font-family="Arial Black, Arial Bold, Impact, Helvetica Neue, Arial, sans-serif"
    font-size="264"
    font-weight="900"
    text-anchor="middle"
    fill="#000000"
    letter-spacing="-6"
  >NA</text>
</svg>`);

// Maskable icon SVG — full bleed (no rounded corners, safe zone is center 80%)
// Safe zone: content fits within inner 80% circle → letters at ~80% scale, centered
const maskableSvg = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" fill="#4ade80"/>
  <text
    x="256"
    y="326"
    font-family="Arial Black, Arial Bold, Impact, Helvetica Neue, Arial, sans-serif"
    font-size="210"
    font-weight="900"
    text-anchor="middle"
    fill="#000000"
    letter-spacing="-4"
  >NA</text>
</svg>`);

const icons = [
  // Browser favicons
  { name: 'favicon-32.png',        svg: baseSvg,     size: 32  },
  { name: 'favicon-16.png',        svg: baseSvg,     size: 16  },
  // Apple touch icon (used by iOS for home screen + bookmarks)
  { name: 'apple-touch-icon.png',  svg: baseSvg,     size: 180 },
  // PWA manifest icons
  { name: 'icon-192.png',          svg: baseSvg,     size: 192 },
  { name: 'icon-512.png',          svg: baseSvg,     size: 512 },
  // Maskable icon (Android adaptive icon — full bleed)
  { name: 'maskable-icon-512.png', svg: maskableSvg, size: 512 },
];

async function generate() {
  console.log('Generating PWA & favicon icons...\n');

  for (const { name, svg, size } of icons) {
    const outPath = join(publicDir, name);
    try {
      await sharp(svg(size))
        .resize(size, size)
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(outPath);
      console.log(`  ✓  ${name}  (${size}×${size})`);
    } catch (err) {
      console.error(`  ✗  ${name}: ${err.message}`);
    }
  }

  console.log('\nDone! Files saved to /public/');
}

generate();
