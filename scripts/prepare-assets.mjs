import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePythonBin } from './runtime-paths.mjs';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const ROOT = process.env.ASSET_OUTPUT_ROOT || PROJECT_ROOT;
const SOURCE = join(PROJECT_ROOT, '参考');
const CATEGORIES = ['光影', '形式', '表面', '风光', '建筑', '陌生人', '生物'];
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.heic']);
const bundledHeifConvert = join(dirname(process.execPath), '..', '..', 'bin', 'override', 'heif-convert');
const heifConvert = existsSync(bundledHeifConvert) ? bundledHeifConvert : 'heif-convert';

const slugify = (value) => Buffer.from(value, 'utf8').toString('hex');
const readCreation = (file) => {
  const output = execFileSync('sips', ['-g', 'creation', file], { encoding: 'utf8' });
  const match = output.match(/creation: (\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}` : null;
};
const readDimensions = (file) => {
  const output = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  return {
    width: Number(output.match(/pixelWidth: (\d+)/)?.[1]),
    height: Number(output.match(/pixelHeight: (\d+)/)?.[1]),
  };
};

const makeJpeg = (source, target, longestEdge, quality) => {
  let conversionSource = source;
  if (extname(source).toLowerCase() === '.heic') {
    conversionSource = `${target}.source.jpg`;
    execFileSync(heifConvert, ['-q', '95', source, conversionSource], { stdio: 'ignore' });
  }
  execFileSync('sips', [
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', String(quality),
    '-Z', String(longestEdge),
    conversionSource,
    '--out', target,
  ], { stdio: 'ignore' });
  if (conversionSource !== source) rmSync(conversionSource, { force: true });
};
const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

mkdirSync(join(ROOT, 'assets/images'), { recursive: true });
rmSync(join(ROOT, 'assets/photos'), { recursive: true, force: true });
mkdirSync(join(ROOT, 'assets/photos', 'thumbnails'), { recursive: true });
mkdirSync(join(ROOT, 'assets/photos', 'full'), { recursive: true });
mkdirSync(join(ROOT, 'assets/js'), { recursive: true });

copyFileSync(join(SOURCE, '证件照.png'), join(ROOT, 'assets/images/portrait.png'));
execFileSync('sips', ['-Z', '1800', join(ROOT, 'assets/images/portrait.png')]);

execFileSync(
  resolvePythonBin(),
  [join(PROJECT_ROOT, 'scripts/make-logo-black.py'), join(SOURCE, 'logo-four-colors.png'), join(ROOT, 'assets/images/logo-black.png')],
);

const records = [];
for (const category of CATEGORIES) {
  const sourceDir = join(SOURCE, 'photos', category);
  const thumbnailDir = join(ROOT, 'assets/photos', 'thumbnails', category);
  const fullDir = join(ROOT, 'assets/photos', 'full', category);
  mkdirSync(thumbnailDir, { recursive: true });
  mkdirSync(fullDir, { recursive: true });
  for (const name of readdirSync(sourceDir).filter((item) => IMAGE_EXTENSIONS.has(extname(item).toLowerCase())).sort()) {
    const sourceFile = join(sourceDir, name);
    const title = basename(name, extname(name));
    const id = slugify(`${category}-${title}`);
    const thumbnailFile = join(thumbnailDir, `${id}.jpg`);
    const fullFile = join(fullDir, `${id}.jpg`);
    makeJpeg(sourceFile, fullFile, 1400, 68);
    makeJpeg(fullFile, thumbnailFile, 560, 65);
    const { width, height } = readDimensions(fullFile);
    const thumbnailSrc = `./${relative(ROOT, thumbnailFile).split('\\').join('/')}`;
    const fullSrc = `./${relative(ROOT, fullFile).split('\\').join('/')}`;
    records.push({
      id,
      title,
      category,
      date: readCreation(sourceFile),
      thumbnailSrc,
      fullSrc,
      src: fullSrc,
      width,
      height,
      alt: `${category}摄影作品：${title}`,
    });
  }
}

records.sort((a, b) => {
  if (a.date && b.date) return b.date.localeCompare(a.date);
  if (a.date) return -1;
  if (b.date) return 1;
  return a.title.localeCompare(b.title, 'zh-CN');
});

writeFileSync(
  join(ROOT, 'assets/js/photo-data.js'),
  `export const PHOTO_DATA = Object.freeze(${JSON.stringify(records, null, 2)});\n`,
);

const photographyPath = join(ROOT, 'photography.html');
const photographyHtml = readFileSync(photographyPath, 'utf8');
if (!/<!-- PHOTO_GRID_START -->[\s\S]*?<!-- PHOTO_GRID_END -->/.test(photographyHtml)) {
  throw new Error('photography.html is missing static grid markers');
}
const staticGrid = records.map((photo) => [
  `      <a class="photo-card" id="${photo.id}" data-photo-id="${photo.id}" href="${photo.fullSrc}" aria-label="打开摄影作品完整图：${escapeHtml(photo.title)}">`,
  `        <img src="${photo.thumbnailSrc}" alt="${escapeHtml(photo.alt)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async">`,
  `        <span class="photo-fallback" aria-hidden="true">${escapeHtml(photo.title)}</span>`,
  '      </a>',
].join('\n')).join('\n');
const nextPhotographyHtml = photographyHtml.replace(
  /      <!-- PHOTO_GRID_START -->[\s\S]*?      <!-- PHOTO_GRID_END -->/,
  `      <!-- PHOTO_GRID_START -->\n${staticGrid}\n      <!-- PHOTO_GRID_END -->`,
);
writeFileSync(photographyPath, nextPhotographyHtml);
