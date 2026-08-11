// ============================================================
// FuSang Vision Portal — Shared Components
//
// 用法(每個頁面):
//   <script src="./config.js"></script>              ← 環境設定(classic,最先)
//   <script src="./i18n.js"></script>                ← i18n 核心(classic,設 window.FSI18N,次)
//   <div id="site-header"></div>
//   ... 頁面內容 ...
//   <div id="site-footer"></div>
//   <script type="module" src="components.js"></script>  ← 本檔(module,最後)
//
// 提供:
//   - 共用 design tokens CSS(自動注入 <head>)
//   - Header(Logo 左 + 導航右 + 語言切換)
//   - Footer(標語 + 連結 + 版權)
//   - Supabase client(window.fsSupabase)
//   - requireAuth() / getSession() / signOut()
//   - startCheckout(productType, extra)   ← 購買/訂閱
//   - loadReportGlossary(session)         ← 報告頁:鎖定報告語言 + 載入術語 glossary
//
// i18n:
//   UI 字串走 window.FSI18N(classic,i18n.js 提供)。header/footer 以 data-i18n 標記,
//   語言切換由 header 的語言鈕統一處理(setUILang → applyI18n → 派 i18n:changed)。
//   本檔不再 import i18n.js(i18n.js 已是 classic 全域)。
//
// 改 header/footer/樣式 → 只改這個檔案,全站生效
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// ─── 前置檢查:i18n 核心須先於本 module 載入(classic → window.FSI18N)──────
if (!window.FSI18N) {
  throw new Error('[components] window.FSI18N 未載入。請確認本頁 <head> 內 <script src="i18n.js"></script> 排在 components.js 之前。');
}
const I18N = window.FSI18N;

// ─── Supabase ────────────────────────────────────────────────
// 設定值集中於 config.js(classic script,須先於本 module 載入 → window.CFG)。
// 每頁 <head> 皆須有 <script src="config.js">,排在 components.js 之前。
if (!window.CFG || !window.CFG.SUPABASE_URL || !window.CFG.SUPABASE_ANON_KEY) {
  throw new Error('[components] window.CFG 未載入。請確認本頁 <head> 內 <script src="config.js"></script> 排在 components.js 之前。');
}
const SUPABASE_URL = window.CFG.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.CFG.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});
// 也掛到 window,讓非 module script 也能用
window.fsSupabase = supabase;

// UI 字串短別名(header/footer 內部用;等同 window.FSI18N.t)
function tc(key) { return I18N.t(key); }

