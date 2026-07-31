import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ESSAY_DATA } from '../assets/js/essay-data.js';

const pages = ['index.html', 'photography.html', 'articles.html', 'about.html'];
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const projectRoot = new URL('../', import.meta.url);
const localTarget = (reference) => {
  const target = new URL(reference, projectRoot);
  target.search = '';
  target.hash = '';
  return target;
};

test('all pages share the left-aligned navigation in the required order', () => {
  for (const page of pages) {
    const html = read(page);
    const brand = html.indexOf('>Justin</a>');
    const photography = html.indexOf('摄影</a>');
    const essays = html.indexOf('随笔</a>');
    const about = html.indexOf('关于我</a>');
    assert.ok(brand >= 0 && brand < photography && photography < essays && essays < about);
    assert.doesNotMatch(html, /<a class="brand"[^>]*>\s*<img\b/);
  }
});

test('all pages share the OpenAI-style photography and essay mega menus', () => {
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /data-nav-menu="photography"[\s\S]*?>摄影<\/a>[\s\S]*?探索摄影/);
    for (const category of ['建筑', '风光', '形式', '陌生人']) {
      assert.ok(html.includes(`./photography.html?category=${category}`), `${page} missing photography category ${category}`);
    }

    assert.match(html, /data-nav-menu="essays"[\s\S]*?>随笔<\/a>/);
    assert.match(html, /data-nav-panel-target="time"[^>]*>时间<\/button>/);
    assert.match(html, /data-nav-panel-target="category"[^>]*>类别<\/button>/);
    for (const year of ['2026', '2025', '2024', '2023', '2022', '2021']) {
      assert.ok(html.includes(`./articles.html#essays-${year}`), `${page} missing essay year ${year}`);
    }
    for (const category of ['感受', '梦', '笔记']) {
      assert.ok(html.includes(`./articles.html?category=${category}`), `${page} missing essay category ${category}`);
    }
  }
});

test('all pages share the Tools mega menu and Pick One direct link', () => {
  const pickOneUrl = 'https://pick-one-random.justin-better.chatgpt.site';
  for (const page of pages) {
    const html = read(page);
    const essays = html.indexOf('>随笔</a>');
    const tools = html.indexOf('>Tools</button>');
    const about = html.indexOf('>关于我</a>');
    assert.ok(essays >= 0 && essays < tools && tools < about, `${page} has the wrong Tools navigation order`);
    assert.match(html, /data-nav-menu="tools"[\s\S]*?<button[^>]*>Tools<\/button>[\s\S]*?探索工具/);
    assert.doesNotMatch(html, /<button[^>]*href=[^>]*>Tools<\/button>/);
    assert.match(html, /<span class="nav-tool-link__title">Pick One<\/span>/);
    assert.match(html, /<section class="nav-mega__secondary nav-mega__tool-description-column"[^>]*>[\s\S]*?<p class="nav-tool-link__description">在电影与书籍榜单中随机挑选下一部作品。<\/p>/);
    assert.equal(html.split(`href="${pickOneUrl}"`).length - 1, 1, `${page} must only link the Pick One menu item`);
  }
});

test('essay and Tools mega menus share the shortened two-column spacing', () => {
  const css = read('assets/css/styles.css');
  assert.match(css, /\.nav-mega__inner\s*\{[^}]*grid-template-columns:\s*clamp\(260px,\s*14\.2vw,\s*290px\)\s+minmax\(0,\s*1fr\);[^}]*gap:\s*clamp\(24px,\s*3\.5vw,\s*56px\);/s);
  assert.doesNotMatch(css, /\.nav-mega--tools \.nav-mega__inner\s*\{[^}]*grid-template-columns:\s*1fr;/s);
  assert.match(css, /\.nav-mega__tool-description-column\s*\{[^}]*padding-top:/s);
});

test('mobile Tools stays left aligned and only reveals Pick One when expanded', () => {
  const css = read('assets/css/styles.css');
  const site = read('assets/js/site.js');
  assert.match(css, /\.nav-trigger--button\s*\{[^}]*text-align:\s*left;/s);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.nav-item--tools \.nav-mega\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.nav-item--tools\.is-open \.nav-mega\s*\{[^}]*display:\s*block;/s);
  assert.match(site, /isCompactLayout/);
  assert.match(site, /trigger\.addEventListener\?\.\('click',[\s\S]*?shouldOpen/s);
});

test('Tools trigger removes the browser button box without adding a replacement decoration', () => {
  const css = read('assets/css/styles.css');
  assert.match(css, /\.nav-trigger--button\s*\{[^}]*appearance:\s*none;[^}]*border:\s*0;[^}]*outline:\s*0;[^}]*box-shadow:\s*none;/s);
  assert.doesNotMatch(css, /\.nav-trigger--button:focus-visible\s*\{[^}]*text-decoration:/s);
});

