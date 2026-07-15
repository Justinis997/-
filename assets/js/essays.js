import { ESSAY_DATA } from './essay-data.js';

let activeTrigger = null;
let essayDirectoryCleanup = null;
let essayEntranceObserver = null;

const ESSAY_CATEGORIES = ['感受', '梦', '笔记'];

export function formatEssayDate(date) {
  const [year, month, day] = date.split('-');
  return {
    year,
    shortLabel: `${month}月${day}日`,
    longLabel: `${year}年${Number(month)}月${Number(day)}日`,
  };
}

export function groupEssays(essays = ESSAY_DATA) {
  return essays.reduce((groups, essay) => {
    const { year } = formatEssayDate(essay.date);
    const group = groups.find((item) => item.year === year);
    if (group) group.essays.push(essay);
    else groups.push({ year, essays: [essay] });
    return groups;
  }, []);
}

function createYearNavigation(groups, className, label) {
  const nav = document.createElement('nav');
  nav.className = className;
  nav.setAttribute('aria-label', label);
  groups.forEach(({ year }) => {
    const link = document.createElement('a');
    link.href = `#essays-${year}`;
    link.dataset.essayYearLink = year;
    link.textContent = year;
    nav.append(link);
  });
  return nav;
}

function createArchiveGroupNavigation(groups, activeCategory = null) {
  const navigation = document.createElement('nav');
  navigation.className = 'essay-group-nav';
  navigation.setAttribute('aria-label', '随笔分组');

  const createGroup = (label) => {
    const group = document.createElement('div');
    group.className = 'essay-group-nav__group';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'essay-group-nav__trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.textContent = label;
    const menu = document.createElement('div');
    menu.className = 'essay-group-nav__menu';
    group.append(trigger, menu);
    navigation.append(group);
    return { group, trigger, menu };
  };

  const dateGroup = createGroup('日期');
  dateGroup.trigger.setAttribute('aria-label', activeCategory ? '日期，显示全部随笔' : '日期');
  dateGroup.trigger.addEventListener('click', () => {
    if (!activeCategory) return;
    renderEssayArchive(ESSAY_DATA);
    initEssayYearDirectory();
  });
  groups.forEach(({ year }, index) => {
    const link = document.createElement('a');
    link.href = `#essays-${year}`;
    link.textContent = year;
    link.style.setProperty('--essay-menu-delay', `${index * 55}ms`);
    dateGroup.menu.append(link);
  });

  const categoryGroup = createGroup('类别');
  categoryGroup.group.classList.toggle('is-active', Boolean(activeCategory));
  ESSAY_CATEGORIES.forEach((category, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = category;
    button.dataset.essayCategory = category;
    button.setAttribute('aria-pressed', String(activeCategory === category));
    button.style.setProperty('--essay-menu-delay', `${index * 70}ms`);
    button.addEventListener('click', () => {
      renderEssayArchive(ESSAY_DATA, category);
      initEssayYearDirectory();
    });
    categoryGroup.menu.append(button);
  });

  return navigation;
}

function renderEssayContent(container, content) {
  const elements = [];
  let paragraphLines = [];
  let listItems = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const paragraph = document.createElement('p');
    paragraphLines.forEach((line, index) => {
      if (index > 0) paragraph.append(document.createElement('br'));
      const text = document.createElement('span');
      text.textContent = line;
      paragraph.append(text);
    });
    elements.push(paragraph);
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    const list = document.createElement('ul');
    listItems.forEach((value) => {
      const item = document.createElement('li');
      item.textContent = value;
      list.append(item);
    });
    elements.push(list);
    listItems = [];
  };

  for (const line of content ? content.split('\n') : []) {
    if (!line) {
      flushParagraph();
      flushList();
    } else if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      const heading = document.createElement('h3');
      heading.textContent = line.slice(3);
      elements.push(heading);
    } else if (line.startsWith('* ')) {
      flushParagraph();
      listItems.push(line.slice(2));
    } else {
      flushList();
      paragraphLines.push(line);
    }
  }
  flushParagraph();
  flushList();

  container.replaceChildren(...elements);
}

