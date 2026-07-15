import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [, , sourcePath = '/tmp/last-18000-notes.json'] = process.argv;
const outputPath = resolve('assets/js/essay-data.js');

const stripNotesMarkup = (value) => value
  .replaceAll('[按钮]', '')
  .replace(/\[按钮:\s*([^\]]*)\]/g, '$1')
  .replace(/^\*\*(.*?)\*\*\**(.*)$/u, '$1$2')
  .replaceAll('****', '')
  .trim();

const extractTableRows = (body) => {
  const rows = [];
  const pattern = /row \(disabled\) [^\n]+\n\s+\d+ 单元格 ([^,\n]+),[^\n]*\n\s+\d+ 单元格 ([^,\n]+),/g;
  for (const match of body.matchAll(pattern)) {
    const row = `${match[1]}：${match[2]}`;
    if (!rows.includes(row)) rows.push(row);
  }
  return rows;
};

const cleanBody = (body) => {
  const tableRows = extractTableRows(body);
  const lines = body.split('\n');
  const cleaned = [];

  for (const rawLine of lines) {
    if (/^\s+\d+\s/.test(rawLine)) continue;
    if (/^\[attachment:/.test(rawLine)) continue;

    const tag = rawLine.match(/^\[未知: 标签(.+)\]$/);
    if (tag) {
      cleaned.push(`#${tag[1]}`);
      continue;
    }

    if (/^\*\*.+\*\*\**.*$/u.test(rawLine.trim())) {
      cleaned.push(`## ${stripNotesMarkup(rawLine.trim())}`);
      continue;
    }

    cleaned.push(stripNotesMarkup(rawLine));
  }

  if (tableRows.length > 0) {
    cleaned.push('', '## 对照表', ...tableRows.map((row) => `* ${row}`));
  }

  return cleaned
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const titleFallback = (listText) => listText.replace(/\s+无更多文本$/, '').trim();

const categorizeEssay = (title, content) => {
  if (
    content.includes('#梦')
    || /^(梦|梦见松鼠|梦见了死人|做完昨天的梦之后|与父母争吵|梦见了跟Jennie|今天梦见了与柴老师|今天梦见了外星人)/.test(title)
  ) return '梦';

  if (title === '感受这个世界') return '感受';

  if (
    content.includes('## ')
    || content.startsWith('* ')
    || /(AI|Ai|王尔德|概念|每样东西|李富真|喜欢的词|本质|人的周围|讨厌的词|喜欢的东西|我眼里的世界|一些问题|视频号|暗淡蓝点)/.test(title)
  ) return '笔记';

  return '感受';
};

const normalizeNote = (note) => {
  const rawLines = note.body.split('\n');
  while (rawLines.length > 0 && (!rawLines[0].trim() || rawLines[0].trim() === '****')) rawLines.shift();

  let title = titleFallback(note.listText);
  if (rawLines.length > 0 && !rawLines[0].startsWith('[attachment:')) {
    title = stripNotesMarkup(rawLines.shift());
  }

  const dateMatch = note.createdAt.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!dateMatch) throw new Error(`无法识别第 ${note.ordinal} 篇随笔的创建日期：${note.createdAt}`);
  const [, year, month, day] = dateMatch;
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  const content = cleanBody(rawLines.join('\n'));

  return {
    id: `essay-${date}-${String(note.ordinal).padStart(3, '0')}`,
    date,
    category: categorizeEssay(title, content),
    title,
    content,
  };
};

const notes = JSON.parse(await readFile(sourcePath, 'utf8'));
const essays = notes
  .map(normalizeNote)
  .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

const source = `export const ESSAY_DATA = ${JSON.stringify(essays, null, 2)};\n`;
await writeFile(outputPath, source, 'utf8');
console.log(`Imported ${essays.length} essays to ${outputPath}`);