test('mega menus use compact full-width expansion, staggered text motion, and a blurred page backdrop', () => {
  const css = read('assets/css/styles.css');
  const site = read('assets/js/site.js');
  assert.match(css, /\.nav-mega\s*\{[^}]*position:\s*fixed;[^}]*clip-path:\s*inset\(0 0 100% 0\);/s);
  assert.match(css, /\.nav-item(?::hover|\.is-open)[\s\S]*?\.nav-mega\s*\{[^}]*clip-path:\s*inset\(0\);/s);
  assert.match(css, /\.nav-mega__inner\s*\{[^}]*transform:\s*translateY\(-12px\);[^}]*transition:[^;]*var\(--nav-mega-ease\)/s);
  assert.match(css, /\.nav-mega__inner\s*\{[^}]*align-items:\s*start;/s);
  assert.match(css, /--nav-mega-default-height:\s*200px;/);
  assert.match(css, /\.nav-mega\s*\{[^}]*height:\s*var\(--nav-mega-current-height,\s*var\(--nav-mega-default-height\)\);/s);
  assert.match(css, /\.nav-mega__large-links[^}]*font-size:\s*clamp\(26px,\s*2\.2vw,\s*32px\)/s);
  assert.match(css, /\.nav-mega__large-links\s*\{[^}]*gap:\s*8px;/s);
  assert.match(css, /\.nav-mega__label\s*\{[^}]*margin:\s*0 0 8px;/s);
  assert.match(css, /\.nav-mega__label\s*\{[^}]*font-weight:\s*600;/s);
  assert.match(css, /\.nav-mega__primary\s*>\s*\.nav-mega__label\s*\{[^}]*margin-bottom:\s*16px;[^}]*font-weight:\s*300;/s);
  assert.match(css, /\.nav-mega__small-links[^}]*font-size:\s*14px/s);
  assert.match(css, /body::after\s*\{[^}]*background:\s*rgba\(235,\s*235,\s*237,\s*\.21\);/s);
  assert.match(css, /body::after\s*\{[^}]*backdrop-filter:\s*blur\(9px\) saturate\(87\.5%\);/s);
  assert.match(css, /body\.nav-mega-open::after\s*\{[^}]*opacity:\s*1;/s);
  assert.match(site, /pointerenter/);
  assert.match(site, /data-nav-panel-target/);
  assert.match(site, /aria-expanded/);
  assert.match(site, /nav-mega-open/);
  assert.match(site, /scrollHeight/);
  assert.match(site, /--nav-mega-current-height/);
});

test('all asset paths are deployable relative URLs', () => {
  for (const page of pages) {
    const html = read(page);
    const urls = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((match) => match[1]);

    for (const url of urls) {
      if (url.startsWith('https://') || url.startsWith('mailto:')) continue;
      assert.match(url, /^\.\//, `${page} contains a non-relative local URL: ${url}`);
    }
  }
});

test('every page has unique complete metadata', () => {
  const titles = pages.map((page) => read(page).match(/<title>([^<]+)<\/title>/)?.[1]);
  const descriptions = pages.map((page) => read(page).match(/<meta name="description" content="([^"]*)">/)?.[1]);
  const keywords = new Map([
    ['index.html', '个人网站'],
    ['photography.html', '摄影'],
    ['articles.html', '随笔'],
    ['about.html', '经历'],
  ]);

  assert.equal(titles.every(Boolean), true);
  assert.equal(new Set(titles).size, pages.length);
  assert.equal(descriptions.every((description) => description?.trim().length >= 12), true);
  assert.equal(new Set(descriptions.map((description) => description.trim())).size, pages.length);
  for (const [index, page] of pages.entries()) {
    const html = read(page);
    assert.ok(descriptions[index].includes(keywords.get(page)), `${page} description must include ${keywords.get(page)}`);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
    assert.match(html, /<meta name="theme-color" content="#f5f5f7">/);
  }
});

test('every page has matching Open Graph metadata, a local icon, and early JS enhancement marker', () => {
  for (const page of pages) {
    const html = read(page);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]*)">/)?.[1];
    assert.ok(html.indexOf("document.documentElement.classList.add('js')") < html.indexOf('<link rel="stylesheet"'));
    assert.ok(html.includes(`<meta property="og:title" content="${title}">`));
    assert.ok(html.includes(`<meta property="og:description" content="${description}">`));
    assert.ok(html.includes('<meta property="og:type" content="website">'));
    assert.ok(html.includes('<link rel="icon" href="./assets/images/logo-black.png" type="image/png">'));
    assert.equal(/(?:canonical|og:url|og:image)/.test(html), false);
  }
});

test('navigation and reveal content remain visible without JavaScript', () => {
  const css = read('assets/css/styles.css');
  assert.doesNotMatch(css, /(?<!\.js )\.reveal\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /\.js \.reveal\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.js \.mobile-menu-button\s*\{[^}]*display:\s*block/s);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.js \.primary-links\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.js \.primary-links\.is-open\s*\{[^}]*display:\s*flex/s);
});

