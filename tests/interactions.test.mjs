import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PHOTO_DATA } from '../assets/js/photo-data.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;
globalThis.document = { readyState: 'complete', querySelector: () => null };
globalThis.window = { location: { hash: '' } };
const photography = await import(`../assets/js/photography.js?test=${Date.now()}`);
globalThis.document = originalDocument;
globalThis.window = originalWindow;

function createFakeDom() {
  const documentListeners = new Map();

  class FakeElement {
    constructor(tagName = '') {
      this.tagName = tagName;
      this.children = [];
      this.dataset = {};
      this.listeners = new Map();
      this.attributes = new Map();
      this.hidden = false;
      this.isConnected = true;
      this.open = false;
      this.focusCount = 0;
      this.showModalCount = 0;
      this.closeCount = 0;
      this.replaceChildrenCount = 0;
      this.style = {
        values: new Map(),
        setProperty: (name, value) => this.style.values.set(name, value),
        getPropertyValue: (name) => this.style.values.get(name) ?? '',
      };
      this.classList = {
        values: new Set(),
        add: (value) => this.classList.values.add(value),
        remove: (value) => this.classList.values.delete(value),
      };
    }

    addEventListener(type, handler) { this.listeners.set(type, handler); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) {
      this.replaceChildrenCount += 1;
      this.children = children;
    }
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) { return this.attributes.get(name); }
    focus() {
      this.focusCount += 1;
      fakeDocument.activeElement = this;
    }
    showModal() {
      this.showModalCount += 1;
      this.open = true;
    }
    close() {
      this.closeCount += 1;
      this.open = false;
    }
    querySelector(selector) {
      if (selector === 'img') return this.children.find((child) => child.tagName === 'img') ?? null;
      return null;
    }
    querySelectorAll() { return [elements.close, elements.previous, elements.next]; }
  }

  const elements = {
    grid: new FakeElement(),
    lightbox: new FakeElement(),
    image: new FakeElement(),
    imageFallback: new FakeElement(),
    title: new FakeElement(),
    meta: new FakeElement(),
    date: new FakeElement(),
    close: new FakeElement(),
    previous: new FakeElement(),
    next: new FakeElement(),
  };
  elements.lightbox.hidden = true;
  elements.date.hidden = true;
  const lightboxMedia = new FakeElement();
  elements.image.parentElement = lightboxMedia;

  const selectors = new Map([
    ['[data-photo-grid]', elements.grid],
    ['[data-lightbox]', elements.lightbox],
    ['[data-lightbox-image]', elements.image],
    ['[data-lightbox-fallback]', elements.imageFallback],
    ['[data-lightbox-title]', elements.title],
    ['[data-lightbox-meta]', elements.meta],
    ['[data-lightbox-date]', elements.date],
    ['[data-lightbox-close]', elements.close],
    ['[data-lightbox-previous]', elements.previous],
    ['[data-lightbox-next]', elements.next],
  ]);

  const filters = ['全部', '光影', '形式', '表面', '风光', '建筑', '陌生人', '生物'].map((category) => {
    const filter = new FakeElement();
    filter.dataset.category = category;
    return filter;
  });

  const fakeDocument = {
    activeElement: null,
    body: { style: {} },
    createElement: (tagName) => new FakeElement(tagName),
    querySelector: (selector) => selectors.get(selector) ?? null,
    querySelectorAll: (selector) => selector === '[data-category]' ? filters : [],
    addEventListener: (type, handler) => documentListeners.set(type, handler),
    getElementById: () => null,
  };

  return { document: fakeDocument, window: { location: { hash: '' } }, elements, filters, documentListeners, FakeElement, lightboxMedia };
}

test('photography page uses grouped filters, a native modal dialog, and useful noscript copy', () => {
  const html = read('photography.html');
  for (const category of ['全部', '光影', '形式', '表面', '风光', '建筑', '陌生人', '生物']) assert.ok(html.includes(`>${category}<`));
  assert.match(html, /<div class="photo-filters"[^>]*role="group"/);
  assert.match(html, /<dialog class="photo-lightbox"[^>]*aria-modal="true"/);
  assert.match(html, /<noscript>[\s\S]*筛选和灯箱功能需要 JavaScript[\s\S]*<\/noscript>/);
  assert.doesNotMatch(html, /请启用 JavaScript 查看摄影作品/);
  assert.ok(html.includes('<span data-lightbox-date'));
});

test('wide grid keeps tight columns, generous row spacing, and required responsive counts', () => {
  const css = read('assets/css/styles.css');
  assert.match(css, /\.photo-grid\s*\{[^}]*grid-template-columns:\s*repeat\(10,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.photo-grid\s*\{[^}]*row-gap:\s*clamp\(35px,\s*3\.33vw,\s*59px\);[^}]*column-gap:\s*8px;/s);
  assert.match(css, /\.photo-card\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3;/s);
  assert.match(css, /\.photography-header\s*\{[^}]*margin-bottom:\s*clamp\(22px,\s*3vw,\s*40px\);/s);
  for (const [width, columns] of [[1180, 6], [760, 4], [480, 2]]) {
    assert.match(css, new RegExp(`@media \\(max-width: ${width}px\\)[\\s\\S]*?grid-template-columns: repeat\\(${columns}, minmax\\(0, 1fr\\)\\)`));
  }
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.photo-grid\s*\{[^}]*row-gap:\s*24px;/s);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.photo-grid\s*\{[^}]*row-gap:\s*19px;/s);
});

