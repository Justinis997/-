import { HOME_DATA } from './home-data.js';

let activeTrigger = null;

const formatEssayDate = (date) => {
  const [year, month, day] = date.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
};

const renderEssayContent = (container, content) => {
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
};

const getDialogElements = () => ({
  dialog: document.querySelector('[data-essay-dialog]'),
  title: document.querySelector('[data-essay-dialog-title]'),
  date: document.querySelector('[data-essay-dialog-date]'),
  content: document.querySelector('[data-essay-dialog-content]'),
  close: document.querySelector('[data-essay-dialog-close]'),
});

const openEssay = (essay, trigger) => {
  const elements = getDialogElements();
  if (!elements.dialog) return;
  activeTrigger = trigger;
  elements.title.textContent = essay.title;
  elements.date.dateTime = essay.date;
  elements.date.textContent = formatEssayDate(essay.date);
  renderEssayContent(elements.content, essay.content);
  if (!elements.dialog.open) elements.dialog.showModal();
  elements.close?.focus();
};

const closeEssay = () => {
  const { dialog } = getDialogElements();
  if (!dialog?.open) return;
  dialog.close();
  if (activeTrigger?.isConnected) activeTrigger.focus();
  activeTrigger = null;
};

const renderLatestEssays = () => {
  const container = document.querySelector('[data-latest-essays]');
  if (!container) return;
  const cards = HOME_DATA.latestEssays.map((essay) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'essay-preview';
    card.setAttribute('aria-label', `阅读完整随笔：${essay.title}`);
    card.addEventListener('click', () => openEssay(essay, card));
    const title = document.createElement('span');
    title.className = 'essay-preview__title';
    title.textContent = essay.title;
    const date = document.createElement('time');
    date.dateTime = essay.date;
    date.textContent = formatEssayDate(essay.date);
    const excerpt = document.createElement('span');
    excerpt.className = 'essay-preview__excerpt';
    excerpt.textContent = essay.content.trim();
    card.replaceChildren(title, date, excerpt);
    return card;
  });
  container.replaceChildren(...cards);
};

const initHomeEssays = () => {
  renderLatestEssays();
  const elements = getDialogElements();
  elements.close?.addEventListener('click', closeEssay);
  elements.dialog?.addEventListener('click', (event) => {
    if (event.target === elements.dialog) closeEssay();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.dialog?.open) closeEssay();
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomeEssays, { once: true });
} else {
  initHomeEssays();
}