test('photography cards use the homepage-style row-staggered rise-in animation with reduced-motion support', () => {
  const css = read('assets/css/styles.css');
  const html = read('photography.html');
  assert.match(html, /class="photo-grid photo-grid--reveal"/);
  assert.match(css, /@keyframes photo-card-rise-in\s*\{[\s\S]*?from\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*translateY\(24px\);[\s\S]*?to\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*none;/s);
  assert.match(css, /\.photo-card--entering\s*\{[^}]*animation:[^;]*photo-card-rise-in\s+\.7s[^;]*var\(--photo-reveal-delay/s);
  assert.match(css, /\.js \.photo-grid--reveal \.photo-card:not\(\.photo-card--entering\):not\(\.photo-card--revealed\)\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*translateY\(24px\);/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.photo-card--entering\s*\{[^}]*animation-delay:\s*0ms\s*!important/s);
});

test('photography page pre-renders all 217 accessible thumbnail links', () => {
  const html = read('photography.html');
  const cards = [...html.matchAll(/<a class="photo-card"[\s\S]*?<\/a>/g)];
  assert.equal(cards.length, 217);
  for (const card of cards) {
    assert.match(card[0], /href="\.\/assets\/photos\/full\/[^"]+\.jpg"/);
    assert.match(card[0], /<img src="\.\/assets\/photos\/thumbnails\/[^"]+\.jpg"/);
    assert.match(card[0], /<span class="photo-fallback"[^>]*>[^<]+<\/span>/);
  }
  assert.doesNotMatch(html, /请启用 JavaScript/);
});

test('all image surfaces expose a named neutral error state', () => {
  const css = read('assets/css/styles.css');
  const photography = read('photography.html');
  assert.match(css, /\.photo-fallback\s*\{[^}]*background:\s*#e8e8ed/s);
  for (const selector of ['.photo-card.is-error img', '.latest-photo.is-error img', '.lightbox-media.is-error img']) {
    assert.ok(css.includes(selector));
  }
  assert.ok(photography.includes('data-lightbox-fallback'));
  assert.match(css, /\.latest-photo img\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*1;/s);
  assert.match(css, /\.latest-photo figcaption\s*\{[^}]*z-index:\s*2;/s);
});

test('every local src and href target exists', () => {
  for (const page of pages) {
    const html = read(page);
    const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((reference) => reference.startsWith('./'));
    for (const reference of references) {
      assert.equal(existsSync(localTarget(reference)), true, `${page}: ${reference}`);
    }
  }

  assert.equal(existsSync(localTarget('./assets/css/styles.css?v=1#theme')), true);
});

test('README documents executable asset and verification commands', () => {
  const readme = read('README.md');
  const bundledNode = '/Users/justin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node';

  assert.ok(readme.includes('node scripts/prepare-assets.mjs'));
  assert.ok(readme.includes(`${bundledNode} scripts/prepare-assets.mjs`));
  assert.ok(readme.includes(`${bundledNode} --test tests/*.test.mjs`));
  for (const dependency of ['macOS', 'sips', 'Python', 'Pillow']) {
    assert.ok(readme.includes(dependency), `README must document ${dependency}`);
  }
});

test('global CSS contains exact Apple-style tokens and reduced motion', () => {
  const css = read('assets/css/styles.css');
  for (const token of ['#f5f5f7', '#ffffff', '#1d1d1f', '#6e6e73', 'prefers-reduced-motion']) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
});

test('English section headings are explicitly smaller than Chinese headings', () => {
  const css = read('assets/css/styles.css');
  const zhRule = css.match(/\.section-heading \.zh\s*\{([^}]*)\}/s)?.[1] ?? '';
  const enRule = css.match(/\.section-heading \.en\s*\{([^}]*)\}/s)?.[1] ?? '';
  const parseClamp = (rule) => rule.match(/font-size:\s*clamp\((\d+)px,\s*([\d.]+)vw,\s*(\d+)px\)/);
  const zhSize = parseClamp(zhRule);
  const enSize = parseClamp(enRule);

  assert.ok(zhSize, 'Chinese section heading needs an explicit responsive font size');
  assert.ok(enSize, 'English section heading needs an explicit responsive font size');
  for (let index = 1; index <= 3; index += 1) {
    assert.ok(Number(enSize[index]) < Number(zhSize[index]), 'English heading size must be smaller than Chinese heading size');
  }
});

test('site navigation is explicitly left aligned', () => {
  const css = read('assets/css/styles.css');
  const navRule = css.match(/\.site-nav\s*\{([^}]*)\}/s)?.[1] ?? '';
  assert.match(navRule, /justify-content:\s*flex-start\s*;/);
});

test('navigation and subpage content share the reference horizontal gutter', () => {
  const css = read('assets/css/styles.css');
  assert.match(css, /--page-gutter:\s*clamp\(16px,\s*3vw,\s*56px\)\s*;/);

  const expectedWidth = /width:\s*min\(calc\(100%\s*-\s*var\(--page-gutter\)\s*-\s*var\(--page-gutter\)\),\s*var\(--content-width\)\)\s*;/;
  for (const selector of ['site-nav', 'photography-main', 'interior-main']) {
    const rule = css.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, 's'))?.[1] ?? '';
    assert.match(rule, expectedWidth, `${selector} must use the shared page gutter`);
  }
});

test('homepage cards align with the photography navigation label without losing photo rounding', () => {
  const css = read('assets/css/styles.css');
  assert.match(css, /--content-edge:\s*max\(var\(--page-gutter\),\s*calc\(\(100vw\s*-\s*var\(--content-width\)\)\s*\/\s*2\)\)\s*;/);
  assert.match(css, /--nav-photography-offset:\s*70px\s*;/);
  const homeRule = css.match(/\.home-main\s*\{([^}]*)\}/s)?.[1] ?? '';
  assert.match(homeRule, /width:\s*auto\s*;/);
  assert.match(homeRule, /margin-left:\s*calc\(var\(--content-edge\)\s*\+\s*var\(--nav-photography-offset\)\)\s*;/);
  assert.match(homeRule, /margin-right:\s*calc\(var\(--content-edge\)\s*\+\s*var\(--nav-photography-offset\)\)\s*;/);
  assert.match(css, /\.latest-photo\s*\{[^}]*overflow:\s*hidden;[^}]*border-radius:\s*var\(--radius-small\);/s);
});

