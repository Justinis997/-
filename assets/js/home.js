import { HOME_DATA } from './home-data.js';

const hierarchyClasses = [
  'latest-photo--primary',
  'latest-photo--secondary',
  'latest-photo--tertiary',
];

let latestPhotos = [];
let activePhotoIndex = 0;
let returnFocus = null;

const updateTotals = Object.freeze(HOME_DATA.totals);

const setUpdateCount = (element, value) => {
  element.textContent = new Intl.NumberFormat('zh-CN').format(value);
};

const animateUpdateCount = (element, target) => {
  const duration = 1100;
  const startTime = globalThis.performance?.now?.() ?? 0;
  element.classList.add('is-counting');

  const tick = (currentTime) => {
    const elapsed = Math.min((currentTime - startTime) / duration, 1);
    const easedProgress = 1 - ((1 - elapsed) ** 3);
    setUpdateCount(element, Math.round(target * easedProgress));

    if (elapsed < 1) {
      globalThis.requestAnimationFrame?.(tick);
    }
  };

  globalThis.requestAnimationFrame?.(tick);
};

export function initUpdateCounters() {
  const overview = document.querySelector('[data-news-overview]');
  if (!overview) return;

  const counters = [...overview.querySelectorAll('[data-update-count]')];
  const showFinalCounts = () => {
    counters.forEach((counter) => {
      setUpdateCount(counter, updateTotals[counter.dataset.updateCount] ?? 0);
    });
  };
  const animateCounts = () => {
    counters.forEach((counter) => {
      animateUpdateCount(counter, updateTotals[counter.dataset.updateCount] ?? 0);
    });
  };

  const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in globalThis)) {
    showFinalCounts();
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    animateCounts();
    currentObserver.disconnect();
  }, { threshold: 0.35 });

  observer.observe(overview);
}

export function initRecentActivity() {
  const activity = document.querySelector('.news-activity');
  if (activity && HOME_DATA.recentActivity) activity.textContent = HOME_DATA.recentActivity;
}

const getLightboxElements = () => ({
  lightbox: document.querySelector('[data-home-lightbox]'),
  image: document.querySelector('[data-home-lightbox-image]'),
  imageFallback: document.querySelector('[data-home-lightbox-fallback]'),
  title: document.querySelector('[data-home-lightbox-title]'),
  meta: document.querySelector('[data-home-lightbox-meta]'),
  close: document.querySelector('[data-home-lightbox-close]'),
  previous: document.querySelector('[data-home-lightbox-previous]'),
  next: document.querySelector('[data-home-lightbox-next]'),
});

export function openLatestPhoto(index, trigger = document.activeElement) {
  const elements = getLightboxElements();
  if (!elements.lightbox || latestPhotos.length === 0) return;

  activePhotoIndex = ((index % latestPhotos.length) + latestPhotos.length) % latestPhotos.length;
  const photo = latestPhotos[activePhotoIndex];
  returnFocus = trigger;

  elements.image.src = photo.fullSrc ?? photo.src;
  elements.image.alt = photo.alt;
  elements.imageFallback.textContent = photo.title;
  elements.image.parentElement?.classList.remove('is-error');
  elements.title.textContent = photo.title;
  elements.meta.textContent = photo.category ?? '';
  if (!elements.lightbox.open) elements.lightbox.showModal();
  elements.close?.focus();
}

export function closeLatestPhoto() {
  const { lightbox } = getLightboxElements();
  if (!lightbox?.open) return;

  lightbox.close();
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}

export function moveLatestPhoto(delta) {
  if (latestPhotos.length === 0) return;
  openLatestPhoto(activePhotoIndex + delta, returnFocus);
}

export function renderLatestPhotos(photos) {
  const container = document.querySelector('[data-latest-photos]');
  if (!container) return;

  latestPhotos = photos
    .filter((photo) => photo.date)
    .slice(0, 3);

  const figures = latestPhotos
    .map((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `查看完整图片：${photo.title}`);
      button.addEventListener('click', () => openLatestPhoto(index, button));

      const figure = document.createElement('figure');
      figure.className = `latest-photo ${hierarchyClasses[index]}`;

      const image = document.createElement('img');
      image.src = photo.thumbnailSrc;
      image.alt = photo.alt;
      image.loading = index === 0 ? 'eager' : 'lazy';
      image.decoding = 'async';
      if (index === 0) image.fetchPriority = 'high';

      const fallback = document.createElement('span');
      fallback.className = 'photo-fallback';
      fallback.textContent = photo.title;
      fallback.setAttribute?.('aria-hidden', 'true');
      image.addEventListener?.('error', () => figure.classList?.add('is-error'), { once: true });

      const caption = document.createElement('figcaption');
      caption.textContent = photo.title;

      figure.append(image, fallback, caption);
      button.append(figure);
      return button;
    });

  container.replaceChildren(...figures);
}

export function initHomeLightbox() {
  const elements = getLightboxElements();
  if (!elements.lightbox) return;

  elements.close?.addEventListener('click', closeLatestPhoto);
  elements.previous?.addEventListener('click', () => moveLatestPhoto(-1));
  elements.next?.addEventListener('click', () => moveLatestPhoto(1));
  elements.image?.addEventListener('error', () => elements.image.parentElement?.classList.add('is-error'));
  elements.lightbox.addEventListener('click', (event) => {
    if (event.target === elements.lightbox) closeLatestPhoto();
  });
  document.addEventListener('keydown', (event) => {
    if (!elements.lightbox.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLatestPhoto();
    }
    if (event.key === 'ArrowLeft') moveLatestPhoto(-1);
    if (event.key === 'ArrowRight') moveLatestPhoto(1);
  });
}

if (typeof document !== 'undefined') {
  initRecentActivity();
  initUpdateCounters();
  renderLatestPhotos(HOME_DATA.latestPhotos);
  initHomeLightbox();
}
