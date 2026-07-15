import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const moduleUrl = new URL('../scripts/runtime-paths.mjs', import.meta.url);

test('Python resolution prefers environment, then bundled runtime, then PATH', async () => {
  assert.equal(existsSync(moduleUrl), true, 'runtime path resolver must exist');
  const { resolvePythonBin } = await import(moduleUrl);
  const execPath = '/runtime/dependencies/node/bin/node';
  const bundledPython = '/runtime/dependencies/python/bin/python3';

  assert.equal(resolvePythonBin({ env: { PYTHON_BIN: '/custom/python' }, execPath, pathExists: () => true }), '/custom/python');
  assert.equal(resolvePythonBin({ env: {}, execPath, pathExists: (path) => path === bundledPython }), bundledPython);
  assert.equal(resolvePythonBin({ env: {}, execPath, pathExists: () => false }), 'python3');
});

test('asset preparation script contains no user-specific absolute path', () => {
  const source = readFileSync(new URL('../scripts/prepare-assets.mjs', import.meta.url), 'utf8');
  assert.equal(source.includes('/Users/'), false);
});

test('logo conversion avoids deprecated Pillow pixel access', () => {
  const source = readFileSync(new URL('../scripts/make-logo-black.py', import.meta.url), 'utf8');
  assert.equal(source.includes('.getdata()'), false);
  assert.ok(source.includes('.get_flattened_data()'));
});