test('photography, essays, and about titles share the photography page offset', () => {
  const css = read('assets/css/styles.css');
  assert.match(css, /--subpage-title-offset:\s*clamp\(48px,\s*7vw,\s*96px\)\s*;/);
  for (const selector of ['photography-main', 'interior-main']) {
    const rule = css.match(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, 's'))?.[1] ?? '';
    assert.match(rule, /padding:\s*var\(--subpage-title-offset\)\s+0\s+80px\s*;/);
  }
  const aboutRule = css.match(/\.about-main\s*\{([^}]*)\}/s)?.[1] ?? '';
  assert.match(aboutRule, /padding-top:\s*var\(--subpage-title-offset\)\s*;/);
});

test('primary navigation text uses the OpenAI-style size and stays bold', () => {
  const css = read('assets/css/styles.css');
  const linksRule = css.match(/\.primary-links\s*\{([^}]*)\}/s)?.[1] ?? '';
  const brandRule = css.match(/\.brand\s*\{([^}]*)\}/s)?.[1] ?? '';
  assert.match(linksRule, /font-size:\s*14px\s*;/);
  assert.match(linksRule, /font-weight:\s*700\s*;/);
  assert.match(brandRule, /font-size:\s*18px\s*;/);
  assert.match(brandRule, /font-weight:\s*700\s*;/);
});

test('homepage sections and bilingual headings are in the required order', () => {
  const html = read('index.html');
  const news = html.indexOf('最新消息');
  const photos = html.indexOf('最新摄影');
  const essays = html.indexOf('最新随笔');
  assert.ok(news >= 0 && news < photos && photos < essays);
  for (const pair of [['最新消息', 'Latest News'], ['最新摄影', 'Latest Photography'], ['最新随笔', 'Latest Essays']]) {
    assert.match(html, new RegExp(`<span class="zh">${pair[0]}</span>\\s*<span class="en">${pair[1]}</span>`));
  }
});

test('homepage latest news shows aligned update totals and the current activity', () => {
  const html = read('index.html');
  const css = read('assets/css/styles.css');
  const javascript = read('assets/js/home.js');

  assert.match(html, /class="news-overview"[^>]*data-news-overview/);
  assert.match(html, /<h2 class="news-panel__title"[^>]*>作品更新<\/h2>/);
  assert.match(html, /<h2 class="news-panel__title"[^>]*>近期动态<\/h2>/);
  assert.match(html, /data-update-count="photography"[\s\S]*?摄影作品[\s\S]*?data-update-count="essays"[\s\S]*?随笔/);
  assert.ok(html.includes('在ai的天空中翱翔，在token的海洋中流浪'));
  assert.match(css, /\.news-overview\s*{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.news-panel__title\s*{[^}]*margin:\s*0/s);
  assert.match(css, /\.news-activity\s*{[^}]*font-size:\s*clamp\(16px,\s*1\.35vw,\s*20px\);[^}]*font-weight:\s*400;/s);
  assert.match(css, /\.update-count\s*{[^}]*text-align:\s*center;/s);
  assert.match(css, /\.update-count__value\s*{[^}]*justify-content:\s*center;/s);
  assert.match(css, /\.update-count__number\s*{[^}]*font-size:\s*clamp\(38px,\s*4\.2vw,\s*60px\)/s);
  assert.match(css, /\.update-count__label\s*{[^}]*font-size:\s*12px;[^}]*text-align:\s*center;/s);
  assert.doesNotMatch(css, /\.news-overview\s*{[^}]*border/s);
  assert.doesNotMatch(css, /\.news-panel--activity\s*{[^}]*border/s);
  assert.doesNotMatch(css, /\.update-count\s*{[^}]*border/s);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*?\.news-overview\s*{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(javascript, /photography:\s*PHOTO_DATA\.length/);
  assert.match(javascript, /essays:\s*ESSAY_DATA\.length/);
  assert.match(javascript, /IntersectionObserver/);
  assert.match(javascript, /prefers-reduced-motion:\s*reduce/);
});

test('homepage contact links are exact', () => {
  const html = read('index.html');
  const xiaohongshu = html.indexOf('https://www.xiaohongshu.com/user/profile/6579a136000000001902f6a4');
  const x = html.indexOf('https://x.com/bukejiliang');
  const instagram = html.indexOf('https://www.instagram.com/wala_ding/');
  assert.ok(xiaohongshu >= 0 && xiaohongshu < x && x < instagram);
  assert.ok(!html.includes('mailto:'));
  assert.match(html, /class="social-icon social-icon--xiaohongshu"[^>]*viewBox="0 0 24 24"[\s\S]*?<rect width="24" height="24" rx="5\.5"\/>[\s\S]*?<text[^>]*>小红书<\/text>/);
});

