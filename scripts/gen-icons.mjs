// Renders the MaxOne mark to the PNG sizes the platforms need. Run: node scripts/gen-icons.mjs
// (uses the sharp that ships with Next in customer/). The SVG favicons live in each app/icon.svg.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const sharp = require('../customer/node_modules/sharp');

// The mark: a rounded square and a bold "M" drawn as one stroke — two peaks, like a ledger line.
export const mark = (bg, pad = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect x="${pad}" y="${pad}" width="${512 - pad * 2}" height="${512 - pad * 2}" rx="${pad ? 0 : 112}" fill="${bg}"/>
  <path d="M136 372V150l120 132 120-132v222" fill="none" stroke="#FFFFFF" stroke-width="54" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const targets = [
  { app: 'frontend', bg: '#0F6E56', outs: [['frontend/app/apple-icon.png', 180, 0]] },
  {
    app: 'customer',
    bg: '#5B45B5',
    outs: [
      ['customer/app/apple-icon.png', 180, 0],
      ['customer/public/icons/icon-192.png', 192, 0],
      ['customer/public/icons/icon-512.png', 512, 0],
      // maskable: the safe zone is the inner 80%, so pad the artwork and fill the bleed with brand colour
      ['customer/public/icons/icon-512-maskable.png', 512, 0, true],
    ],
  },
];
for (const t of targets) {
  writeFileSync(`${t.app}/app/icon.svg`, mark(t.bg).trim() + '\n');
  for (const [out, size, , maskable] of t.outs) {
    mkdirSync(out.substring(0, out.lastIndexOf('/')), { recursive: true });
    const svg = maskable
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${t.bg}"/><g transform="translate(64 64) scale(0.75)">${mark(t.bg).replace(/<svg[^>]*>|<\/svg>/g, '')}</g></svg>`
      : mark(t.bg);
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
    console.log('wrote', out, `${size}px`);
  }
}
