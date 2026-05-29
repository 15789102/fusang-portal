// ============================================================
// FuSang Vision Portal — Shared Components
//
// 用法(每個頁面):
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
//
// 改 header/footer/樣式 → 只改這個檔案,全站生效
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// ─── Supabase ────────────────────────────────────────────────
const SUPABASE_URL = 'https://vrquktgjawayuioglqfn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXVrdGdqYXdheXVpb2dscWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzAzNjIsImV4cCI6MjA5NTA0NjM2Mn0.6qd9mW2jWYgplfBzr3uTrxVVTilFplJ__ZYM5R7Rrw4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});
// 也掛到 window,讓非 module script 也能用
window.fsSupabase = supabase;

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
// activePage: 'chart' | 'account' | null
function injectHeader(activePage = null) {
  const el = document.getElementById('site-header');
  if (!el) return;

  el.innerHTML = `
    <header class="fs-header">
      <div class="fs-header-brand" id="fs-brand">
        <img src="https://fusang-vision.com/cdn/shop/files/Fusang-3.png?v=1738277042&width=260" alt="FuSang Vision" />
      </div>
      <nav class="fs-header-nav">
        <span class="fs-nav-link ${activePage === 'chart' ? 'active' : ''}" data-nav="chart">本命盤</span>
        <span class="fs-nav-link ${activePage === 'account' ? 'active' : ''}" data-nav="account">帳戶</span>
        <span class="fs-nav-signout" id="fs-signout">登出</span>
      </nav>
    </header>
  `;

  document.getElementById('fs-brand').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });
  el.querySelector('[data-nav="chart"]').addEventListener('click', () => {
    window.location.href = 'chart.html';
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
        不是預知命運,<br>而是穩健有意識地走向嚮往的生活
      </div>
      <div class="fs-footer-links">
        <a href="#" class="fs-footer-link">隱私政策</a>
        <a href="#" class="fs-footer-link">免責聲明</a>
        <a href="mailto:info@fusang-vision.com" class="fs-footer-link">聯絡我們</a>
      </div>
      <div class="fs-footer-copy">© 2026 FuSang Vision · 紫微斗數</div>
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
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

// ─── Init ────────────────────────────────────────────────────
// 頁面可在 script 裡設 window.FS_ACTIVE_PAGE = 'chart' 來標記當前頁
function initComponents() {
  injectCss();
  injectHeader(window.FS_ACTIVE_PAGE || null);
  injectFooter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponents);
} else {
  initComponents();
}