test('homepage social icons use the requested size and page-centered alignment', () => {
  const css = read('assets/css/styles.css');
  assert.match(css, /\.contact-links a\s*{[\s\S]*?width:\s*19\.2px;[\s\S]*?height:\s*19\.2px;/);
  assert.match(css, /\.social-icon\s*{[\s\S]*?width:\s*19\.2px;[\s\S]*?height:\s*19\.2px;/);
  assert.match(css, /\.contact-links\s*{[\s\S]*?width:\s*max-content;[\s\S]*?margin-right:\s*auto;[\s\S]*?margin-left:\s*auto;[\s\S]*?justify-content:\s*center;/);
  assert.doesNotMatch(css, /\.contact-links\s*{[^}]*margin-left:\s*100%/s);
  assert.match(css, /\.site-footer\s*{\s*padding-top:\s*36px;\s*padding-bottom:\s*20px;/);
  assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*?\.site-footer\s*{\s*padding-top:\s*28px;\s*padding-bottom:\s*15px;/);
});

test('homepage latest essays open full content in a local dialog', () => {
  const html = read('index.html');
  const css = read('assets/css/styles.css');
  const javascript = read('assets/js/essays.js');
  assert.ok(html.includes('data-latest-essays'));
  assert.ok(html.includes('data-essay-dialog'));
  assert.ok(html.includes('./assets/js/essays.js'));
  assert.equal(html.includes('即将发布'), false);
  assert.ok(javascript.indexOf("title.className = 'essay-preview__title'") < javascript.indexOf('card.replaceChildren(title, date, excerpt)'));
  assert.ok(javascript.includes("excerpt.className = 'essay-preview__excerpt'"));
  assert.doesNotMatch(javascript, /excerpt\.hidden\s*=\s*true/);
  assert.match(css, /\.essay-preview\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto\s+auto\s+4\.8em;[^}]*align-content:\s*start;[^}]*align-items:\s*start;/s);
  assert.match(css, /\.essay-preview__title\s*\{[^}]*width:\s*100%;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/s);
  assert.match(css, /\.essay-preview__excerpt\s*\{[^}]*height:\s*4\.8em;[^}]*-webkit-line-clamp:\s*3;[^}]*background:\s*linear-gradient\(to bottom,\s*var\(--text\)[^;]+;[^}]*background-clip:\s*text;/s);
  assert.match(css, /\.essay-preview__excerpt::after\s*\{[^}]*backdrop-filter:\s*blur\(\.7px\);[^}]*mask-image:\s*linear-gradient\(to bottom,\s*transparent,/s);
});

