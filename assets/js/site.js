export function initMegaNavigation() {
  const menuItems = [...(document.querySelectorAll?.('[data-nav-menu]') ?? [])];
  if (menuItems.length === 0) return;

  let closeTimer = null;
  const isCompactLayout = () => globalThis.matchMedia?.('(max-width: 640px)')?.matches ?? false;

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
    item.addEventListener?.('pointerenter', () => {
      if (!isCompactLayout()) openMenu(item);
    });
    item.addEventListener?.('pointerleave', () => {
      if (!isCompactLayout()) scheduleClose(item);
    });
    item.addEventListener?.('focusin', () => {
      if (!isCompactLayout()) openMenu(item);
    });
    item.addEventListener?.('focusout', (event) => {
      if (!isCompactLayout() && !item.contains?.(event.relatedTarget)) scheduleClose(item);
    });

    const trigger = item.querySelector?.('.nav-trigger');
    if (trigger?.matches?.('button')) {
      trigger.addEventListener?.('click', () => {
        if (!isCompactLayout()) {
          openMenu(item);
          return;
        }
        const shouldOpen = !item.classList.contains('is-open');
        closeAllMenus(item);
        setMenuOpen(item, shouldOpen);
      });
    }

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
    const compactLayout = () => globalThis.matchMedia?.('(max-width: 640px)')?.matches ?? false;
    const mobileNavigation = document.createElement('div');
    mobileNavigation.className = 'mobile-navigation';
    mobileNavigation.id = 'mobile-navigation';
    mobileNavigation.setAttribute('aria-hidden', 'true');
    mobileNavigation.innerHTML = `
      <div class="mobile-navigation__bar">
        <a class="mobile-navigation__brand" href="./index.html" aria-label="Justin，返回首页">Justin</a>
        <button class="mobile-navigation__close" type="button" aria-label="关闭导航菜单"><span aria-hidden="true">×</span></button>
      </div>
      <div class="mobile-navigation__views"></div>`;
    document.body.append(mobileNavigation);
    menuButton.setAttribute('aria-controls', 'mobile-navigation');

    const views = mobileNavigation.querySelector('.mobile-navigation__views');
    const closeButton = mobileNavigation.querySelector('.mobile-navigation__close');
    const menuItems = [...primaryLinks.querySelectorAll('[data-nav-menu]')];
    const directLink = primaryLinks.querySelector(':scope > a[href]');

    const itemDetails = menuItems.map((item) => {
      const trigger = item.querySelector('.nav-trigger');
      const title = trigger?.textContent?.trim() ?? '';
      const links = [...item.querySelectorAll('.nav-mega a')].map((link) => ({
        label: link.textContent.trim(), href: link.href, external: link.target === '_blank',
      }));
      const panels = [...item.querySelectorAll('[data-nav-panel]')].map((panel) => ({
        title: panel.querySelector('.nav-mega__label')?.textContent?.trim() ?? '',
        links: [...panel.querySelectorAll('a')].map((link) => ({ label: link.textContent.trim(), href: link.href })),
      }));
      return { title, href: trigger?.matches('a') ? trigger.href : '', links, panels };
    });

    const makeLink = ({ label: linkLabel, href, external = false }) => {
      const link = document.createElement('a');
      link.className = 'mobile-navigation__link';
      link.href = href;
      link.textContent = linkLabel;
      if (external) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      return link;
    };

    const renderMenu = () => {
      views.replaceChildren();
      const root = document.createElement('section');
      root.className = 'mobile-navigation__view is-active';
      root.dataset.mobileNavView = 'root';
      root.setAttribute('aria-label', '主菜单');
      const rootList = document.createElement('div');
      rootList.className = 'mobile-navigation__list';

      itemDetails.forEach((item) => {
        const entry = document.createElement(item.links.length || item.panels.length ? 'button' : 'a');
        entry.className = 'mobile-navigation__entry';
        entry.textContent = item.title;
        if (entry.tagName === 'A') entry.href = item.href;
        else {
          entry.type = 'button';
          entry.dataset.mobileNavOpen = item.title;
          entry.setAttribute('aria-haspopup', 'true');
          entry.setAttribute('aria-label', `打开${item.title}菜单`);
        }
        rootList.append(entry);
      });
      if (directLink) rootList.append(makeLink({ label: directLink.textContent.trim(), href: directLink.href }));
      root.append(rootList);
      views.append(root);

      itemDetails.forEach((item) => {
        if (!item.links.length && !item.panels.length) return;
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
        subMenu.append(back);
        const list = document.createElement('div');
        list.className = 'mobile-navigation__list mobile-navigation__list--sub';
        if (item.panels.length) {
          item.panels.forEach((panel) => {
            const group = document.createElement('div');
            group.className = 'mobile-navigation__group';
            const groupTitle = document.createElement('p');
            groupTitle.textContent = panel.title;
            group.append(groupTitle, ...panel.links.map(makeLink));
            list.append(group);
          });
        } else list.append(...item.links.map(makeLink));
        subMenu.append(list);
        views.append(subMenu);
      });
    };
    renderMenu();

    const showView = (viewName = 'root') => {
      [...views.querySelectorAll('.mobile-navigation__view')].forEach((view) => {
        view.classList.toggle('is-active', view.dataset.mobileNavView === viewName);
      });
    };
    const closeMenu = () => {
      menuButton.setAttribute('aria-expanded', 'false');
      primaryLinks.classList.remove('is-open');
      mobileNavigation.classList.remove('is-open');
      mobileNavigation.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('mobile-navigation-open');
      showView();
      [...(primaryLinks.querySelectorAll?.('[data-nav-menu].is-open') ?? [])].forEach((item) => {
        item.classList.remove('is-open');
        item.querySelector?.('.nav-trigger')?.setAttribute('aria-expanded', 'false');
      });
      document.body?.classList.remove('nav-mega-open');
      if (label) label.textContent = '打开导航菜单';
    };

    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      if (compactLayout()) {
        if (isOpen) closeMenu();
        else {
          menuButton.setAttribute('aria-expanded', 'true');
          mobileNavigation.classList.add('is-open');
          mobileNavigation.setAttribute('aria-hidden', 'false');
          document.body.classList.add('mobile-navigation-open');
          showView();
          if (label) label.textContent = '关闭导航菜单';
        }
        return;
      }
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      primaryLinks.classList.toggle('is-open', !isOpen);
      if (label) label.textContent = isOpen ? '打开导航菜单' : '关闭导航菜单';
    });

    closeButton.addEventListener('click', () => {
      closeMenu();
      menuButton.focus();
    });

    views.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-mobile-nav-open]');
      if (opener) showView(opener.dataset.mobileNavOpen);
      if (event.target.closest('[data-mobile-nav-back]')) showView();
    });

    primaryLinks.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    mobileNavigation.addEventListener('click', (event) => {
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
