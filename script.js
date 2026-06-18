const photos = [
  ["建筑", "三河古镇"], ["建筑", "乌镇大剧院"], ["建筑", "南京总统府"], ["建筑", "南京雨花阁"],
  ["建筑", "合肥天鹅湖"], ["建筑", "合肥美术馆"], ["建筑", "嘉兴教堂"], ["建筑", "天鹅湖银泰in77"],
  ["建筑", "安建大图书馆"], ["建筑", "安徽省图书馆"], ["建筑", "徐渭艺术馆"], ["建筑", "拙政园"],
  ["建筑", "新疆美术馆"], ["建筑", "木心美术馆"], ["建筑", "苏州博物馆"], ["建筑", "苏州站"], ["建筑", "长治方山"],
  ["风光", "DSC_0117"], ["风光", "合肥·局部降雨"], ["风光", "合肥·翡翠湖"], ["风光", "合肥·翡翠湖·落日"],
  ["风光", "合肥·落日"], ["风光", "大连·日出"], ["风光", "大连·普兰店落日"], ["风光", "大连·长海县"],
  ["风光", "巢湖边落日"], ["风光", "景德镇·昌江大桥"], ["风光", "杭州·保俶塔"], ["风光", "杭州·苏堤·落日"],
  ["风光", "杭州·西湖"], ["风光", "杭州·西湖·雷峰塔"], ["风光", "黄山·宏村"],
  ["陌生人", "IMG_0431"], ["陌生人", "IMG_0480"], ["陌生人", "IMG_0485"], ["陌生人", "IMG_0769"],
  ["陌生人", "IMG_1359"], ["陌生人", "IMG_1414"], ["陌生人", "IMG_1913"], ["陌生人", "IMG_2727"],
  ["陌生人", "IMG_2778"], ["陌生人", "IMG_3037"], ["陌生人", "IMG_3915"], ["陌生人", "IMG_5981"],
  ["陌生人", "IMG_6424"], ["陌生人", "IMG_6760"], ["陌生人", "IMG_9390"], ["陌生人", "IMG_9435"],
  ["陌生人", "IMG_9596"], ["陌生人", "IMG_9615"],
  ["形式", "1"], ["形式", "3"], ["形式", "4"], ["形式", "5"], ["形式", "6"], ["形式", "7"],
  ["形式", "DSC_5042"], ["形式", "DSC_5085"], ["形式", "IMG_0156"], ["形式", "IMG_0392"],
  ["形式", "IMG_1690"], ["形式", "IMG_1737"], ["形式", "IMG_3292"], ["形式", "IMG_3330"],
  ["形式", "IMG_3635"], ["形式", "IMG_3722"], ["形式", "IMG_3965"], ["形式", "IMG_4509"],
  ["形式", "IMG_4700"], ["形式", "IMG_4892"], ["形式", "IMG_8692"], ["形式", "IMG_9213"],
  ["形式", "云彩"], ["形式", "思绪"], ["形式", "楼梯"]
].map(([category, title], index) => ({
  category,
  title,
  index,
  src: `assets/photos/${category}/${title}.jpg`
}));

const photoGroups = [
  { category: "建筑", english: "Architecture" },
  { category: "风光", english: "Landscape" },
  { category: "陌生人", english: "Strangers" },
  { category: "形式", english: "Form" }
];

const wall = document.querySelector("#photoWall");
const lightbox = document.querySelector("#lightbox");
const lightboxImg = lightbox?.querySelector("img");
const lightboxCaption = lightbox?.querySelector("p");
const navLinks = [...document.querySelectorAll(".glass-nav a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function renderPhotoCard(photo) {
  return `
    <button class="photo-card reveal" type="button" data-src="${photo.src}" data-title="${photo.title}" data-category="${photo.category}">
      <img src="${photo.src}" alt="${photo.category}摄影作品：${photo.title}" loading="lazy">
      <span>${photo.title}</span>
    </button>
  `;
}

function renderPhotos() {
  if (!wall) return;
  wall.innerHTML = photoGroups.map((group) => {
    const groupPhotos = photos.filter((photo) => photo.category === group.category);

    return `
      <section class="photo-group" data-group="${group.category}">
        <h3>${group.category} / ${group.english}</h3>
        <div class="photo-grid">
          ${groupPhotos.map(renderPhotoCard).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function playShutter() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const click = ctx.createOscillator();
  const snap = ctx.createOscillator();
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.018));
  }

  click.type = "square";
  click.frequency.setValueAtTime(1450, now);
  snap.type = "triangle";
  snap.frequency.setValueAtTime(210, now + 0.025);
  noise.buffer = buffer;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.32, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  click.connect(gain);
  snap.connect(gain);
  noise.connect(gain);
  gain.connect(ctx.destination);
  click.start(now);
  click.stop(now + 0.035);
  snap.start(now + 0.03);
  snap.stop(now + 0.11);
  noise.start(now + 0.016);
  noise.stop(now + 0.11);
}

function setupReveal() {
  const revealItems = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  revealItems.forEach((item) => observer.observe(item));
}

function setupActiveNav() {
  if (!sections.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { threshold: 0.54 });

  sections.forEach((section) => observer.observe(section));
}

document.addEventListener("click", (event) => {
  const card = event.target.closest(".photo-card");
  if (card && lightbox && lightboxImg && lightboxCaption) {
    lightboxImg.src = card.dataset.src;
    lightboxImg.alt = `${card.dataset.category}摄影作品：${card.dataset.title}`;
    lightboxCaption.textContent = `${card.dataset.category} / ${card.dataset.title}`;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  }

  if (event.target.closest("[data-shutter]")) {
    playShutter();
  }
});

if (lightbox && lightboxImg) {
  lightbox.querySelector("button").addEventListener("click", () => {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.removeAttribute("src");
  });

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      lightbox.querySelector("button").click();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox?.classList.contains("open")) {
    lightbox.querySelector("button").click();
  }
});

renderPhotos();
setupReveal();
setupActiveNav();