test('homepage contact accessibility is complete', () => {
  const html = read('index.html');
  for (const label of ['访问我的小红书主页', '在 X 上关注我', '访问我的 Instagram 主页']) {
    assert.ok(html.includes(`aria-label="${label}"`), `missing contact label: ${label}`);
  }
  assert.equal((html.match(/class="social-icon/g) ?? []).length, 3);
});

test('essay page uses the supplied year archive layout and full-content dialog', () => {
  const html = read('articles.html');
  const css = read('assets/css/styles.css');
  const javascript = read('assets/js/essays.js');
  assert.match(html, /<span class="zh">随笔<\/span>\s*<span class="en">Essays<\/span>/);
  assert.ok(html.includes('data-essay-archive'));
  assert.ok(html.includes('data-essay-dialog'));
  assert.match(css, /\.essay-entry\s*\{[^}]*grid-template-columns:\s*112px\s+64px\s+minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.essay-entry__title\s*\{[^}]*color:\s*#0066cc/s);
  assert.match(css, /\.essay-group-nav__trigger\s*\{[^}]*color:\s*var\(--text\)/s);
  assert.match(css, /\.essay-group-nav__menu\s*\{[^}]*min-width:\s*max-content;[^}]*display:\s*flex;[^}]*gap:\s*18px/s);
  assert.match(css, /@keyframes essay-subcategory-rise-in\s*\{[\s\S]*?from\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*translateY\(10px\);[\s\S]*?to\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*none;/s);
  assert.match(css, /\.essay-group-nav__group:hover \.essay-group-nav__menu > \*,\s*\.essay-group-nav__group:focus-within \.essay-group-nav__menu > \*\s*\{[^}]*animation:[^;]*essay-subcategory-rise-in[^;]*;[^}]*animation-delay:\s*var\(--essay-menu-delay/s);
  assert.match(css, /\.essay-entry--entering\s*\{[^}]*animation:[^;]*essay-entry-rise-in\s+\.7s[^;]*var\(--essay-reveal-delay/s);
  assert.match(css, /\.js \.essay-archive--reveal \.essay-entry:not\(\.essay-entry--entering\):not\(\.essay-entry--revealed\)\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*translateY\(24px\);/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.essay-entry--entering\s*\{[^}]*animation-delay:\s*0ms\s*!important/s);
  assert.match(css, /\.essay-year-directory\s*\{[^}]*position:\s*fixed;[^}]*right:\s*var\(--page-gutter\);/s);
  assert.match(css, /@media \(min-width:\s*1100px\)\s*\{[^}]*\.essay-archive\s*\{[^}]*max-width:\s*min\(980px,\s*calc\(100%\s*-\s*160px\)\)/s);
  assert.ok(javascript.includes('initEssayYearDirectory'));
  assert.ok(javascript.includes("const ESSAY_CATEGORIES = ['感受', '梦', '笔记']"));
  assert.ok(javascript.includes("category.className = 'essay-entry__category'"));
  assert.ok(javascript.includes("window.matchMedia('(min-width: 1100px)')"));
  assert.ok(javascript.includes("directory.hidden = topNavigationIsVisible || !desktopQuery.matches"));
  assert.ok(javascript.includes('prepareEssayEntrance'));
  assert.ok(javascript.includes("entry.style.setProperty('--essay-reveal-delay'"));
});

test('essay data contains all 84 text-only notes grouped by original creation date', () => {
  assert.equal(ESSAY_DATA.length, 84);
  assert.equal(new Set(ESSAY_DATA.map((essay) => essay.id)).size, 84);
  assert.deepEqual(
    [...new Set(ESSAY_DATA.map((essay) => essay.date.slice(0, 4)))],
    ['2026', '2025', '2024', '2023', '2022', '2021'],
  );
  assert.deepEqual(
    Object.fromEntries(
      ESSAY_DATA.reduce((counts, essay) => counts.set(essay.date.slice(0, 4), (counts.get(essay.date.slice(0, 4)) ?? 0) + 1), new Map()),
    ),
    { 2026: 32, 2025: 2, 2024: 15, 2023: 20, 2022: 3, 2021: 12 },
  );
  assert.deepEqual(
    ESSAY_DATA.map((essay) => essay.date),
    [...ESSAY_DATA].map((essay) => essay.date).sort((a, b) => b.localeCompare(a)),
  );
  for (const essay of ESSAY_DATA) {
    assert.ok(essay.title.trim().length > 0);
    assert.ok(['感受', '梦', '笔记'].includes(essay.category));
    assert.doesNotMatch(`${essay.title}\n${essay.content}`, /\[attachment:|\[按钮|图像附件|ICMNoteListCell|单元格/);
  }
  assert.deepEqual(
    Object.fromEntries(['感受', '梦', '笔记'].map((category) => [category, ESSAY_DATA.filter((essay) => essay.category === category).length])),
    { 感受: 60, 梦: 8, 笔记: 16 },
  );
});

test('about page is bilingual only in its title', () => {
  const html = read('about.html');
  assert.match(html, /<span class="zh">关于我<\/span>\s*<span class="en">About Me<\/span>/);
  assert.ok(html.includes('<p class="about-identity">1997.08</p>'));
  assert.ok(html.includes('安徽建筑大学<span class="about-degree">本科</span>'));
  assert.ok(html.includes('中国铁建XX局'));
  assert.ok(html.includes('安徽XX技术有限公司'));
  assert.ok(html.includes('<h3>关注点</h3>'));
  assert.ok(html.includes('<p>AI与人类交互的未来</p>'));
  assert.equal(html.includes('2019 - 2021'), false);
  assert.equal(html.includes('2023 - 2024'), false);
  assert.ok(html.includes('class="about-layout"'));
  assert.ok(html.includes('./assets/images/portrait.png'));
  assert.equal(html.includes('Education'), false);
  assert.equal(html.includes('Experience'), false);
});

test('about page uses aligned two-column details and repeats homepage social accounts', () => {
  const html = read('about.html');
  const css = read('assets/css/styles.css');
  const aboutRule = css.match(/\.about-layout\s*\{([^}]*)\}/s)?.[1] ?? '';
  const portraitRule = css.match(/\.about-portrait img\s*\{([^}]*)\}/s)?.[1] ?? '';
  const sectionRule = css.match(/\.about-section\s*\{([^}]*)\}/s)?.[1] ?? '';

  assert.ok(html.includes('class="about-details"'));
  assert.equal((html.match(/class="about-section"/g) ?? []).length, 4);
  assert.equal((html.match(/class="about-section__content/g) ?? []).length, 4);
  assert.match(aboutRule, /align-items:\s*start\s*;/);
  assert.match(portraitRule, /margin:\s*0\s*;/);
  assert.match(sectionRule, /display:\s*grid\s*;/);
  assert.match(sectionRule, /grid-template-columns:\s*85px\s+minmax\(0,\s*1fr\)\s*;/);
  assert.doesNotMatch(sectionRule, /border-top:/);
  assert.match(css, /\.about-details::before\s*\{[^}]*top:\s*clamp\(18px,\s*2\.6vh,\s*26px\)\s*;[^}]*bottom:\s*0\s*;[^}]*left:\s*85px\s*;[^}]*width:\s*1px\s*;[^}]*background:\s*var\(--hairline\)\s*;/s);
  assert.match(sectionRule, /padding:\s*clamp\(18px,\s*2\.6vh,\s*26px\)\s+0\s*;/);
  assert.match(css, /\.about-section h3\s*\{[^}]*padding-right:\s*21px\s*;[^}]*text-align:\s*left\s*;/s);
  assert.match(css, /\.about-section__content\s*\{[^}]*padding-left:\s*21px\s*;/s);
  assert.doesNotMatch(css, /\.about-section__content\s*\{[^}]*border-left:/s);
  assert.match(css, /\.about-identity\s*\{[^}]*margin:\s*12px\s+0\s+clamp\(36px,\s*5vh,\s*56px\)\s*;/s);
  assert.match(css, /\.about-degree\s*\{[^}]*margin-left:\s*18px\s*;/s);
  for (const url of [
    'https://www.xiaohongshu.com/user/profile/6579a136000000001902f6a4',
    'https://x.com/bukejiliang',
    'https://www.instagram.com/wala_ding/',
  ]) {
    assert.ok(html.includes(url));
  }
  assert.equal((html.match(/class="social-icon/g) ?? []).length, 3);
});

test('article and about pages have desktop and mobile layouts', () => {
  const css = read('assets/css/styles.css');
  const aboutMainRule = css.match(/\.about-main\s*\{([^}]*)\}/s)?.[1] ?? '';
  const aboutRule = css.match(/\.about-layout\s*\{([^}]*)\}/s)?.[1] ?? '';
  const mobileRules = [...css.matchAll(/@media\s*\(max-width:\s*\d+px\)\s*\{([\s\S]*?)(?=\n\})\n\}/g)]
    .map((match) => match[1])
    .join('\n');

  assert.match(aboutMainRule, /min-height:\s*calc\(100svh\s*-\s*var\(--nav-height\)\)\s*;/);
  assert.match(aboutMainRule, /display:\s*flex\s*;/);
  assert.match(aboutRule, /grid-template-columns:\s*minmax\([^;]+\)\s+minmax\([^;]+\)\s*;/);
  assert.match(css, /\.about-portrait img\s*\{[^}]*height:\s*auto\s*;/s);
  assert.match(css, /\.about-portrait img\s*\{[^}]*max-height:\s*min\(58svh,\s*620px\)\s*;/s);
  assert.match(css, /\.about-portrait img\s*\{[^}]*border-radius:\s*var\(--radius-large\)\s*;/s);
  assert.match(mobileRules, /\.about-layout\s*\{[^}]*grid-template-columns:\s*1fr\s*;/s);
  assert.match(mobileRules, /\.about-main\s*\{[^}]*min-height:\s*auto\s*;[^}]*display:\s*block\s*;/s);
  assert.match(mobileRules, /\.about-portrait img\s*\{[^}]*max-height:\s*none\s*;/s);
});