const getDialogElements = () => ({
  dialog: document.querySelector('[data-essay-dialog]'),
  title: document.querySelector('[data-essay-dialog-title]'),
  date: document.querySelector('[data-essay-dialog-date]'),
  content: document.querySelector('[data-essay-dialog-content]'),
  close: document.querySelector('[data-essay-dialog-close]'),
});

export function openEssay(id, trigger = document.activeElement) {
  const essay = ESSAY_DATA.find((item) => item.id === id);
  const elements = getDialogElements();
  if (!essay || !elements.dialog) return;

  const formatted = formatEssayDate(essay.date);
  activeTrigger = trigger;
  elements.title.textContent = essay.title;
  elements.date.dateTime = essay.date;
  elements.date.textContent = formatted.longLabel;
  renderEssayContent(elements.content, essay.content);
  if (!elements.dialog.open) elements.dialog.showModal();
  elements.close?.focus();
}

export function closeEssay() {
  const { dialog } = getDialogElements();
  if (!dialog?.open) return;
  dialog.close();
  if (activeTrigger?.isConnected) activeTrigger.focus();
  activeTrigger = null;
}

function createEssayButton(essay, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = essay.title;
  button.setAttribute('aria-label', `阅读完整随笔：${essay.title}`);
  button.addEventListener('click', () => openEssay(essay.id, button));
  return button;
}

