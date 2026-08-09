import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const API_VERSION = '2026-03-11';
const API_BASE = 'https://api.notion.com/v1';
const token = process.env.NOTION_API_KEY;
const dataSources = Object.freeze({
  architecture: process.env.NOTION_ARCHITECTURE_DATA_SOURCE_ID ?? 'c63265ce-eb1f-4095-a8e4-a2abeb8b56fa',
  essays: process.env.NOTION_ESSAYS_DATA_SOURCE_ID ?? 'cb26bbb2-0d69-4330-995f-0f51fc46739a',
  settings: process.env.NOTION_SETTINGS_DATA_SOURCE_ID ?? '9d80c43a-2f24-443b-8c31-317c44dda0e3',
});

const root = resolve(process.env.SITE_OUTPUT_ROOT ?? '.');
const photoDataPath = resolve(root, 'assets/js/photo-data.js');
const essayDataPath = resolve(root, 'assets/js/essay-data.js');
const settingsPath = resolve(root, 'assets/js/site-settings.js');
const thumbnailDirectory = resolve(root, 'assets/photos/thumbnails/建筑');
const fullDirectory = resolve(root, 'assets/photos/full/建筑');

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': API_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Notion 请求失败（${response.status}）：${detail}`);
  }
  return response.json();
};

const queryPublished = async (dataSourceId) => {
  const results = [];
  let cursor;
  do {
    const response = await request(`/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter: { property: '发布状态', select: { equals: '发布' } },
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return results;
};

const queryAll = async (dataSourceId) => {
  const results = [];
  let cursor;
  do {
    const response = await request(`/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return results;
};

const plainText = (property) => (property?.title ?? property?.rich_text ?? [])
  .map((item) => item.plain_text ?? '')
  .join('')
  .trim();

const checkbox = (property) => Boolean(property?.checkbox);
const select = (property) => property?.select?.name ?? '';
const date = (property) => property?.date?.start ?? null;
const number = (property) => property?.number ?? null;
const fileUrl = (file) => file?.file?.url ?? file?.external?.url ?? null;
const notionId = (id) => `notion-${id.replaceAll('-', '')}`;

const retrieveMarkdown = async (pageId) => {
  const response = await request(`/pages/${pageId}/markdown`);
  if (response.truncated) throw new Error(`随笔正文过长或存在无权限内容：${pageId}`);
  return response.markdown.trim();
};

const cleanGeneratedPhotos = async (directory) => {
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && /^notion-[a-f0-9]+\.jpg$/u.test(entry.name)) {
      await rm(resolve(directory, entry.name));
    }
  }
};

const downloadPhoto = async (url, pageId, index) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`作品照片下载失败（${response.status}）`);
  const source = Buffer.from(await response.arrayBuffer());
  const stem = `${notionId(pageId)}-${String(index + 1).padStart(2, '0')}`;
  const thumbnailName = `${stem}.jpg`;
  const fullName = `${stem}.jpg`;
  const fullPath = resolve(fullDirectory, fullName);
  const thumbnailPath = resolve(thumbnailDirectory, thumbnailName);

  const fullInfo = await sharp(source)
    .rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 68, mozjpeg: true })
    .toFile(fullPath);
  await sharp(source)
    .rotate()
    .resize({ width: 560, height: 560, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 65, mozjpeg: true })
    .toFile(thumbnailPath);

  return {
    id: stem,
    thumbnailSrc: `./assets/photos/thumbnails/建筑/${thumbnailName}`,
    fullSrc: `./assets/photos/full/建筑/${fullName}`,
    width: fullInfo.width,
    height: fullInfo.height,
  };
};

export const mergeManagedRecords = (existing, managed) => [
  ...existing.filter((item) => !item.id.startsWith('notion-')),
  ...managed,
].sort((a, b) => {
  if (a.date && b.date) return b.date.localeCompare(a.date) || a.id.localeCompare(b.id);
  if (a.date) return -1;
  if (b.date) return 1;
  return a.id.localeCompare(b.id);
});

const syncArchitecture = async (pages, existingPhotos) => {
  await cleanGeneratedPhotos(thumbnailDirectory);
  await cleanGeneratedPhotos(fullDirectory);
  const records = [];

  const orderedPages = [...pages].sort((a, b) => {
    const aOrder = number(a.properties?.排序) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = number(b.properties?.排序) ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  for (const page of orderedPages) {
    const title = plainText(page.properties?.作品名称);
    const creationDate = date(page.properties?.创作日期);
    const description = plainText(page.properties?.作品说明);
    const files = page.properties?.作品照片?.files ?? [];
    if (!title || files.length === 0) throw new Error(`已发布的建筑作品缺少名称或照片：${page.id}`);

    for (const [index, file] of files.entries()) {
      const url = fileUrl(file);
      if (!url) throw new Error(`建筑作品包含无法读取的照片：${title}`);
      const image = await downloadPhoto(url, page.id, index);
      records.push({
        ...image,
        title: files.length > 1 ? `${title} · ${index + 1}` : title,
        category: '建筑',
        date: creationDate,
        src: image.fullSrc,
        alt: description || `建筑作品：${title}`,
      });
    }
  }

  const merged = mergeManagedRecords(existingPhotos, records);
  await writeFile(photoDataPath, `export const PHOTO_DATA = Object.freeze(${JSON.stringify(merged, null, 2)});\n`);
  return records.length;
};

const syncEssays = async (pages, existingEssays) => {
  const managed = [];
  for (const page of pages) {
    const title = plainText(page.properties?.文章标题);
    const publishedAt = date(page.properties?.发布日期);
    if (!title || !publishedAt) throw new Error(`已发布的随笔缺少标题或发布日期：${page.id}`);
    managed.push({
      id: notionId(page.id),
      date: publishedAt.slice(0, 10),
      category: select(page.properties?.类别) || '感受',
      title,
      content: await retrieveMarkdown(page.id),
    });
  }
  const merged = mergeManagedRecords(existingEssays, managed);
  await writeFile(essayDataPath, `export const ESSAY_DATA = ${JSON.stringify(merged, null, 2)};\n`);
  return managed.length;
};

const syncSettings = async (pages) => {
  const recentActivity = pages.find((page) => (
    plainText(page.properties?.设置项) === '首页近期动态'
    && checkbox(page.properties?.启用)
  ));
  const content = plainText(recentActivity?.properties?.内容);
  if (!content) throw new Error('网站设置中缺少已启用的“首页近期动态”内容');
  await writeFile(settingsPath, `export const SITE_SETTINGS = Object.freeze(${JSON.stringify({ recentActivity: content }, null, 2)});\n`);
};

export const run = async () => {
  if (!token) {
    console.log('未设置 NOTION_API_KEY，保留现有网站内容。');
    return;
  }

  const cacheBust = `?sync=${Date.now()}`;
  const [{ PHOTO_DATA }, { ESSAY_DATA }, architecture, essays, settings] = await Promise.all([
    import(`${pathToFileURL(photoDataPath).href}${cacheBust}`),
    import(`${pathToFileURL(essayDataPath).href}${cacheBust}`),
    queryPublished(dataSources.architecture),
    queryPublished(dataSources.essays),
    queryAll(dataSources.settings),
  ]);

  const architectureCount = await syncArchitecture(architecture, PHOTO_DATA);
  const essayCount = await syncEssays(essays, ESSAY_DATA);
  await syncSettings(settings);
  console.log(`Notion 同步完成：建筑照片 ${architectureCount} 张，随笔 ${essayCount} 篇。`);
};

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await run();
}