test('homepage latest photography uses the required desktop ratio', () => {
  const css = read('assets/css/styles.css');
  const gridRule = css.match(/\.latest-photos\s*\{([^}]*)\}/s)?.[1] ?? '';
  assert.match(gridRule, /grid-template-columns:\s*5fr\s+3fr\s+2fr\s*;/);
  assert.match(css, /\.latest-photos\s*>\s*button\s*{[^}]*min-width:\s*0;[^}]*min-height:\s*0;[^}]*height:\s*100%;/s);
  assert.match(read('index.html'), /<dialog class="photo-lightbox"[^>]*data-home-lightbox[^>]*aria-modal="true"/);
});

test('homepage and photography lightboxes use centered SVG arrow paths', () => {
  for (const page of ['index.html', 'photography.html']) {
    const html = read(page);
    assert.match(html, /aria-label="上一张作品"><\/button>/);
    assert.match(html, /aria-label="下一张作品"><\/button>/);
  }
  const css = read('assets/css/styles.css');
  assert.match(css, /lightbox-control--previous::before[^}]*M15 6 9 12l6 6/s);
  assert.match(css, /lightbox-control--next::before[^}]*m9 6 6 6-6 6/s);
});

test('lightbox arrows stay fixed on the viewport vertical center axis', () => {
  const css = read('assets/css/styles.css');
  assert.match(css, /\.lightbox-control\s*\{[^}]*position:\s*absolute;[^}]*top:\s*50%;[^}]*transform:\s*translateY\(-50%\);/s);
  assert.match(css, /\.lightbox-control--previous\s*\{[^}]*left:\s*clamp\(24px,\s*4vw,\s*64px\);/s);
  assert.match(css, /\.lightbox-control--next\s*\{[^}]*right:\s*clamp\(24px,\s*4vw,\s*64px\);/s);
  assert.match(css, /\.lightbox-control:hover\s*\{[^}]*transform:\s*translateY\(-50%\) scale\(1\.06\);/s);
  assert.match(css, /\.lightbox-figure\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s);
});

