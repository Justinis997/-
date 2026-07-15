import { PHOTO_DATA } from './photo-data.js';

let activePhotos = [...PHOTO_DATA];
let activeIndex = 0;
let returnFocus = null;
let photoEntranceObserver = null;
let lightboxTransitionId = 0;
let isLightboxTransitioning = false;
let queuedLightboxIndex = null;

const getElements = () => ({
  grid: document.querySelector('[data-photo-grid]'),
  lightbox: document.querySelector('[data-lightbox]'),
  image: document.querySelector('[data-lightbox-image]'),
  imageFallback: document.querySelector('[data-lightbox-fallback]'),
  title: document.querySelector('[data-lightbox-title]'),
  meta: document.querySelector('[data-lightbox-meta]'),
  date: document.querySelector('[data-lightbox-date]'),
  close: document.querySelector('[data-lightbox-close]'),
});

export function comparePhotosNewestFirst(a, b) {
  if (a.date && b.date) return b.date.localeCompare(a.date);
  if (a.date) return -1;
  if (b.date) return 1;
  return a.title.localeCompare(b.title, 'zh-CN');
}

export function selectPhotos(category = '全部', photos = PHOTO_DATA) {
  const selected = category === '全部'
    ? [...photos]
    : photos.filter((photo) => photo.category === category);
  return selected.sort(comparePhotosNewestFirst);
}

export function formatPhotoDate(date) {
  if (!date) return null;
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return { datetime: date, label: date };

  const [, year, month, day] = match;
  return {
    datetime: date,
    label: `${year}年${Number(month)}月${Number(day)}日`,
  };
}

function getPhotoGridColumnCount() {
  const viewportWidth = globalThis.window?.innerWidth;
  if (!Number.isFinite(viewportWidth)) return 10;
  if (viewportWidth <= 480) return 2;
  if (viewportWidth <= 760) return 4;
  if (viewportWidth <= 1180) return 6;
  return 10;
}

