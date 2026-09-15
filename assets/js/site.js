import { COMPACT_LAYOUT_QUERY, onReady } from './ui.js';

function setMenuOpen(item, isOpen) {
  item.classList.toggle('is-open', isOpen);
  item.querySelector('.nav-trigger')?.setAttribute('aria-expanded', String(isOpen));
}

export function initMegaNavigation() {
  const menuItems = [...document.querySelectorAll('[data-nav-menu]')];
  if (menuItems.length === 0) return;

  let closeTimer = null;
  const compactLayout = globalThis.matchMedia(COMPACT_LAYOUT_QUERY);

  const syncOverlay = () => {
    document.body.classList.toggle(
      'nav-mega-open',
      menuItems.some((item) => item.classList.contains('is-open')),
    );
  };

  const updateMenuHeight = (item) => {
    const primaryHeight = item.querySelector('.nav-mega__primary')?.scrollHeight ?? 0;
    const secondaryHeight = item.querySelector('.nav-mega__panel.is-active')?.scrollHeight ?? 0;
    const contentHeight = Math.max(primaryHeight, secondaryHeight);
    if (!contentHeight) return;
    const menuHeight = Math.max(120, Math.ceil(contentHeight + 36));
    item.style.setProperty('--nav-mega-current-height', `${menuHeight}px`);
    if (item.classList.contains('is-open')) {
      document.body.style.setProperty('--nav-mega-current-height', `${menuHeight}px`);
    }
  };

  const closeAllMenus = (except = null) => {
    menuItems.forEach((item) => {
      if (item !== except) setMenuOpen(item, false);
    });
    syncOverlay();
  };

  const openMenu = (item) => {
    if (closeTimer) globalThis.clearTimeout(closeTimer);
    closeTimer = null;
    closeAllMenus(item);
    updateMenuHeight(item);
    setMenuOpen(item, true);
    const menuHeight = item.style.getPropertyValue('--nav-mega-current-height');
    if (menuHeight) document.body.style.setProperty('--nav-mega-current-height', menuHeight);
    syncOverlay();
  };

  const scheduleClose = (item) => {
    if (closeTimer) globalThis.clearTimeout(closeTimer);
    closeTimer = globalThis.setTimeout(() => {
      setMenuOpen(item, false);
      syncOverlay();
    }, 110);
  };

  menuItems.forEach((item) => {
    item.addEventListener('pointerenter', () => {
      if (!compactLayout.matches) openMenu(item);
    });
    item.addEventListener('pointerleave', () => {
      if (!compactLayout.matches) scheduleClose(item);
    });
    item.addEventListener('focusin', () => {
      if (!compactLayout.matches) openMenu(item);
    });
    item.addEventListener('focusout', (event) => {
      if (!compactLayout.matches && !item.contains(event.relatedTarget)) scheduleClose(item);
    });

    const trigger = item.querySelector('.nav-trigger');
    if (trigger?.matches('button')) {
      trigger.addEventListener('click', () => {
        if (!compactLayout.matches) openMenu(item);
      });
    }

    const switches = [...item.querySelectorAll('[data-nav-panel-target]')];
    const panels = [...item.querySelectorAll('[data-nav-panel]')];
    const activatePanel = (target) => {
      switches.forEach((button) => {
        const isActive = button.dataset.navPanelTarget === target;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });
      panels.forEach((panel) => {
        const isActive = panel.dataset.navPanel === target;
        panel.classList.toggle('is-active', isActive);
        panel.setAttribute('aria-hidden', String(!isActive));
      });
      updateMenuHeight(item);
    };

    switches.forEach((button) => {
      const activate = () => activatePanel(button.dataset.navPanelTarget);
      button.addEventListener?.('pointerenter', activate);
      button.addEventListener?.('focus', activate);
      button.addEventListener?.('click', activate);
    });

    updateMenuHeight(item);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openItem = menuItems.find((item) => item.classList.contains('is-open'));
    if (!openItem) return;
    setMenuOpen(openItem, false);
    syncOverlay();
    openItem.querySelector('.nav-trigger')?.focus();
  });

  compactLayout.addEventListener?.('change', () => closeAllMenus());
}

function collectMobileMenuItems(primaryLinks) {
  return [...primaryLinks.querySelectorAll('[data-nav-menu]')].map((item) => {
    const trigger = item.querySelector('.nav-trigger');
    const panels = [...item.querySelectorAll('[data-nav-panel]')].map((panel) => ({
      title: panel.querySelector('.nav-mega__label')?.textContent.trim() ?? '',
      links: [...panel.querySelectorAll('a')].map((link) => ({
        label: link.textContent.trim(),
        href: link.href,
      })),
    }));
    const links = panels.length === 0
      ? [...item.querySelectorAll('.nav-mega a')].map((link) => ({
        label: link.textContent.trim(),
        href: link.href,
        external: link.target === '_blank',
      }))
      : [];
    return { title: trigger?.textContent.trim() ?? '', links, panels };
  });
}

function createMobileLink({ label, href, external = false }) {
  const link = document.createElement('a');
  link.className = 'mobile-navigation__link';
  link.href = href;
  link.textContent = label;
  if (external) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}

function setMobileNavigationOrder(element, index) {
  element.style.setProperty('--mobile-nav-index', index);
}

