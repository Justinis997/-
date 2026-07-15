export function initMegaNavigation() {
  const menuItems = [...(document.querySelectorAll?.('[data-nav-menu]') ?? [])];
  if (menuItems.length === 0) return;

  let closeTimer = null;

  const updateMenuHeight = (item) => {
    const primaryHeight = item.querySelector?.('.nav-mega__primary')?.scrollHeight ?? 0;
    const secondaryHeight = item.querySelector?.('.nav-mega__panel.is-active')?.scrollHeight ?? 0;
    const contentHeight = Math.max(primaryHeight, secondaryHeight);
    if (!contentHeight) return;
    const menuHeight = Math.max(120, Math.ceil(contentHeight + 36));
    item.style?.setProperty?.('--nav-mega-current-height', `${menuHeight}px`);
    if (item.classList.contains('is-open')) {
      document.body?.style?.setProperty?.('--nav-mega-current-height', `${menuHeight}px`);
    }
  };

  const setMenuOpen = (item, isOpen) => {
    if (isOpen) updateMenuHeight(item);
    item.classList.toggle('is-open', isOpen);
    item.querySelector?.('.nav-trigger')?.setAttribute('aria-expanded', String(isOpen));
    const hasOpenMenu = menuItems.some((menuItem) => menuItem.classList.contains('is-open'));
    document.body?.classList.toggle('nav-mega-open', hasOpenMenu);
    if (isOpen) {
      const menuHeight = item.style?.getPropertyValue?.('--nav-mega-current-height');
      if (menuHeight) document.body?.style?.setProperty?.('--nav-mega-current-height', menuHeight);
    }
  };

  const closeAllMenus = (except = null) => {
    menuItems.forEach((item) => {
      if (item !== except) setMenuOpen(item, false);
    });
  };

  const openMenu = (item) => {
    if (closeTimer) globalThis.clearTimeout?.(closeTimer);
    closeTimer = null;
    closeAllMenus(item);
    setMenuOpen(item, true);
  };

  const scheduleClose = (item) => {
    if (closeTimer) globalThis.clearTimeout?.(closeTimer);
    closeTimer = globalThis.setTimeout?.(() => setMenuOpen(item, false), 110);
  };

  menuItems.forEach((item) => {
    item.addEventListener?.('pointerenter', () => openMenu(item));
    item.addEventListener?.('pointerleave', () => scheduleClose(item));
    item.addEventListener?.('focusin', () => openMenu(item));
    item.addEventListener?.('focusout', (event) => {
      if (!item.contains?.(event.relatedTarget)) scheduleClose(item);
    });

    const switches = [...(item.querySelectorAll?.('[data-nav-panel-target]') ?? [])];
    const panels = [...(item.querySelectorAll?.('[data-nav-panel]') ?? [])];
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

  document.addEventListener?.('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openItem = menuItems.find((item) => item.classList.contains('is-open'));
    if (!openItem) return;
    setMenuOpen(openItem, false);
    openItem.querySelector?.('.nav-trigger')?.focus?.();
  });
}

export function initSite() {
  initMegaNavigation();
  const menuButton = document.querySelector('.mobile-menu-button');
  const primaryLinks = document.querySelector('.primary-links');

  if (menuButton && primaryLinks) {
    const label = menuButton.querySelector('.sr-only');
    const closeMenu = () => {
      menuButton.setAttribute('aria-expanded', 'false');
      primaryLinks.classList.remove('is-open');
      if (label) label.textContent = '打开导航菜单';
    };

    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      primaryLinks.classList.toggle('is-open', !isOpen);
      if (label) label.textContent = isOpen ? '打开导航菜单' : '关闭导航菜单';
    });

    primaryLinks.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menuButton.focus();
      }
    });
  }

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSite, { once: true });
} else {
  initSite();
}