// ─── Design tokens CSS(注入 head)────────────────────────────
// 色彩對齊 DESIGN.md。--ink-darkest 維持 #15363a(最深墨綠);--accent-deep 已與其
// 分離為 #1d4a4f(深青綠強調)。新增點綴:--gold/--gold-soft/--dawn、漸層用
// --wash-teal、語意 --error。--silver-* / --t-*(四化色)非 DESIGN 範圍,保留原值。
const SHARED_CSS = `
:root {
  --bg-primary: #f8f9fa;
  --bg-veil: 0.4;            /* 全站背景遮罩淡度:越大圖越淡(0=全見圖,1=全遮) */
  --bg-card: #ffffff;
  --bg-soft: #eef3f9;
  --bg-soft-2: #e9eff7;
  --wash-teal: #eef3f9;        /* 晨曦暈染漸層用(CSS 漸層模擬淡青綠) */
  --ink-darkest: #001b3c;
  --ink-dark: #16323f;
  --ink-mid: #41484d;
  --ink-light: #8a97a5;
  --ink-faint: #b6c2cd;
  --accent-deep: #1d4e63;
  --accent-soft: #296283;
  --accent-pale: #c7e7ff;
  --silver-deep: #6f8698;
  --silver-soft: #a9bccb;
  --silver-pale: #d3dde6;
  --gold: #b8945c;             /* 主點綴金,常規精緻細節 */
  --gold-soft: #c9ab7d;        /* 淡金 */
  --dawn: #e0a878;             /* 晨曦暖橘,僅溫暖時刻:歡迎/完成/慶祝 */
  --rule: #dbe2ea;
  --rule-soft-2: #e6ecf2;
  --error: #a8453a;
  --t-lu: #3d7c5e;
  --t-quan: #5e4a82;
  --t-ke: #2a5784;
  --t-ji: #7a3d4a;
  --t-lu-bg: #e8f0eb;
  --t-quan-bg: #ebe6f0;
  --t-ke-bg: #e3ebf2;
  --t-ji-bg: #f0e3e6;
  --font-serif-en: 'Cormorant Garamond', Georgia, serif;
  --font-serif-zh: 'Noto Serif TC', 'PingFang TC', 'Microsoft JhengHei', serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--bg-primary);
  color: var(--ink-darkest);
  font-family: var(--font-serif-zh);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  line-height: 1.5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
/* body 底色透明,讓 #fs-bg 背景層透出(html 保留 --bg-primary 當 canvas/fallback) */
body { background: transparent; }
a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }

/* ── Header ── */
.fs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  border-bottom: 1px solid var(--rule);
  background: var(--bg-primary);
  position: sticky;
  top: 0;
  z-index: 50;
  flex-wrap: wrap;
  gap: 12px;
}
.fs-header-brand {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 11px;
}
.fs-header-brand img {
  height: 34px;
  width: auto;
  display: block;
}
.fs-brand-name {
  font-family: var(--font-serif-en);
  font-size: 21px;
  font-weight: 500;
  letter-spacing: 0.13em;
  color: var(--ink-darkest);
  line-height: 1;
  white-space: nowrap;
}
@media (max-width: 560px) {
  .fs-header-brand { gap: 9px; }
  .fs-header-brand img { height: 30px; }
  .fs-brand-name { font-size: 18px; letter-spacing: 0.1em; }
}
.fs-header-nav {
  display: flex;
  align-items: center;
  gap: 28px;
}
.fs-nav-link {
  font-family: var(--font-serif-zh);
  font-size: 14px;
  letter-spacing: 0.08em;
  color: var(--ink-mid);
  cursor: pointer;
  transition: color 0.2s;
  position: relative;
  padding: 4px 0;
}
.fs-nav-link:hover { color: var(--accent-deep); }
.fs-nav-link.active { color: var(--ink-darkest); }
/* 「即將推出」小標(CONSULT_ENABLED=false 時掛在 nav 項目後)*/
.fs-nav-soon {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 7px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  font-family: var(--font-sans);
  font-size: 9.5px;
  letter-spacing: 0.1em;
  line-height: 1.5;
  color: var(--ink-light);
  vertical-align: middle;
  white-space: nowrap;
}
.fs-nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -2px; left: 0; right: 0;
  height: 1px;
  background: var(--accent-soft);
}
.fs-nav-signout {
  font-family: var(--font-sans);
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--ink-light);
  cursor: pointer;
  padding: 8px 16px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  transition: all 0.2s;
}
.fs-nav-signout:hover { border-color: var(--accent-soft); color: var(--accent-deep); }

/* ── Charts 下拉 ── */
.fs-nav-group { position: relative; display: inline-flex; align-items: center; }
.fs-nav-parent { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-serif-zh); font-size: 14px; letter-spacing: 0.08em; color: var(--ink-mid); cursor: pointer; padding: 4px 0; transition: color 0.2s; }
.fs-nav-parent:hover, .fs-nav-parent.active { color: var(--accent-deep); }
.fs-nav-caret { width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform 0.25s; }
.fs-nav-group:hover .fs-nav-caret, .fs-nav-group.open .fs-nav-caret { transform: rotate(180deg); }
.fs-nav-dropdown { position: absolute; top: calc(100% + 8px); left: 0; display: none; flex-direction: column; background: var(--bg-primary); border: 1px solid var(--rule); border-radius: 10px; padding: 8px 0; min-width: 148px; box-shadow: 0 14px 30px -14px rgba(0, 27, 60, 0.22); z-index: 60; }
.fs-nav-group:hover .fs-nav-dropdown, .fs-nav-group.open .fs-nav-dropdown { display: flex; }
.fs-nav-dropdown .fs-nav-link { padding: 10px 20px; white-space: nowrap; }
.fs-nav-dropdown .fs-nav-link.active { color: var(--accent-soft); }
.fs-nav-dropdown .fs-nav-link.active::after { display: none; }
.fs-nav-dropdown-r { left: auto; right: 0; }
.fs-nav-dropdown .fs-nav-signout { border: none; border-radius: 0; text-transform: none; letter-spacing: 0.05em; font-size: 13px; font-family: var(--font-serif-zh); color: var(--ink-mid); padding: 10px 20px; margin-top: 4px; border-top: 1px solid var(--rule-soft-2); width: 100%; text-align: left; }
.fs-nav-dropdown .fs-nav-signout:hover { color: var(--accent-deep); border-color: var(--rule-soft-2); }

/* ── 語言切換(segmented)── */
.fs-lang-switch {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
}
.fs-lang-opt {
  font-family: var(--font-sans);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--ink-light);
  padding: 6px 10px;
  background: transparent;
  transition: background 0.2s, color 0.2s;
  line-height: 1;
}
.fs-lang-opt + .fs-lang-opt { border-left: 1px solid var(--rule); }
.fs-lang-opt:hover { color: var(--accent-deep); }
.fs-lang-opt.active { background: var(--accent-deep); color: var(--bg-primary); }

.fs-nav-toggle { display: none; background: none; border: none; cursor: pointer; padding: 6px; color: var(--ink-dark); }
.fs-nav-toggle svg { width: 26px; height: 26px; stroke: currentColor; fill: none; stroke-width: 1.6; stroke-linecap: round; display: block; }

@media (max-width: 560px) {
  .fs-header { padding: 16px 20px; }
  .fs-nav-link { font-size: 13px; }
  .fs-lang-opt { padding: 5px 8px; font-size: 10px; }
}

/* ── nav RWD：≤900px 漢堡下拉 ── */
@media (max-width: 900px) {
  .fs-header { flex-wrap: nowrap; }
  .fs-nav-toggle { display: flex; align-items: center; }
  .fs-header-nav {
    display: none;
    position: absolute;
    top: 100%; left: 0; right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--rule);
    box-shadow: 0 14px 28px -14px rgba(0, 27, 60, 0.2);
    padding: 6px 20px 18px;
  }
  .fs-header-nav.open { display: flex; }
  .fs-nav-group { display: block; width: 100%; }
  .fs-nav-parent { justify-content: space-between; padding: 14px 2px; border-bottom: 1px solid var(--rule-soft-2); font-size: 15px; }
  .fs-nav-caret { display: none; }
  .fs-nav-dropdown { position: static; display: flex; background: transparent; border: none; box-shadow: none; border-radius: 0; padding: 0 0 0 16px; min-width: 0; }
  .fs-nav-dropdown .fs-nav-link { padding: 13px 2px; border-bottom: 1px solid var(--rule-soft-2); }
  .fs-nav-dropdown .fs-nav-signout { padding: 13px 2px; border-top: none; border-bottom: 1px solid var(--rule-soft-2); margin-top: 0; }
  .fs-header-nav .fs-nav-link { font-size: 15px; padding: 14px 2px; border-bottom: 1px solid var(--rule-soft-2); }
  .fs-header-nav .fs-nav-link.active::after { display: none; }
  .fs-header-nav .fs-nav-link.active { color: var(--accent-soft); }
  .fs-nav-signout { margin-top: 14px; text-align: center; }
  .fs-lang-switch { margin-top: 14px; align-self: flex-start; }
}

/* ── Footer ── */
.fs-footer {
  margin-top: auto;
  padding: 16px 32px;
  border-top: 1px solid var(--rule);
  text-align: center;
  background: var(--bg-soft-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.fs-footer-brand {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-bottom: 0;
}
.fs-footer-brand img {
  height: 26px;
  width: auto;
  display: block;
}
.fs-footer-brand-name {
  font-family: var(--font-serif-en);
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--ink-dark);
  line-height: 1;
}
.fs-footer-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 0;
  flex-wrap: wrap;
}
.fs-footer-link {
  font-family: var(--font-serif-zh);
  font-size: 12px;
  color: var(--ink-mid);
  letter-spacing: 0.05em;
  transition: color 0.2s;
}
.fs-footer-link:hover { color: var(--accent-deep); }
.fs-footer-copy {
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--ink-light);
  letter-spacing: 0.05em;
}

/* ── Page wrapper(讓 footer 沉底)── */
.fs-page {
  flex: 1;
  width: 100%;
}
/* ── 全站固定背景層（避開 iOS Safari background-attachment 坑）── */
/* 圖出好後把 background-image 換成 url('./assets/bg-desktop.webp') 即可;淡度改 --bg-veil */
#fs-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: url('./assets/bg-desktop.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
#fs-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(248, 249, 250, var(--bg-veil, 0.72));
}
@media (max-width: 640px) {
  #fs-bg { background-image: url('./assets/bg-mobile.webp'); }
}
`;