test('selection preserves manifest order and renderGrid assigns stable photo ids', () => {
  assert.equal(typeof photography.selectPhotos, 'function');
  const expected = PHOTO_DATA.filter((photo) => photo.category === '建筑');
  assert.deepEqual(photography.selectPhotos('建筑').map((photo) => photo.id), expected.map((photo) => photo.id));

  const fake = createFakeDom();
  globalThis.document = fake.document;
  globalThis.window = fake.window;
  try {
    photography.renderGrid('建筑');
    assert.deepEqual(fake.elements.grid.children.map((card) => card.id), expected.map((photo) => photo.id));
    assert.deepEqual(fake.elements.grid.children.map((card) => card.dataset.photoId), expected.map((photo) => photo.id));
    assert.deepEqual(fake.elements.grid.children.map((card) => card.children[0].src), expected.map((photo) => photo.thumbnailSrc));
    fake.elements.grid.children[0].children[0].listeners.get('error')();
    assert.equal(fake.elements.grid.children[0].classList.values.has('is-error'), true);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test('every photography view sorts dated photos newest first and leaves undated photos last', () => {
  const shuffled = [
    { title: '无日期乙', category: '建筑', date: null },
    { title: '较早', category: '建筑', date: '2023-01-01T08:00:00' },
    { title: '最新', category: '建筑', date: '2025-06-01T08:00:00' },
    { title: '无日期甲', category: '建筑', date: null },
    { title: '其他分类', category: '光影', date: '2026-01-01T08:00:00' },
  ];

  assert.deepEqual(
    photography.selectPhotos('建筑', shuffled).map((photo) => photo.title),
    ['最新', '较早', '无日期甲', '无日期乙'],
  );
  assert.deepEqual(
    photography.selectPhotos('全部', shuffled).map((photo) => photo.title),
    ['其他分类', '最新', '较早', '无日期甲', '无日期乙'],
  );
});

test('initial photography render reveals cards from the top row downward', () => {
  const fake = createFakeDom();
  globalThis.document = fake.document;
  globalThis.window = fake.window;

  try {
    photography.renderGrid('全部', { animate: true, columnCount: 10 });
    const cards = fake.elements.grid.children;

    assert.equal(cards[0].classList.values.has('photo-card--entering'), true);
    assert.equal(cards[9].style.getPropertyValue('--photo-reveal-delay'), '0ms');
    assert.ok(Number.parseFloat(cards[10].style.getPropertyValue('--photo-reveal-delay')) > 0);
    assert.equal(
      cards[10].style.getPropertyValue('--photo-reveal-delay'),
      cards[19].style.getPropertyValue('--photo-reveal-delay'),
    );
    assert.ok(
      Number.parseFloat(cards[20].style.getPropertyValue('--photo-reveal-delay'))
        > Number.parseFloat(cards[10].style.getPropertyValue('--photo-reveal-delay')),
    );

    cards[0].listeners.get('animationend')();
    assert.equal(cards[0].classList.values.has('photo-card--entering'), false);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test('initial hydration reuses static cards and only animates rows entering the viewport', () => {
  const fake = createFakeDom();
  let observerInstance;
  fake.window.innerWidth = 1440;
  fake.window.IntersectionObserver = class {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = [];
      observerInstance = this;
    }
    observe(target) { this.observed.push(target); }
    unobserve(target) { this.observed = this.observed.filter((card) => card !== target); }
  };

  fake.elements.grid.children = PHOTO_DATA.map((photo) => {
    const card = new fake.FakeElement('a');
    const image = new fake.FakeElement('img');
    card.dataset.photoId = photo.id;
    card.append(image);
    return card;
  });

  globalThis.document = fake.document;
  globalThis.window = fake.window;
  try {
    assert.equal(photography.hydrateInitialGrid(), true);
    assert.equal(fake.elements.grid.replaceChildrenCount, 0);
    assert.equal(observerInstance.observed.length, PHOTO_DATA.length);

    const visibleCards = fake.elements.grid.children.slice(0, 20);
    observerInstance.callback(
      visibleCards.map((target) => ({ target, isIntersecting: true })),
      observerInstance,
    );

    assert.equal(visibleCards[0].style.getPropertyValue('--photo-reveal-delay'), '0ms');
    assert.equal(visibleCards[9].style.getPropertyValue('--photo-reveal-delay'), '0ms');
    assert.equal(visibleCards[10].style.getPropertyValue('--photo-reveal-delay'), '70ms');
    assert.equal(fake.elements.grid.children[20].classList.values.has('photo-card--entering'), false);
    assert.equal(observerInstance.observed.length, PHOTO_DATA.length - visibleCards.length);

    visibleCards[0].listeners.get('animationend')();
    assert.equal(visibleCards[0].classList.values.has('photo-card--revealed'), true);
    assert.equal(visibleCards[0].classList.values.has('photo-card--entering'), false);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test('every photography category reuses the same row-staggered entrance animation', () => {
  const fake = createFakeDom();
  globalThis.document = fake.document;
  globalThis.window = fake.window;

  try {
    photography.initPhotography();
    const architectureFilter = fake.filters.find((filter) => filter.dataset.category === '建筑');
    architectureFilter.listeners.get('click')();

    const expected = PHOTO_DATA.filter((photo) => photo.category === '建筑');
    assert.equal(fake.elements.grid.children.length, expected.length);
    assert.equal(fake.elements.grid.children[0].classList.values.has('photo-card--entering'), true);
    assert.equal(fake.elements.grid.children[0].style.getPropertyValue('--photo-reveal-delay'), '0ms');
    assert.ok(Number.parseFloat(fake.elements.grid.children[10].style.getPropertyValue('--photo-reveal-delay')) > 0);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test('date formatting preserves confirmed datetime and omits null dates', () => {
  assert.equal(typeof photography.formatPhotoDate, 'function');
  assert.deepEqual(photography.formatPhotoDate('2026-05-09T09:34:35'), {
    datetime: '2026-05-09T09:34:35',
    label: '2026年5月9日',
  });
  assert.equal(photography.formatPhotoDate(null), null);
});

test('lightbox executes modal navigation, date branches, backdrop close, and focus return', () => {
  const fake = createFakeDom();
  const trigger = new fake.FakeElement();
  globalThis.document = fake.document;
  globalThis.window = fake.window;

  try {
    photography.initPhotography();
    fake.elements.grid.children[0].listeners.get('click')();
    assert.equal(fake.elements.lightbox.showModalCount, 1);
    fake.elements.image.listeners.get('error')();
    assert.equal(fake.lightboxMedia.classList.values.has('is-error'), true);
    assert.equal(fake.elements.date.hidden, false);
    assert.equal(fake.elements.date.children[0].tagName, 'time');
    assert.equal(fake.elements.date.children[0].dateTime, PHOTO_DATA[0].date);

    fake.documentListeners.get('keydown')({ key: 'ArrowRight' });
    assert.equal(fake.lightboxMedia.classList.values.has('is-fading-out'), true);
    assert.equal(fake.elements.image.src, PHOTO_DATA[0].fullSrc);
    fake.elements.image.listeners.get('animationend')();
    assert.equal(fake.elements.image.src, PHOTO_DATA[1].fullSrc);
    assert.equal(fake.lightboxMedia.classList.values.has('is-fading-in'), true);
    fake.elements.image.listeners.get('animationend')();
    assert.equal(fake.lightboxMedia.classList.values.has('is-fading-in'), false);

    fake.documentListeners.get('keydown')({ key: 'ArrowLeft' });
    fake.elements.image.listeners.get('animationend')();
    assert.equal(fake.elements.image.src, PHOTO_DATA[0].fullSrc);
    fake.elements.image.listeners.get('animationend')();

    fake.elements.grid.children[0].listeners.get('click').call(trigger);
    fake.elements.lightbox.listeners.get('click')({ target: {} });
    assert.equal(fake.elements.lightbox.open, true);
    fake.elements.lightbox.listeners.get('click')({ target: fake.elements.lightbox });
    assert.equal(fake.elements.lightbox.open, false);
    assert.equal(fake.elements.grid.children[0].focusCount, 1);

    photography.renderGrid('全部');
    const undatedIndex = PHOTO_DATA.findIndex((photo) => photo.date === null);
    assert.ok(undatedIndex >= 0, 'manifest needs an undated record for the null branch');
    photography.openLightbox(undatedIndex, trigger);
    assert.equal(fake.elements.date.hidden, false);
    assert.equal(fake.elements.date.children[0].tagName, 'span');
    assert.equal(fake.elements.date.children[0].textContent, '日期未确认');
    fake.documentListeners.get('keydown')({ key: 'Escape' });
    assert.equal(fake.elements.lightbox.open, false);
    assert.equal(trigger.focusCount, 1);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test('modal traps Tab and Shift+Tab at its focus boundaries', () => {
  const fake = createFakeDom();
  globalThis.document = fake.document;
  globalThis.window = fake.window;

  try {
    photography.initPhotography();
    photography.openLightbox(0, fake.elements.grid.children[0]);

    fake.document.activeElement = fake.elements.next;
    let prevented = 0;
    fake.documentListeners.get('keydown')({ key: 'Tab', shiftKey: false, preventDefault: () => { prevented += 1; } });
    assert.equal(fake.document.activeElement, fake.elements.close);

    fake.document.activeElement = fake.elements.close;
    fake.documentListeners.get('keydown')({ key: 'Tab', shiftKey: true, preventDefault: () => { prevented += 1; } });
    assert.equal(fake.document.activeElement, fake.elements.next);
    assert.equal(prevented, 2);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});
