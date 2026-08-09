import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.');
const output = resolve('dist');
const pages = ['index.html', 'photography.html', 'articles.html', 'about.html'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
  ...pages.map((page) => cp(resolve(root, page), resolve(output, page))),
  cp(resolve(root, 'assets'), resolve(output, 'assets'), { recursive: true }),
]);

process.env.SITE_OUTPUT_ROOT = output;
const { run } = await import(`./sync-notion.mjs?build=${Date.now()}`);
await run();
