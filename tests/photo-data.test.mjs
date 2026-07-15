import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHOTO_DATA } from '../assets/js/photo-data.js';

const hashTree = (directory) => {
  const entries = [];
  const walk = (path) => {
    for (const item of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(path, item.name);
      if (item.isDirectory()) walk(full);
      else entries.push([full, createHash('sha256').update(readFileSync(full)).digest('hex')]);
    }
  };
  walk(directory);
  return entries;
};

test('photo manifest is complete and deployable', () => {
  assert.equal(PHOTO_DATA.length, 217);
  for (const photo of PHOTO_DATA) {
    assert.match(photo.id, /^[a-z0-9-]+$/);
    assert.ok(['光影', '形式', '表面', '风光', '建筑', '陌生人', '生物'].includes(photo.category));
    assert.ok(photo.title.length > 0);
    assert.ok(photo.alt.length > 0);
    assert.match(photo.thumbnailSrc, /^\.\/assets\/photos\/thumbnails\/.+\.jpg$/);
    assert.match(photo.fullSrc, /^\.\/assets\/photos\/full\/.+\.jpg$/);
    assert.equal(photo.src, photo.fullSrc);
    assert.ok(Number.isInteger(photo.width) && photo.width > 0);
    assert.ok(Number.isInteger(photo.height) && photo.height > 0);
    assert.equal(photo.src.includes('/Users/'), false);
    assert.equal(existsSync(new URL(`../${photo.thumbnailSrc.replace('./', '')}`, import.meta.url)), true);
    assert.equal(existsSync(new URL(`../${photo.fullSrc.replace('./', '')}`, import.meta.url)), true);
  }
});

test('optimized photography assets stay within deployment budgets', () => {
  const thumbnails = PHOTO_DATA.map((photo) => new URL(`../${photo.thumbnailSrc.replace('./', '')}`, import.meta.url));
  const full = PHOTO_DATA.map((photo) => new URL(`../${photo.fullSrc.replace('./', '')}`, import.meta.url));
  const thumbnailSizes = thumbnails.map((file) => statSync(file).size);
  const total = [...thumbnails, ...full].reduce((sum, file) => sum + statSync(file).size, 0);
  assert.ok(Math.max(...thumbnailSizes) <= 250_000, `largest thumbnail is ${Math.max(...thumbnailSizes)} bytes`);
  assert.ok(total <= 110_000_000, `optimized photo total is ${total} bytes`);
});

test('dated photos are newest first and undated photos come last', () => {
  const dated = PHOTO_DATA.filter((photo) => photo.date);
  const undatedIndex = PHOTO_DATA.findIndex((photo) => photo.date === null);
  assert.deepEqual(dated, [...dated].sort((a, b) => b.date.localeCompare(a.date)));
  assert.ok(undatedIndex === -1 || PHOTO_DATA.slice(undatedIndex).every((photo) => photo.date === null));
});

test('newest three match verified source metadata', () => {
  assert.deepEqual(
    PHOTO_DATA.filter((photo) => photo.date).slice(0, 3).map((photo) => photo.title),
    ['2026.05.11-树桩新枝', '2026.05.11-大树', '2026.05.11-河滩石'],
  );
});

test('asset preparation never changes source references', () => {
  const referenceDirectory = fileURLToPath(new URL('../参考', import.meta.url));
  const before = hashTree(referenceDirectory);
  const outputRoot = mkdtempSync(join(tmpdir(), 'personal-site-assets-'));
  copyFileSync(fileURLToPath(new URL('../photography.html', import.meta.url)), join(outputRoot, 'photography.html'));
  try {
    execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/prepare-assets.mjs', import.meta.url))], {
      env: { ...process.env, ASSET_OUTPUT_ROOT: outputRoot },
    });
    assert.deepEqual(hashTree(referenceDirectory), before);
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
});