function injectCss() {
  // 字型(若頁面沒載入)
  if (!document.querySelector('link[href*="Noto+Serif+TC"]')) {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500;600&family=Noto+Serif+TC:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(fontLink);
  }
  const style = document.createElement('style');
  style.id = 'fs-shared-css';
  style.textContent = SHARED_CSS;
  document.head.appendChild(style);
}

// ─── 全站固定背景層 ──────────────────────────────────────────
function injectBg() {
  if (document.getElementById('fs-bg')) return;
  const bg = document.createElement('div');
  bg.id = 'fs-bg';
  document.body.insertBefore(bg, document.body.firstChild);
}

// ─── Header ──────────────────────────────────────────────────
// activePage: 'chart' | 'decade' | 'annual' | 'monthly' | 'consultation' | 'account' | null
function injectHeader(activePage = null) {
  const el = document.getElementById('site-header');
  if (!el) return;

  // 單獨問事開關(SoT:config.js 的 window.CFG.CONSULT_ENABLED)
  //   明確等於 true 才算開啟;config.js 載入失敗時視同關閉(fail-closed)。
  //   關閉時 nav 項仍可點進 consultation.html(landing 保留行銷作用),僅加「即將推出」小標。
  //   ⚠ 小標與文字都必須是獨立的 data-i18n 節點:applyI18n 以 textContent 填值,
  //      若把 data-i18n 放外層 span,子節點會被清掉。故沿用 fs-nav-parent 的巢狀寫法。
  const consultOn = !!(window.CFG && window.CFG.CONSULT_ENABLED === true);
  const consultSoonTag = consultOn ? '' : '<span class="fs-nav-soon" data-i18n="navComingSoon"></span>';

  // nav 文字以 data-i18n 標記 → 由 applyI18n 填入 / 切換時自動更新
  el.innerHTML = `
    <header class="fs-header">
      <div class="fs-header-brand" id="fs-brand">
        <img src="assets/fusangvision_trans_graph_only_0706.png" alt="" />
        <span class="fs-brand-name">FuSang Vision</span>
      </div>
      <button class="fs-nav-toggle" id="fs-nav-toggle" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      <nav class="fs-header-nav" id="fs-nav">
        <div class="fs-nav-group" id="fs-charts-group">
          <span class="fs-nav-parent ${['chart','decade','annual','monthly'].includes(activePage) ? 'active' : ''}" id="fs-charts-parent"><span data-i18n="navCharts"></span><svg class="fs-nav-caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>
          <div class="fs-nav-dropdown">
            <span class="fs-nav-link ${activePage === 'chart' ? 'active' : ''}" data-nav="chart" data-i18n="navChart"></span>
            <span class="fs-nav-link ${activePage === 'decade' ? 'active' : ''}" data-nav="decade" data-i18n="navDecade"></span>
            <span class="fs-nav-link ${activePage === 'annual' ? 'active' : ''}" data-nav="annual" data-i18n="navAnnual"></span>
            <span class="fs-nav-link ${activePage === 'monthly' ? 'active' : ''}" data-nav="monthly" data-i18n="navMonthly"></span>
          </div>
        </div>
        <span class="fs-nav-link ${activePage === 'consultation' ? 'active' : ''}" data-nav="consultation"><span data-i18n="navConsultation"></span>${consultSoonTag}</span>
        <span class="fs-nav-link ${activePage === 'pricing' ? 'active' : ''}" data-nav="pricing" data-i18n="navPricing"></span>
        <div class="fs-nav-group" id="fs-account-group">
          <span class="fs-nav-parent ${['account','support'].includes(activePage) ? 'active' : ''}" id="fs-account-parent"><span data-i18n="navAccount"></span><svg class="fs-nav-caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>
          <div class="fs-nav-dropdown fs-nav-dropdown-r">
            <span class="fs-nav-link ${activePage === 'account' ? 'active' : ''}" data-nav="account" data-i18n="navAccount"></span>
            <span class="fs-nav-link ${activePage === 'support' ? 'active' : ''}" data-nav="support" data-i18n="navSupport"></span>
            <span class="fs-nav-signout" id="fs-signout" data-i18n="navSignOut"></span>
          </div>
        </div>
        <span class="fs-lang-switch" id="fs-lang-switch">
          <button class="fs-lang-opt" data-lang="zh-TW">繁中</button>
          <button class="fs-lang-opt" data-lang="zh-CN">简中</button>
          <button class="fs-lang-opt" data-lang="en">EN</button>
        </span>
      </nav>
    </header>
  `;

  // 填入 / 更新 nav 文字
  I18N.applyI18n(el);

  // 導航點擊
  document.getElementById('fs-brand').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });
  el.querySelector('[data-nav="chart"]').addEventListener('click', () => {
    window.location.href = 'chart.html';
  });
  el.querySelector('[data-nav="decade"]').addEventListener('click', () => {
    window.location.href = 'decade.html';
  });
  el.querySelector('[data-nav="annual"]').addEventListener('click', () => {
    window.location.href = 'annual.html';
  });
  el.querySelector('[data-nav="monthly"]').addEventListener('click', () => {
    window.location.href = 'monthly.html';
  });
  el.querySelector('[data-nav="consultation"]').addEventListener('click', () => {
    window.location.href = 'consultation.html';
  });
  el.querySelector('[data-nav="account"]').addEventListener('click', () => {
    window.location.href = 'account.html';
  });
  el.querySelector('[data-nav="pricing"]').addEventListener('click', () => {
    window.location.href = 'pricing.html';
  });
  // Charts 下拉：點父項展開/收起(觸控/桌機皆可);點外部收起
  const _chartsGroup = document.getElementById('fs-charts-group');
  const _chartsParent = document.getElementById('fs-charts-parent');
  if (_chartsGroup && _chartsParent) {
    _chartsParent.addEventListener('click', (e) => { e.stopPropagation(); _chartsGroup.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!_chartsGroup.contains(e.target)) _chartsGroup.classList.remove('open'); });
  }
  el.querySelector('[data-nav="support"]').addEventListener('click', () => { window.location.href = 'support.html'; });
  const _accountGroup = document.getElementById('fs-account-group');
  const _accountParent = document.getElementById('fs-account-parent');
  if (_accountGroup && _accountParent) {
    _accountParent.addEventListener('click', (e) => { e.stopPropagation(); _accountGroup.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!_accountGroup.contains(e.target)) _accountGroup.classList.remove('open'); });
  }
  document.getElementById('fs-signout').addEventListener('click', signOut);

  // 語言切換:點選 → setUILang(只動 UI,不碰報告 / glossary)
  const markActiveLang = () => {
    const cur = I18N.getUILang();
    el.querySelectorAll('.fs-lang-opt').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-lang') === cur);
    });
  };
  el.querySelectorAll('.fs-lang-opt').forEach((b) => {
    b.addEventListener('click', () => I18N.setUILang(b.getAttribute('data-lang')));
  });
  // 漢堡選單(RWD)：≤900px 收起,點漢堡展開;點連結/外部自動收起
  const _navToggle = document.getElementById('fs-nav-toggle');
  const _nav = document.getElementById('fs-nav');
  if (_navToggle && _nav) {
    _navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = _nav.classList.toggle('open');
      _navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    _nav.querySelectorAll('.fs-nav-link, .fs-nav-signout').forEach((x) => {
      x.addEventListener('click', () => { _nav.classList.remove('open'); _navToggle.setAttribute('aria-expanded', 'false'); });
    });
    document.addEventListener('click', (e) => {
      if (!_nav.contains(e.target) && !_navToggle.contains(e.target)) { _nav.classList.remove('open'); _navToggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  markActiveLang();
  // UI 語言變動(含 header 切換、profile 採用)→ 更新 active 標記
  window.addEventListener('i18n:changed', markActiveLang);
}

// ─── Footer ──────────────────────────────────────────────────
function injectFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;

  el.innerHTML = `
    <footer class="fs-footer">
      <div class="fs-footer-brand">
        <img src="assets/fusangvision_trans_graph_only_0706.png" alt="" />
        <span class="fs-footer-brand-name">FuSang Vision</span>
      </div>
      <div class="fs-footer-links">
        <a href="#" class="fs-footer-link" data-i18n="footerPrivacy"></a>
        <a href="#" class="fs-footer-link" data-i18n="footerDisclaimer"></a>
        <a href="mailto:info@fusang-vision.com" class="fs-footer-link" data-i18n="footerContact"></a>
      </div>
      <div class="fs-footer-copy">© 2026 FuSang Vision · <span data-i18n="footerCopySuffix"></span></div>
    </footer>
  `;

  // 填入 / 更新 footer 文字
  I18N.applyI18n(el);
}

// ─── Auth helpers ────────────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// 受保護頁面呼叫:沒登入 → 踢回 login.html
export async function requireAuth() {
  // 等 Supabase 處理 URL 裡可能的 token
  await new Promise((r) => setTimeout(r, 300));
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

export async function signOut() {
  // 清 UI 語言快取(含舊單軌 key);報告語言由 profile 權威,無需清
  try {
    localStorage.removeItem('fs_ui_lang');
    localStorage.removeItem('fs_lang');
  } catch (_) {}
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

// ─── 報告語言 + 術語 glossary(報告頁專用)────────────────────
// 報告頁(chart/decade/annual/monthly/result)在 render 前 await 這支:
//   1) 由 preferred_language 決定「報告語言」(鎖定) → setReportLang
//   2) 若使用者未曾明選 UI 語言 → seedUILangFromProfile(採用同語言,不寫快取)
//   3) 載入該語言 report_glossary(星曜/宮位/四化對照)→ setGlossary
// 回傳:實際採用的 reportLang。
// 注意:此支只在頁面初始化呼叫一次;header 語言切換「不」呼叫它(不重載 glossary)。
export async function loadReportGlossary(session) {
  let reportLang = 'zh-TW'; // 保底(理論上必被 profile 覆蓋)

  // 1) 報告語言 = profile.preferred_language(權威、鎖定)
  try {
    const email = session?.user?.email;
    if (email) {
      const { data } = await supabase
        .from('user_profiles')
        .select('preferred_language')
        .eq('email', email)
        .maybeSingle();
      const pl = data?.preferred_language;
      if (pl && I18N.SUPPORTED_LANGS.includes(pl)) reportLang = pl;
    }
  } catch (_) {}

  I18N.setReportLang(reportLang);
  I18N.seedUILangFromProfile(reportLang); // UI 未明選 → 預設取報告語言

  // 2) 載入該語言 glossary
  try {
    const { data } = await supabase
      .from('report_glossary')
      .select('glossary')
      .eq('language_code', reportLang)
      .maybeSingle();
    I18N.setGlossary(data?.glossary || null);
  } catch (_) {
    I18N.setGlossary(null);
  }

  return reportLang;
}

// ─── Checkout（購買/訂閱）────────────────────────────────────
// 呼叫 create-checkout EF（自動帶登入 JWT）→ 取得 Stripe checkout url → 跳轉。
// productType: 'sihua' | 'monthly_sub' | 'annual_pack' | 'ticket'
// extra: 選填，額外帶給 create-checkout 的欄位（如 ticket 的 { ticket_id }）。
//        product_type/user_id 由後端權威決定，不受 extra 覆蓋。
// 回傳：
//   成功 → 會直接跳轉 Stripe（呼叫端不會走到 return 之後）
//   被擋 / 失敗 → return { ok:false, code, expires_at? }，由呼叫端顯示文案
//     code 可能值：already_subscribed_monthly / active_annual_pack（含 expires_at）
//                  missing_ticket_id / ticket_not_found / ticket_not_payable
//                  not_authenticated / no_url / unknown
export async function startCheckout(productType, extra = {}) {
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return { ok: false, code: 'not_authenticated' };
  }

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { product_type: productType, ...extra },
  });

  // functions.invoke 在 non-2xx（含 409）時，把原始回應放進 error.context（Response 物件）
  if (error) {
    let code = 'unknown';
    const extraOut = {};
    try {
      const body = await error.context?.json();
      if (body?.error) code = body.error;
      if (body?.expires_at) extraOut.expires_at = body.expires_at;
    } catch (_) {}
    console.warn('[checkout] 失敗：', code, error);
    return { ok: false, code, ...extraOut };
  }

  if (data?.url) {
    window.location.href = data.url;   // 跳轉 Stripe checkout
    return { ok: true };
  }

  return { ok: false, code: 'no_url' };
}

// ─── Init ────────────────────────────────────────────────────
// 頁面可在 script 裡設 window.FS_ACTIVE_PAGE = 'chart' 來標記當前頁。
// documentElement.lang 由 i18n.js 管理(初始 uiLang;報告頁 setReportLang 後更新)。
function initComponents() {
  injectCss();
  injectBg();
  injectHeader(window.FS_ACTIVE_PAGE || null);
  injectFooter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponents);
} else {
  initComponents();
}
