// ============================================================
// FuSang Vision Portal — Shared Components
//
// 用法(每個頁面):
//   <script src="./config.js"></script>              ← 先載入(classic,設定來源)
//   <div id="site-header"></div>
//   ... 頁面內容 ...
//   <div id="site-footer"></div>
//   <script type="module" src="components.js"></script>
//
// 提供:
//   - 共用 design tokens CSS(自動注入 <head>)
//   - Header(Logo 左 + 導航右)
//   - Footer(標語 + 連結 + 版權)
//   - Supabase client(window.fsSupabase)
//   - requireAuth() / getSession() / signOut()
//   - startCheckout(productType, extra)  ← 購買/訂閱
//
// 改 header/footer/樣式 → 只改這個檔案,全站生效
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { I18N, SUPPORTED_LANGS } from './i18n.js';

// ─── Supabase ────────────────────────────────────────────────
// 設定值集中於 config.js(classic script,先於本 module 載入 → window.CFG)。
// ⚠ 過渡 fallback:若某頁尚未加 <script src="./config.js">,退回下方寫死值,
//    確保遷移期間不壞站。待全站頁面都接上 config.js 後,刪除 FALLBACK 區塊。
const FALLBACK = {
  SUPABASE_URL:      'https://vrquktgjawayuioglqfn.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXVrdGdqYXdheXVpb2dscWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzAzNjIsImV4cCI6MjA5NTA0NjM2Mn0.6qd9mW2jWYgplfBzr3uTrxVVTilFplJ__ZYM5R7Rrw4',
};
const CFG = window.CFG || FALLBACK;
if (!window.CFG) {
  console.warn('[components] window.CFG 未載入,使用過渡 fallback。請在本頁 <head> 補 <script src="./config.js"></script>(排在 components.js 之前)。');
}

const SUPABASE_URL = CFG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CFG.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});
// 也掛到 window,讓非 module script 也能用
window.fsSupabase = supabase;

// ─── 元件用語言(同步,讀快取)─────────────────────────────────
//   header/footer 只需 UI 字串,不需 glossary → 同步讀 localStorage 即可,不阻塞。
//   快取由各頁 initI18n() 寫入(語言鎖定不變)。首次無快取 → 預設 zh-TW。
const LANG_CACHE_KEY = 'fs_lang';
function fsLang() {
  try {
    const c = localStorage.getItem(LANG_CACHE_KEY);
    if (c && SUPPORTED_LANGS.includes(c)) return c;
  } catch (_) {}
  return 'zh-TW';
}
// 元件 UI 字串(fallback 鏈:當前→en→zh-TW→key)
function tc(key) {
  const lang = fsLang();
  for (const L of [lang, 'en', 'zh-TW']) {
    const v = I18N[L] && I18N[L][key];
    if (v !== undefined) return v;
  }
  return key;
}

// ─── Design tokens CSS(注入 head)────────────────────────────
const SHARED_CSS = `
:root {
  --bg-primary: #faf7f1;
  --bg-card: #ffffff;
  --bg-soft: #f0ece3;
  --bg-soft-2: #f5f1e8;
  --ink-darkest: #15363a;
  --ink-dark: #2d4a4d;
  --ink-mid: #5a7174;
  --ink-light: #8fa2a4;
  --ink-faint: #c4cfd0;
  --accent-deep: #15363a;
  --accent-soft: #4d7878;
  --accent-pale: #d4dfde;
  --silver-deep: #7d9596;
  --silver-soft: #b2c3c4;
  --silver-pale: #dde5e4;
  --rule: #e0dbcf;
  --rule-soft-2: #efe9da;
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
}
.fs-header-brand img {
  height: 36px;
  width: auto;
  display: block;
}
@media (max-width: 560px) {
  .fs-header-brand img { height: 30px; }
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

@media (max-width: 560px) {
  .fs-header { padding: 16px 20px; }
  .fs-header-nav { gap: 16px; }
  .fs-nav-link { font-size: 13px; }
}

/* ── Footer ── */
.fs-footer {
  margin-top: auto;
  padding: 48px 32px 40px;
  border-top: 1px solid var(--rule);
  text-align: center;
  background: var(--bg-soft-2);
}
.fs-footer-brand {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}
.fs-footer-brand img {
  height: 40px;
  width: auto;
  display: block;
}
.fs-footer-tagline {
  font-family: var(--font-serif-zh);
  font-size: 13px;
  line-height: 1.9;
  color: var(--ink-mid);
  letter-spacing: 0.05em;
  margin-bottom: 24px;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}
.fs-footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;
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

// ─── Header ──────────────────────────────────────────────────
// activePage: 'chart' | 'decade' | 'annual' | 'monthly' | 'account' | null
function injectHeader(activePage = null) {
  const el = document.getElementById('site-header');
  if (!el) return;

  el.innerHTML = `
    <header class="fs-header">
      <div class="fs-header-brand" id="fs-brand">
        <img src="https://fusang-vision.com/cdn/shop/files/Fusang-3.png?v=1738277042&width=260" alt="FuSang Vision" />
      </div>
      <nav class="fs-header-nav">
        <span class="fs-nav-link ${activePage === 'chart' ? 'active' : ''}" data-nav="chart">${tc('navChart')}</span>
        <span class="fs-nav-link ${activePage === 'decade' ? 'active' : ''}" data-nav="decade">${tc('navDecade') === 'navDecade' ? '大限' : tc('navDecade')}</span>
        <span class="fs-nav-link ${activePage === 'annual' ? 'active' : ''}" data-nav="annual">${tc('navAnnual')}</span>
        <span class="fs-nav-link ${activePage === 'monthly' ? 'active' : ''}" data-nav="monthly">${tc('navMonthly')}</span>
        <span class="fs-nav-link ${activePage === 'consultation' ? 'active' : ''}" data-nav="consultation">${tc('navConsultation') === 'navConsultation' ? '單獨問事' : tc('navConsultation')}</span>
        <span class="fs-nav-link ${activePage === 'account' ? 'active' : ''}" data-nav="account">${tc('navAccount')}</span>
        <span class="fs-nav-signout" id="fs-signout">${tc('navSignOut')}</span>
      </nav>
    </header>
  `;

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
  document.getElementById('fs-signout').addEventListener('click', signOut);
}

// ─── Footer ──────────────────────────────────────────────────
function injectFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;

  el.innerHTML = `
    <footer class="fs-footer">
      <div class="fs-footer-brand">
        <img src="https://fusang-vision.com/cdn/shop/files/Fusang-3.png?v=1738277042&width=260" alt="FuSang Vision" />
      </div>
      <div class="fs-footer-tagline">
        ${tc('footerTagline')}
      </div>
      <div class="fs-footer-links">
        <a href="#" class="fs-footer-link">${tc('footerPrivacy')}</a>
        <a href="#" class="fs-footer-link">${tc('footerDisclaimer')}</a>
        <a href="mailto:info@fusang-vision.com" class="fs-footer-link">${tc('footerContact')}</a>
      </div>
      <div class="fs-footer-copy">© 2026 FuSang Vision · ${tc('footerCopySuffix')}</div>
    </footer>
  `;
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
  try { localStorage.removeItem(LANG_CACHE_KEY); } catch (_) {}
  await supabase.auth.signOut();
  window.location.href = 'login.html';
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
// 頁面可在 script 裡設 window.FS_ACTIVE_PAGE = 'chart' 來標記當前頁
function initComponents() {
  try { document.documentElement.lang = fsLang(); } catch (_) {}
  injectCss();
  injectHeader(window.FS_ACTIVE_PAGE || null);
  injectFooter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponents);
} else {
  initComponents();
}
