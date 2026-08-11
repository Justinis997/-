import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeManagedRecords } from '../scripts/sync-notion.mjs';
import { createHomeData } from '../scripts/home-data.mjs';

test('Notion sync replaces only previously managed records', () => {
  const existing = [
    { id: 'legacy', date: '2026-01-01' },
    { id: 'notion-old', date: '2026-02-01' },
  ];
  const managed = [{ id: 'notion-new', date: '2026-03-01' }];
  assert.deepEqual(mergeManagedRecords(existing, managed), [
    { id: 'notion-new', date: '2026-03-01' },
    { id: 'legacy', date: '2026-01-01' },
  ]);
});

test('homepage payload contains only visible content and aggregate totals', () => {
  const photos = [
    { id: 'p1', date: '2026-03-03' },
    { id: 'p2', date: null },
    { id: 'p3', date: '2026-03-02' },
    { id: 'p4', date: '2026-03-01' },
    { id: 'p5', date: '2026-02-28' },
  ];
  const essays = [1, 2, 3, 4].map((id) => ({ id: `e${id}` }));
  assert.deepEqual(createHomeData({ photos, essays, recentActivity: '更新' }), {
    totals: { photography: 5, essays: 4 },
    latestPhotos: [photos[0], photos[2], photos[3]],
    latestEssays: essays.slice(0, 3),
    recentActivity: '更新',
  });
});