function preparePhotoEntrance(cards, grid, requestedColumnCount) {
  photoEntranceObserver?.disconnect?.();
  photoEntranceObserver = null;

  const columnCount = requestedColumnCount ?? getPhotoGridColumnCount();
  const reveal = (card, delay = 0) => {
    card.style.setProperty('--photo-reveal-delay', `${delay}ms`);
    card.classList.add('photo-card--entering');
    card.addEventListener('animationend', () => {
      card.classList.add('photo-card--revealed');
      card.classList.remove('photo-card--entering');
    }, { once: true });
  };

  if (!('IntersectionObserver' in globalThis.window)) {
    const rowCount = Math.ceil(cards.length / columnCount);
    const rowDelay = rowCount > 1 ? Math.min(85, 750 / (rowCount - 1)) : 0;
    cards.forEach((card, index) => reveal(card, Math.round(Math.floor(index / columnCount) * rowDelay)));
    return;
  }

  const cardIndexes = new Map(cards.map((card, index) => [card, index]));
  photoEntranceObserver = new globalThis.window.IntersectionObserver((entries, currentObserver) => {
    const visibleEntries = entries.filter((entry) => entry.isIntersecting);
    if (visibleEntries.length === 0) return;

    const visibleRows = visibleEntries.map((entry) => Math.floor(cardIndexes.get(entry.target) / columnCount));
    const firstVisibleRow = Math.min(...visibleRows);
    visibleEntries.forEach((entry) => {
      const row = Math.floor(cardIndexes.get(entry.target) / columnCount);
      reveal(entry.target, (row - firstVisibleRow) * 70);
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px 80px' });

  cards.forEach((card) => photoEntranceObserver.observe(card));
}

function connectPhotoCard(card, photo, index, photoImage) {
  const image = photoImage ?? card.querySelector?.('img');
  card.addEventListener('click', (event) => {
    event?.preventDefault?.();
    openLightbox(index, card);
  });
  image?.addEventListener('error', () => card.classList.add('is-error'), { once: true });
}

export function hydrateInitialGrid({ animate = true, columnCount } = {}) {
  const { grid } = getElements();
  if (!grid) return false;

  const cards = [...grid.children];
  const canHydrate = cards.length === PHOTO_DATA.length
    && cards.every((card, index) => card.dataset.photoId === PHOTO_DATA[index].id);
  if (!canHydrate) return false;

  activePhotos = [...PHOTO_DATA];
  cards.forEach((card, index) => connectPhotoCard(card, activePhotos[index], index));
  if (animate) preparePhotoEntrance(cards, grid, columnCount);
  return true;
}

export function renderGrid(category = '全部', { animate = false, columnCount } = {}) {
  const { grid } = getElements();
  if (!grid) return;

  activePhotos = selectPhotos(category);

  const cards = activePhotos.map((photo, index) => {
    const button = document.createElement('button');
    const image = document.createElement('img');
    const fallback = document.createElement('span');

    button.type = 'button';
    button.id = photo.id;
    button.className = 'photo-card';
    button.dataset.photoId = photo.id;
    button.setAttribute('aria-label', `查看摄影作品：${photo.title}`);
    if (!animate) button.classList.add('photo-card--revealed');

    image.src = photo.thumbnailSrc;
    image.alt = photo.alt;
    image.loading = 'lazy';
    image.decoding = 'async';
    fallback.className = 'photo-fallback';
    fallback.textContent = photo.title;
    fallback.setAttribute('aria-hidden', 'true');
    button.append(image, fallback);
    connectPhotoCard(button, photo, index, image);
    return button;
  });

  grid.replaceChildren(...cards);
  if (animate) preparePhotoEntrance(cards, grid, columnCount);
}

function renderLightboxPhoto(index, elements) {
  activeIndex = ((index % activePhotos.length) + activePhotos.length) % activePhotos.length;
  const photo = activePhotos[activeIndex];

  elements.image.src = photo.fullSrc;
  elements.image.alt = photo.alt;
  elements.imageFallback.textContent = photo.title;
  elements.image.parentElement?.classList.remove('is-error');
  elements.title.textContent = photo.title;
  elements.meta.textContent = photo.category;
  const confirmedDate = formatPhotoDate(photo.date);
  elements.date.replaceChildren();
  if (confirmedDate) {
    const time = document.createElement('time');
    time.dateTime = confirmedDate.datetime;
    time.textContent = confirmedDate.label;
    elements.date.append(time);
  } else {
    const status = document.createElement('span');
    status.textContent = '日期未确认';
    elements.date.append(status);
  }
  elements.date.hidden = false;
  if (typeof globalThis.Image === 'function' && activePhotos.length > 1) {
    for (const adjacentIndex of [activeIndex - 1, activeIndex + 1]) {
      const normalizedIndex = ((adjacentIndex % activePhotos.length) + activePhotos.length) % activePhotos.length;
      const preload = new globalThis.Image();
      preload.src = activePhotos[normalizedIndex].fullSrc;
    }
  }
}

function resetLightboxTransition(elements) {
  lightboxTransitionId += 1;
  isLightboxTransitioning = false;
  queuedLightboxIndex = null;
  elements.image.parentElement?.classList.remove('is-fading-out');
  elements.image.parentElement?.classList.remove('is-fading-in');
}

export function openLightbox(index, trigger = document.activeElement) {
  const elements = getElements();
  if (!elements.lightbox || activePhotos.length === 0) return;

  resetLightboxTransition(elements);
  returnFocus = trigger;
  renderLightboxPhoto(index, elements);
  if (!elements.lightbox.open) elements.lightbox.showModal();
  elements.close.focus();
}

export function closeLightbox() {
  const elements = getElements();
  const { lightbox } = elements;
  if (!lightbox?.open) return;

  resetLightboxTransition(elements);
  lightbox.close();
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}

export function moveLightbox(delta) {
  if (activePhotos.length === 0) return;
  const baseIndex = queuedLightboxIndex ?? activeIndex;
  const targetIndex = ((baseIndex + delta) % activePhotos.length + activePhotos.length) % activePhotos.length;
  if (isLightboxTransitioning) {
    queuedLightboxIndex = targetIndex;
    return;
  }

  const elements = getElements();
  const media = elements.image?.parentElement;
  if (!elements.lightbox?.open || !elements.image || !media) {
    openLightbox(targetIndex, returnFocus);
    return;
  }

  isLightboxTransitioning = true;
  const transitionId = ++lightboxTransitionId;
  media.classList.add('is-fading-out');
  elements.image.addEventListener('animationend', () => {
    if (transitionId !== lightboxTransitionId) return;
    media.classList.remove('is-fading-out');
    renderLightboxPhoto(targetIndex, elements);

    const startFadeIn = () => {
      if (transitionId !== lightboxTransitionId) return;
      media.classList.add('is-fading-in');
      elements.image.addEventListener('animationend', () => {
        if (transitionId !== lightboxTransitionId) return;
        media.classList.remove('is-fading-in');
        isLightboxTransitioning = false;
        const nextIndex = queuedLightboxIndex;
        queuedLightboxIndex = null;
        if (nextIndex !== null && nextIndex !== activeIndex) {
          const deltaToQueued = nextIndex - activeIndex;
          moveLightbox(deltaToQueued);
        }
      }, { once: true });
    };
    (globalThis.window?.requestAnimationFrame ?? ((callback) => callback()))(startFadeIn);
  }, { once: true });
}

function trapLightboxFocus(event, lightbox) {
  if (event.key !== 'Tab') return;
  const focusable = [...lightbox.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }
}

export function initPhotography() {
  const elements = getElements();
  if (!elements.grid || !elements.lightbox) return;

  const requestedCategory = new URLSearchParams(globalThis.window?.location?.search ?? '').get('category');
  const validCategory = ['光影', '形式', '表面', '风光', '建筑', '陌生人', '生物'].includes(requestedCategory)
    ? requestedCategory
    : '全部';

  if (validCategory !== '全部') {
    renderGrid(validCategory, { animate: true });
  } else if (!hydrateInitialGrid({ animate: true })) {
    renderGrid('全部', { animate: true });
  }

  document.querySelectorAll('[data-category]').forEach((filter) => {
    filter.setAttribute('aria-pressed', String(filter.dataset.category === validCategory));
  });

  document.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      document.querySelectorAll('[data-category]').forEach((filter) => {
        filter.setAttribute('aria-pressed', String(filter === button));
      });
      renderGrid(category, { animate: true });
    });
  });

  elements.close.addEventListener('click', closeLightbox);
  elements.image.addEventListener('error', () => elements.image.parentElement?.classList.add('is-error'));
  document.querySelector('[data-lightbox-previous]')?.addEventListener('click', () => moveLightbox(-1));
  document.querySelector('[data-lightbox-next]')?.addEventListener('click', () => moveLightbox(1));
  elements.lightbox.addEventListener('click', (event) => {
    if (event.target === elements.lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (event) => {
    if (!elements.lightbox.open) return;
    trapLightboxFocus(event, elements.lightbox);
    if (event.key === 'Escape') {
      event.preventDefault?.();
      closeLightbox();
    }
    if (event.key === 'ArrowLeft') moveLightbox(-1);
    if (event.key === 'ArrowRight') moveLightbox(1);
  });

  if (window.location.hash) {
    const photoId = decodeURIComponent(window.location.hash.slice(1));
    document.getElementById(photoId)?.scrollIntoView({ block: 'center' });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhotography, { once: true });
  } else {
    initPhotography();
  }
}
