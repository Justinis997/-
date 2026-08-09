import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeManagedRecords } from '../scripts/sync-notion.mjs';

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