function prepareEssayEntrance(entries) {
  essayEntranceObserver?.disconnect?.();
  essayEntranceObserver = null;

  const reveal = (entry, delay = 0) => {
    entry.style.setProperty('--essay-reveal-delay', `${delay}ms`);
    entry.classList.add('essay-entry--entering');
    entry.addEventListener('animationend', () => {
      entry.classList.add('essay-entry--revealed');
      entry.classList.remove('essay-entry--entering');
    }, { once: true });
  };

  if (!('IntersectionObserver' in globalThis.window)) {
    entries.forEach((entry, index) => reveal(entry, Math.min(index, 10) * 45));
    return;
  }

  essayEntranceObserver = new globalThis.window.IntersectionObserver((observerEntries, currentObserver) => {
    const visibleEntries = observerEntries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    visibleEntries.forEach((observerEntry, index) => {
      reveal(observerEntry.target, index * 55);
      currentObserver.unobserve(observerEntry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px 80px' });

  entries.forEach((entry) => essayEntranceObserver.observe(entry));
}

export function renderEssayArchive(essays = ESSAY_DATA, activeCategory = null) {
  const container = document.querySelector('[data-essay-archive]');
  if (!container) return;

  essayDirectoryCleanup?.();
  essayDirectoryCleanup = null;
  essayEntranceObserver?.disconnect?.();
  essayEntranceObserver = null;

  const allGroups = groupEssays(ESSAY_DATA);
  const visibleEssays = activeCategory
    ? essays.filter((essay) => essay.category === activeCategory)
    : essays;
  const visibleGroups = groupEssays(visibleEssays);
  const groups = allGroups.map(({ year }) => ({
    year,
    essays: visibleGroups.find((group) => group.year === year)?.essays ?? [],
  }));
  const groupNavigation = createArchiveGroupNavigation(allGroups, activeCategory);

  const directory = document.createElement('aside');
  directory.className = 'essay-year-directory';
  directory.dataset.essayYearDirectory = '';
  directory.hidden = true;
  const directoryLabel = document.createElement('span');
  directoryLabel.className = 'essay-year-directory__label';
  directoryLabel.textContent = '年份';
  directory.append(
    directoryLabel,
    createYearNavigation(allGroups, 'essay-year-directory__links', '随笔年份目录'),
  );

  const sections = groups.map(({ year, essays: yearEssays }) => {
    const section = document.createElement('section');
    section.className = 'essay-year';
    section.id = `essays-${year}`;

    const heading = document.createElement('h2');
    heading.textContent = `${year}（${yearEssays.length}）`;

    const list = document.createElement('ol');
    list.className = 'essay-list';
    yearEssays.forEach((essay) => {
      const entry = document.createElement('li');
      entry.className = 'essay-entry';
      const time = document.createElement('time');
      time.dateTime = essay.date;
      time.textContent = formatEssayDate(essay.date).shortLabel;
      const category = document.createElement('span');
      category.className = 'essay-entry__category';
      category.textContent = essay.category;
      entry.append(time, category, createEssayButton(essay, 'essay-entry__title'));
      list.append(entry);
    });
    section.append(heading, list);
    return section;
  });

  container.classList.add('essay-archive--reveal');
  container.replaceChildren(groupNavigation, ...sections, directory);
  prepareEssayEntrance([...container.querySelectorAll('.essay-entry')]);
}

export function initEssayYearDirectory() {
  const topNavigation = document.querySelector('.essay-group-nav');
  const directory = document.querySelector('[data-essay-year-directory]');
  const sections = [...document.querySelectorAll('.essay-year')];
  if (!topNavigation || !directory || sections.length === 0) return;

  const desktopQuery = window.matchMedia('(min-width: 1100px)');
  let topNavigationIsVisible = true;

  const syncDirectoryVisibility = () => {
    directory.hidden = topNavigationIsVisible || !desktopQuery.matches;
  };

  const setCurrentYear = (year) => {
    directory.querySelectorAll('[data-essay-year-link]').forEach((link) => {
      const isCurrent = link.dataset.essayYearLink === year;
      link.classList.toggle('is-current', isCurrent);
      if (isCurrent) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  if (!('IntersectionObserver' in window)) return;

  const navigationObserver = new IntersectionObserver(([entry]) => {
    topNavigationIsVisible = entry.isIntersecting;
    syncDirectoryVisibility();
  }, { rootMargin: '-60px 0px 0px', threshold: 0 });
  navigationObserver.observe(topNavigation);

  const sectionObserver = new IntersectionObserver((entries) => {
    const current = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (current) setCurrentYear(current.target.id.replace('essays-', ''));
  }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });
  sections.forEach((section) => sectionObserver.observe(section));

  desktopQuery.addEventListener?.('change', syncDirectoryVisibility);
  setCurrentYear(sections[0].id.replace('essays-', ''));
  syncDirectoryVisibility();

  essayDirectoryCleanup = () => {
    navigationObserver.disconnect();
    sectionObserver.disconnect();
    desktopQuery.removeEventListener?.('change', syncDirectoryVisibility);
  };
}

export function renderLatestEssays(essays = ESSAY_DATA) {
  const container = document.querySelector('[data-latest-essays]');
  if (!container) return;

  const cards = essays.slice(0, 3).map((essay) => {
    const card = createEssayButton(essay, 'essay-preview');
    const title = document.createElement('span');
    title.className = 'essay-preview__title';
    title.textContent = essay.title;
    const date = document.createElement('time');
    date.dateTime = essay.date;
    date.textContent = formatEssayDate(essay.date).longLabel;
    const excerpt = document.createElement('span');
    excerpt.className = 'essay-preview__excerpt';
    excerpt.textContent = essay.content.trim();
    card.replaceChildren(title, date, excerpt);
    return card;
  });
  container.replaceChildren(...cards);
}

export function initEssays() {
  const requestedCategory = new URLSearchParams(globalThis.window?.location?.search ?? '').get('category');
  const activeCategory = ESSAY_CATEGORIES.includes(requestedCategory) ? requestedCategory : null;
  renderEssayArchive(ESSAY_DATA, activeCategory);
  renderLatestEssays();
  initEssayYearDirectory();
  const elements = getDialogElements();
  elements.close?.addEventListener('click', closeEssay);
  elements.dialog?.addEventListener('click', (event) => {
    if (event.target === elements.dialog) closeEssay();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.dialog?.open) {
      event.preventDefault();
      closeEssay();
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEssays, { once: true });
  } else {
    initEssays();
  }
}