function createMobileNavigation(primaryLinks) {
  const navigation = document.createElement('div');
  navigation.className = 'mobile-navigation';
  navigation.id = 'mobile-navigation';
  navigation.setAttribute('aria-hidden', 'true');
  navigation.innerHTML = `
    <div class="mobile-navigation__bar">
      <a class="mobile-navigation__brand" href="./index.html" aria-label="Justin，返回首页">Justin</a>
      <button class="mobile-navigation__close" type="button" aria-label="关闭导航菜单"><span aria-hidden="true">×</span></button>
    </div>
    <div class="mobile-navigation__views"></div>`;

  const views = navigation.querySelector('.mobile-navigation__views');
  const root = document.createElement('section');
  root.className = 'mobile-navigation__view is-active';
  root.dataset.mobileNavView = 'root';
  root.setAttribute('aria-label', '主菜单');
  const rootList = document.createElement('div');
  rootList.className = 'mobile-navigation__list';
  const menuItems = collectMobileMenuItems(primaryLinks);

  menuItems.forEach((item) => {
    const entry = document.createElement('button');
    entry.type = 'button';
    entry.className = 'mobile-navigation__entry';
    entry.dataset.mobileNavOpen = item.title;
    entry.setAttribute('aria-haspopup', 'true');
    entry.setAttribute('aria-label', `打开${item.title}菜单`);
    entry.textContent = item.title;
    rootList.append(entry);
  });

  const directLink = primaryLinks.querySelector(':scope > a[href]');
  if (directLink) {
    rootList.append(createMobileLink({
      label: directLink.textContent.trim(),
      href: directLink.href,
    }));
  }
  [...rootList.children].forEach(setMobileNavigationOrder);
  root.append(rootList);
  views.append(root);

  menuItems.forEach((item) => {
    const subMenu = document.createElement('section');
    subMenu.className = 'mobile-navigation__view mobile-navigation__view--sub';
    subMenu.dataset.mobileNavView = item.title;
    subMenu.setAttribute('aria-label', `${item.title}菜单`);

    const back = document.createElement('button');
    back.className = 'mobile-navigation__back';
    back.type = 'button';
    back.dataset.mobileNavBack = '';
    back.textContent = item.title;
    back.setAttribute('aria-label', `返回主菜单，当前为${item.title}`);
    setMobileNavigationOrder(back, 0);

    const list = document.createElement('div');
    list.className = 'mobile-navigation__list mobile-navigation__list--sub';
    let animationIndex = 1;
    if (item.panels.length > 0) {
      item.panels.forEach((panel) => {
        const group = document.createElement('div');
        group.className = 'mobile-navigation__group';
        const title = document.createElement('p');
        title.className = 'mobile-navigation__group-title';
        title.textContent = panel.title;
        setMobileNavigationOrder(title, animationIndex++);
        const links = panel.links.map(createMobileLink);
        links.forEach((link) => setMobileNavigationOrder(link, animationIndex++));
        group.append(title, ...links);
        list.append(group);
      });
    } else {
      const links = item.links.map(createMobileLink);
      links.forEach((link) => setMobileNavigationOrder(link, animationIndex++));
      list.append(...links);
    }
    subMenu.append(back, list);
    views.append(subMenu);
  });

  return navigation;
}

export function initMobileNavigation() {
  const menuButton = document.querySelector('.mobile-menu-button');
  const primaryLinks = document.querySelector('.primary-links');
  if (!menuButton || !primaryLinks) return;

  const compactLayout = globalThis.matchMedia(COMPACT_LAYOUT_QUERY);
  const label = menuButton.querySelector('.sr-only');
  let navigation = null;
  let views = null;

  const showView = (viewName = 'root') => {
    if (!views) return;
    [...views.querySelectorAll('.mobile-navigation__view')].forEach((view) => {
      view.classList.toggle('is-active', view.dataset.mobileNavView === viewName);
    });
  };

  const closeMenu = (restoreFocus = false) => {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation?.classList.remove('is-open');
    navigation?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mobile-navigation-open');
    showView();
    if (label) label.textContent = '打开导航菜单';
    if (restoreFocus) menuButton.focus();
  };

  const ensureNavigation = () => {
    if (navigation) return navigation;
    navigation = createMobileNavigation(primaryLinks);
    views = navigation.querySelector('.mobile-navigation__views');
    document.body.append(navigation);

    navigation.querySelector('.mobile-navigation__close').addEventListener('click', () => closeMenu(true));
    navigation.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-mobile-nav-open]');
      if (opener) showView(opener.dataset.mobileNavOpen);
      if (event.target.closest('[data-mobile-nav-back]')) showView();
      if (event.target.closest('a')) closeMenu();
    });
    return navigation;
  };

  menuButton.addEventListener('click', () => {
    if (!compactLayout.matches) return;
    const mobileNavigation = ensureNavigation();
    const shouldOpen = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(shouldOpen));
    mobileNavigation.classList.toggle('is-open', shouldOpen);
    mobileNavigation.setAttribute('aria-hidden', String(!shouldOpen));
    document.body.classList.toggle('mobile-navigation-open', shouldOpen);
    showView();
    if (label) label.textContent = shouldOpen ? '关闭导航菜单' : '打开导航菜单';
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu(true);
    }
  });
  compactLayout.addEventListener?.('change', ({ matches }) => {
    if (!matches) closeMenu();
  });
}

function initRevealAnimations() {
  const revealElements = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  revealElements.forEach((element) => observer.observe(element));
}

export function initSite() {
  initMegaNavigation();
  initMobileNavigation();
  initRevealAnimations();
}

onReady(initSite);
