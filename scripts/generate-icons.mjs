// Regenerates every PWA icon from a single source SVG.
//
// The logo's magnifying-glass handle reaches the edge of its original 200×200
// viewBox. iOS rounds home-screen corners and Android "maskable" icons crop to
// a circle, so we add safe padding around the mark before rasterizing.
//
// Two variants are produced:
//   - icon-*.png        (any): logo at ~86% of canvas, small padding
//   - icon-maskable-*.png (maskable): logo at ~66% of canvas, big safe zone
//
// Run:  node scripts/generate-icons.mjs

import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const BG = "#0a0a0a";
const DIM = "#18181b";
const ORANGE = "#f97316";

// The original logo paths live in a 200×200 coordinate space. We embed them
// inside a larger <svg> viewBox to create padding without redrawing anything.
function logoSVG({ canvas, inset }) {
  const innerSize = canvas - inset * 2;
  const scale = innerSize / 200;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">
  <rect width="${canvas}" height="${canvas}" fill="${BG}"/>
  <g transform="translate(${inset} ${inset}) scale(${scale})">
    <path d="M 100 100 L 100 55 A 45 45 0 0 1 145 100 Z" fill="${DIM}"/>
    <path d="M 100 100 L 100 145 A 45 45 0 0 1 55 100 Z" fill="${DIM}"/>
    <path d="M 100 100 L 55 100 A 45 45 0 0 1 100 55 Z" fill="${DIM}"/>
    <path d="M 100 100 L 175 100 A 75 75 0 0 1 100 175 Z" fill="${ORANGE}"/>
    <circle cx="100" cy="100" r="60" fill="none" stroke="${ORANGE}" stroke-width="30"/>
    <line x1="132" y1="132" x2="180" y2="180" stroke="${ORANGE}" stroke-width="28" stroke-linecap="round"/>
  </g>
</svg>`;
}

async function renderPNG(svg, size, outPath) {
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(outPath, buf);
  console.log(`✓ ${outPath.split("/").pop()} (${buf.length.toLocaleString()} bytes)`);
}

async function main() {
  // "any" variant — small padding so the logo reads large on iOS home screen
  // (iOS rounds the corners ~20%, so ~7% inset keeps the handle safe).
  const anyPadding = Math.round(200 * 0.07);

  // "maskable" variant — big safe zone for Android circular masks
  // (spec recommends logo in center 80%, so we pad ~17% on each side).
  const maskPadding = Math.round(200 * 0.17);

  const anySvg = logoSVG({ canvas: 200, inset: anyPadding });
  const maskSvg = logoSVG({ canvas: 200, inset: maskPadding });

  // apple-touch-icon: 180×180, small padding variant
  await renderPNG(anySvg, 180, join(publicDir, "apple-touch-icon.png"));

  // Generic "any" icons used by manifest + browsers
  await renderPNG(anySvg, 192, join(publicDir, "icon-192.png"));
  await renderPNG(anySvg, 512, join(publicDir, "icon-512.png"));

  // Maskable variants for Android home-screen adaptive icons
  await renderPNG(maskSvg, 192, join(publicDir, "icon-maskable-192.png"));
  await renderPNG(maskSvg, 512, join(publicDir, "icon-maskable-512.png"));

  // Favicons (small PNGs and an updated .ico)
  await renderPNG(anySvg, 16, join(publicDir, "favicon-16x16.png"));
  await renderPNG(anySvg, 32, join(publicDir, "favicon-32x32.png"));

  console.log("\nAll icons regenerated from icon.svg.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
