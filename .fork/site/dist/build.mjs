// Builds the site: wraps each page body in src/<lang>/ with the shared head, header and footer.
// English pages go to the root, Ukrainian ones to uk/. Run: node build.mjs
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const SITE = "https://molfarwav.github.io";
const REPO = "https://github.com/MolfarWav/Molfar.Vertep";
const DISCORD = "https://discord.gg/NMqSehTCTs";

const LANGS = {
  en: {
    dir: "", up: "", label: "EN", htmlLang: "en", ogLocale: "en_US",
    nav: { features: "Features", download: "Download", home: "Molfar Vertep home", main: "Main navigation", lang: "Language" },
    footer: {
      privacy: "Privacy policy", issues: "Issues", license: "License (AGPL-3.0)", features: "Features", download: "Download",
      note: `Molfar Vertep is free software under the AGPL-3.0-only license. A modified fork of <a href="https://github.com/ProjectChrysalis/Chrysalis-Engine">Chrysalis Engine by ProjectChrysalis</a>. Vibe-coded openly: written by AI agents while the authors described and corrected.`,
      molfar: "Pixel Molfar casts. He approves.",
      skip: "Skip to content",
    },
  },
  uk: {
    dir: "uk/", up: "../", label: "UA", htmlLang: "uk", ogLocale: "uk_UA",
    nav: { features: "Можливості", download: "Завантажити", home: "Molfar Vertep, головна", main: "Головне меню", lang: "Мова" },
    footer: {
      privacy: "Політика конфіденційності", issues: "Issues", license: "Ліцензія (AGPL-3.0)", features: "Можливості", download: "Завантажити",
      note: `Molfar Vertep — вільне програмне забезпечення за ліцензією AGPL-3.0-only. Змінений форк <a href="https://github.com/ProjectChrysalis/Chrysalis-Engine">Chrysalis Engine від ProjectChrysalis</a>. Написаний відкрито вайбкодингом: код писали ШІ-агенти, а автори описували й виправляли.`,
      molfar: "Піксельний Мольфар чаклує. Він схвалює.",
      skip: "Перейти до змісту",
    },
  },
};

// A page body starts with <!-- title: ... | description: ... -->
function meta(raw, file) {
  const body = raw.trimStart();
  const m = body.match(/^<!--\s*title:\s*(.*?)\s*\|\s*description:\s*(.*?)\s*-->\s*/s);
  if (!m) throw new Error(`${file}: missing the title/description comment`);
  return { title: m[1], description: m[2], body: body.slice(m[0].length) };
}

function page(lang, name, { title, description, body }) {
  const L = LANGS[lang];
  const up = L.up;
  const other = lang === "en" ? "uk" : "en";
  const href = (l) => `${LANGS[l].dir}${name === "index.html" ? "" : name}`;
  const url = (l) => `${SITE}/${href(l)}`;
  const switchLink = (l) => {
    const target = `${up}${LANGS[l].dir}${name}`;
    return l === lang
      ? `<a href="${name}" class="active" aria-current="true" lang="${LANGS[l].htmlLang}">${LANGS[l].label}</a>`
      : `<a href="${target}" lang="${LANGS[l].htmlLang}" hreflang="${LANGS[l].htmlLang}">${LANGS[l].label}</a>`;
  };
  const current = (n) => (n === name ? ` aria-current="page"` : "");
  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="color-scheme" content="dark light">
  <link rel="canonical" href="${url(lang)}">
  <link rel="alternate" hreflang="en" href="${url("en")}">
  <link rel="alternate" hreflang="uk" href="${url("uk")}">
  <link rel="alternate" hreflang="x-default" href="${url("en")}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${SITE}/assets/social-preview.png">
  <meta property="og:url" content="${url(lang)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${L.ogLocale}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${up}assets/favicon-64.png" type="image/png">
  <link rel="stylesheet" href="${up}assets/site.css">
</head>
<body>
  <a class="skip-link" href="#main">${L.footer.skip}</a>
  <header class="site-header">
    <div class="container header-inner">
      <a href="${up}${L.dir}index.html" class="wordmark" aria-label="${L.nav.home}">
        <img src="${up}assets/vertep-logo.svg" alt="" aria-hidden="true" width="28" height="28">
        <span class="wordmark-text">Molfar&nbsp;Vertep</span>
      </a>
      <nav class="header-nav" aria-label="${L.nav.main}">
        <a href="features.html" class="nav-features"${current("features.html")}>${L.nav.features}</a>
        <a href="download.html" class="nav-download"${current("download.html")}>${L.nav.download}</a>
        <a href="${REPO}" class="nav-external">GitHub</a>
        <a href="${DISCORD}" class="nav-external">Discord</a>
        <span class="lang-switch" role="group" aria-label="${L.nav.lang}">
          ${switchLink("en")}
          <span class="sep" aria-hidden="true">|</span>
          ${switchLink("uk")}
        </span>
      </nav>
    </div>
  </header>

  <main id="main">
${body.trimEnd()}
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-links">
        <a href="privacy.html"${current("privacy.html")}>${L.footer.privacy}</a>
        <a href="features.html">${L.footer.features}</a>
        <a href="download.html">${L.footer.download}</a>
        <a href="${REPO}">GitHub</a>
        <a href="${DISCORD}">Discord</a>
        <a href="${REPO}/issues">${L.footer.issues}</a>
        <a href="${REPO}/blob/main/LICENSE">${L.footer.license}</a>
      </div>
      <div class="footer-note">${L.footer.note}</div>
      <div class="footer-note footer-molfar">
        <img src="${up}assets/molfar-cast.gif" alt="" aria-hidden="true" width="64" height="64" loading="lazy">
        ${L.footer.molfar}
      </div>
    </div>
  </footer>
</body>
</html>
`.replaceAll('src="assets/', `src="${up}assets/`).replaceAll(`${up}${up}assets/`, `${up}assets/`);
}

for (const lang of Object.keys(LANGS)) {
  const out = LANGS[lang].dir;
  if (out) mkdirSync(out, { recursive: true });
  for (const name of readdirSync(`src/${lang}`).filter((f) => f.endsWith(".html"))) {
    const file = `src/${lang}/${name}`;
    writeFileSync(`${out}${name}`, page(lang, name, meta(readFileSync(file, "utf8"), file)));
  }
}
console.log("built");