test('photography lightbox fades the current photo out and the next photo in', () => {
  const css = read('assets/css/styles.css');
  assert.match(css, /@keyframes lightbox-photo-fade-out\s*\{[\s\S]*?from\s*\{\s*opacity:\s*1;\s*\}[\s\S]*?to\s*\{\s*opacity:\s*0;/s);
  assert.match(css, /@keyframes lightbox-photo-fade-in\s*\{[\s\S]*?from\s*\{\s*opacity:\s*0;\s*\}[\s\S]*?to\s*\{\s*opacity:\s*1;/s);
  assert.match(css, /\.lightbox-media\.is-fading-out img\s*\{[^}]*animation:\s*lightbox-photo-fade-out/s);
  assert.match(css, /\.lightbox-media\.is-fading-in img\s*\{[^}]*animation:\s*lightbox-photo-fade-in/s);
});

test('homepage mobile photography cards preserve descending visual hierarchy', () => {
  const css = read('assets/css/styles.css');
  const mobile = css.match(/@media \(max-width: 640px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(mobile, /\.latest-photo--primary\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/s);
  assert.match(mobile, /\.latest-photo--secondary\s*\{[^}]*aspect-ratio:\s*3\s*\/\s*2/s);
  assert.match(mobile, /\.latest-photo--tertiary\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
});

test('renderLatestPhotos renders the first three dated records with hierarchy classes', async () => {
  assert.equal(existsSync(new URL('../assets/js/home.js', import.meta.url)), true, 'home module must exist');
  const originalDocument = globalThis.document;
  const container = {
    children: [],
    replaceChildren(...children) { this.children = children; },
  };
  const lightbox = {
    open: false,
    listeners: new Map(),
    addEventListener(type, handler) { this.listeners.set(type, handler); },
    showModal() { this.open = true; },
    close() { this.open = false; },
  };
  const lightboxImage = {
    parentElement: { classList: { add() {}, remove() {} } },
    addEventListener() {},
  };
  const lightboxClose = { addEventListener() {}, focus() {} };
  const lightboxPrevious = { addEventListener() {} };
  const lightboxNext = { addEventListener() {} };
  const lightboxFallback = {};
  const lightboxTitle = {};
  const lightboxMeta = {};
  const homeElements = new Map([
    ['[data-latest-photos]', container],
    ['[data-home-lightbox]', lightbox],
    ['[data-home-lightbox-image]', lightboxImage],
    ['[data-home-lightbox-fallback]', lightboxFallback],
    ['[data-home-lightbox-title]', lightboxTitle],
    ['[data-home-lightbox-meta]', lightboxMeta],
    ['[data-home-lightbox-close]', lightboxClose],
    ['[data-home-lightbox-previous]', lightboxPrevious],
    ['[data-home-lightbox-next]', lightboxNext],
  ]);
  const createElement = (tagName) => ({
    tagName,
    children: [],
    listeners: new Map(),
    classList: { values: new Set(), add(value) { this.values.add(value); } },
    addEventListener(type, handler) { this.listeners.set(type, handler); },
    setAttribute(name, value) { this[name] = value; },
    append(...children) { this.children.push(...children); },
  });
  globalThis.document = {
    activeElement: null,
    querySelector: (selector) => homeElements.get(selector) ?? null,
    createElement,
    addEventListener() {},
  };

  try {
    const { renderLatestPhotos } = await import(`../assets/js/home.js?test=${Date.now()}`);
    renderLatestPhotos([
      { id: 'one', title: 'One', date: '2026-01-03', src: './one.jpg', thumbnailSrc: './one-thumb.jpg', alt: 'One alt' },
      { id: 'skip', title: 'Skip', date: null, src: './skip.jpg', alt: 'Skip alt' },
      { id: 'two', title: 'Two', date: '2026-01-02', src: './two.jpg', thumbnailSrc: './two-thumb.jpg', alt: 'Two alt' },
      { id: 'three', title: 'Three', date: '2026-01-01', src: './three.jpg', thumbnailSrc: './three-thumb.jpg', alt: 'Three alt' },
      { id: 'four', title: 'Four', date: '2025-12-31', src: './four.jpg', alt: 'Four alt' },
    ]);

    assert.equal(container.children.length, 3);
    assert.deepEqual(
      container.children.map((button) => button.children[0].className),
      ['latest-photo latest-photo--primary', 'latest-photo latest-photo--secondary', 'latest-photo latest-photo--tertiary'],
    );
    assert.deepEqual(container.children.map((button) => button.tagName), ['button', 'button', 'button']);
    assert.deepEqual(container.children.map((button) => button.children[0].children[0].src), ['./one-thumb.jpg', './two-thumb.jpg', './three-thumb.jpg']);
    assert.deepEqual(container.children.map((button) => button.children[0].children[1].textContent), ['One', 'Two', 'Three']);
    const firstFigure = container.children[0].children[0];
    firstFigure.children[0].listeners.get('error')();
    assert.equal(firstFigure.classList.values.has('is-error'), true);
    container.children[0].listeners.get('click')();
    assert.equal(lightbox.open, true);
    assert.equal(lightboxImage.src, './one.jpg');
    assert.equal(lightboxTitle.textContent, 'One');
  } finally {
    globalThis.document = originalDocument;
  }
});

test('Escape returns focus only when the mobile menu is open', async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const listeners = new Map();
  let expanded = 'false';
  let focusCount = 0;
  const label = { textContent: '打开导航菜单' };
  const menuButton = {
    querySelector: () => label,
    getAttribute: () => expanded,
    setAttribute: (name, value) => {
      if (name === 'aria-expanded') expanded = value;
    },
    addEventListener: (type, handler) => listeners.set(`button:${type}`, handler),
    focus: () => { focusCount += 1; },
  };
  const primaryLinks = {
    classList: { remove() {}, toggle() {} },
    addEventListener: (type, handler) => listeners.set(`links:${type}`, handler),
  };

  globalThis.document = {
    readyState: 'loading',
    querySelector: (selector) => selector === '.mobile-menu-button' ? menuButton : primaryLinks,
    querySelectorAll: () => [],
    addEventListener: (type, handler) => listeners.set(`document:${type}`, handler),
  };
  globalThis.window = {};

  try {
    const source = read('assets/js/site.js');
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
    const { initSite } = await import(moduleUrl);
    initSite();

    listeners.get('document:keydown')({ key: 'Escape' });
    assert.equal(focusCount, 0, 'closed menu must not steal focus on Escape');

    expanded = 'true';
    listeners.get('document:keydown')({ key: 'Escape' });
    assert.equal(expanded, 'false');
    assert.equal(focusCount, 1, 'open menu returns focus to its button on Escape');
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});
