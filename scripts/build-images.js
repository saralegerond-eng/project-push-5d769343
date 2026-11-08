/**
 * BON CHOIX — image pipeline
 * ------------------------------------------------------------------
 * Enhances the supplied product photography for the landing page and
 * exports responsive WebP assets. Product design, packaging and labels
 * are never altered: only lighting, contrast, sharpness and cropping.
 *
 * Run: npm run build:images
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'assets', 'source');
const OUT = path.join(__dirname, '..', 'assets', 'img');

const source = (needle) => {
  const file = fs.readdirSync(SRC).find((name) => name.includes(needle));
  if (!file) throw new Error(`Missing source image: ${needle}`);
  return path.join(SRC, file);
};

// 15-day kit with 4 bands + lifestyle context (hero)
const HERO = source('165');
// 30-day sheets (used only for a neutral patch close-up)
const PATCH_SHEET = source('166');
// 15-day kit, box + patches + applicator + lifestyle context
const KIT = source('167');

const enhance = (input, output, { width, extract, quality = 88 }) => {
  let image = sharp(input);
  if (extract) image = image.extract(extract);
  return image
    .resize({ width, kernel: 'lanczos3' })
    .modulate({ brightness: 1.03, saturation: 1.035 })
    .linear(1.045, -3)
    .sharpen({ sigma: 0.72, m1: 0.5, m2: 1.1 })
    .webp({ quality, effort: 6 })
    .toFile(output);
};

const responsive = async (input, base, widths, options = {}) => {
  for (const width of widths) {
    await enhance(input, path.join(OUT, `${base}-${width}.webp`), {
      ...options,
      width,
    });
  }
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  // Hero — full 15-day kit with the four black intake bands
  await responsive(HERO, 'hero-kit', [480, 800, 1200]);

  // What's included / offer — clean 15-day kit presentation
  await responsive(KIT, 'kit', [480, 800, 1200]);

  // Lifestyle crop — couple sleeping peacefully
  await responsive(
    KIT,
    'sleep',
    [480, 800, 1000],
    { extract: { left: 420, top: 0, width: 400, height: 330 } }
  );

  // Four intake bands close-up
  await responsive(
    HERO,
    'bands',
    [400, 800],
    { extract: { left: 520, top: 620, width: 307, height: 203 } }
  );

  // Adhesive applications close-up (neutral crop, no day-count label)
  await responsive(
    PATCH_SHEET,
    'patches',
    [400, 600],
    { extract: { left: 490, top: 70, width: 297, height: 340 } }
  );

  // Magnetic applicator close-up
  await responsive(
    HERO,
    'applicator',
    [200, 400],
    { extract: { left: 285, top: 700, width: 140, height: 123 } }
  );

  // Open Graph card (1200 x 630)
  const kitBuffer = await sharp(KIT)
    .resize({ height: 520, kernel: 'lanczos3' })
    .modulate({ brightness: 1.03, saturation: 1.035 })
    .linear(1.045, -3)
    .sharpen({ sigma: 0.7, m1: 0.45, m2: 1.0 })
    .png()
    .toBuffer();

  const overlay = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f2fcff"/>
          <stop offset="0.55" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#e9fbf7"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <circle cx="1080" cy="80" r="190" fill="#d8f7f2" opacity="0.55"/>
      <circle cx="130" cy="560" r="150" fill="#e3f5ff" opacity="0.8"/>
      <text x="70" y="170" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="4" fill="#0b2545">BON CHOIX</text>
      <text x="70" y="245" font-family="Segoe UI, Arial, sans-serif" font-size="54" font-weight="800" fill="#0b2545">Premier Nasal Dilator</text>
      <text x="70" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="500" fill="#4b6478">Starter Kit — 15 days</text>
      <rect x="70" y="350" width="300" height="86" rx="43" fill="#16a34a"/>
      <text x="220" y="405" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">199 DH ONLY</text>
      <text x="70" y="500" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="#0f766e">FREE DELIVERY ALL OVER MOROCCO</text>
      <text x="70" y="540" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600" fill="#0f766e">CASH ON DELIVERY</text>
      <text x="70" y="590" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="500" fill="#6b8299">bonchoix.ma</text>
    </svg>
  `);

  await sharp({
    create: { width: 1200, height: 630, channels: 3, background: '#ffffff' },
  })
    .composite([
      { input: overlay, left: 0, top: 0 },
      { input: kitBuffer, left: 660, top: 55 },
    ])
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toFile(path.join(OUT, 'og-image.jpg'));

  console.log('✓ Images built in assets/img');
})();
