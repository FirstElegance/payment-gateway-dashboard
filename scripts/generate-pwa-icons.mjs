import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(root, 'public', 'ec-icon.png');
const outDir = path.join(root, 'public', 'pwa');

const createRoundIcon = async (size, logoScale, filename) => {
  const logoPng = await sharp(source).png().toBuffer();
  const logoBase64 = logoPng.toString('base64');
  const padding = Math.round((size * (1 - logoScale)) / 2);
  const logoDim = size - padding * 2;
  const radius = size / 2;

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <clipPath id="clip">
          <circle cx="${radius}" cy="${radius}" r="${radius}" />
        </clipPath>
      </defs>
      <g clip-path="url(#clip)">
        <rect width="${size}" height="${size}" fill="#ffffff" />
        <image
          href="data:image/png;base64,${logoBase64}"
          x="${padding}"
          y="${padding}"
          width="${logoDim}"
          height="${logoDim}"
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </svg>`
  );

  await sharp(svg).png().toFile(path.join(outDir, filename));
};

await mkdir(outDir, { recursive: true });
await createRoundIcon(180, 0.72, 'icon-180-round.png');
await createRoundIcon(192, 0.72, 'icon-192-round.png');
await createRoundIcon(512, 0.72, 'icon-512-round.png');
await createRoundIcon(512, 0.58, 'icon-512-maskable.png');

console.log('Generated round PWA icons in public/pwa/');
