// ============================================================
// FuSang Vision — Admin Common（運營後台共用層）
//
// 用法（每個 admin 頁面）：
//   <script type="module">
//     import { supabase, initAdmin } from './admin-common.js';
//     (async () => {
//       const ok = await initAdmin('overview');   // 頁鍵：見 ADMIN_NAV
//       if (!ok) return;                            // 非 admin 已被導走
//       // ... 頁面專屬邏輯 ...
//     })();
//   </script>
//
// 提供：
//   - console 視覺 tokens + 共用狀態樣式（自動注入 <head>）
//   - 啟動時全頁「驗證權限中」遮罩
//   - initAdmin(activePage)：requireAuth → admin_check → 非 admin 導走
//                            通過則注入頂部導航列、回傳 true
//   - 頂部導航列（admin 頁之間切換，當前頁高亮）
//   - 轉出 supabase（沿用 components.js 的同一 client）
//
// 改把關 / 導航 / tokens → 只改這個檔，全 admin 後台生效
// ============================================================

import { supabase, requireAuth, signOut } from './components.js';
export { supabase };

const NON_ADMIN_REDIRECT = './dashboard.html';

// admin 頁導航設定（新增頁面在此加一筆即可）
const ADMIN_NAV = [
  { key: 'overview', label: '服務總覽', href: 'admin-dashboard.html' },
  { key: 'context',  label: '關心重點', href: 'admin-context.html' },
];

// ─── 視覺 tokens + 共用樣式 ──────────────────────────────────
const ADMIN_CSS = `
:root{
  --bg:#F6F7F9;
  --surface:#FFFFFF;
  --ink:#1B1E27;
  --muted:#6A7280;
  --faint:#9AA1AC;
  --hair:#E7E9ED;
  --hair-strong:#D9DCE2;

  --dawn:#E26D5C;        /* 主強調：扶桑日出珊瑚 */
  --dawn-soft:#FBEDE9;
  --gold:#C2872B;        /* 次強調：晨光金 */
  --gold-soft:#FAF1DE;

  --ok:#2E9E6B;   --ok-soft:#E6F4EC;
  --fail:#D64545; --fail-soft:#FBE9E9;
  --wait:#B7821C; --wait-soft:#FAF0DC;

  --radius:12px;
  --radius-sm:8px;
  --shadow:0 1px 2px rgba(27,30,39,.04), 0 4px 16px rgba(27,30,39,.04);
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  background:var(--bg);
  color:var(--ink);
  font-family:"Inter","Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;
  font-size:14px;line-height:1.5;
  -webkit-font-smoothing:antialiased;
  font-feature-settings:"tnum" 1;
}
a{color:inherit;}
button{font-family:inherit;cursor:pointer;}

/* ── topbar + nav ── */
.fa-topbar{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:14px 24px;background:var(--surface);
  border-bottom:1px solid var(--hair);position:sticky;top:0;z-index:20;
}
.fa-brand{display:flex;align-items:center;gap:11px;}
.fa-mark{flex:0 0 auto;}
.fa-brand-text{display:flex;flex-direction:column;line-height:1.15;}
.fa-brand-zh{font-weight:600;font-size:15px;letter-spacing:.04em;}
.fa-brand-en{font-family:"Fraunces",serif;font-size:12px;color:var(--muted);letter-spacing:.02em;}

.fa-nav{display:flex;align-items:center;gap:4px;margin-left:8px;}
.fa-nav-link{
  font-size:13.5px;font-weight:500;color:var(--muted);
  padding:7px 14px;border-radius:999px;text-decoration:none;
  transition:all .15s ease;white-space:nowrap;
}
.fa-nav-link:hover{color:var(--ink);background:#F0F1F3;}
.fa-nav-link.is-active{color:#fff;background:var(--ink);}
.fa-nav-link:focus-visible{outline:2px solid var(--dawn);outline-offset:2px;}

.fa-topbar-right{display:flex;align-items:center;gap:16px;font-size:13px;}
.fa-admin-email{color:var(--muted);max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fa-signout{
  color:var(--dawn);background:none;border:1px solid var(--hair-strong);
  font-weight:500;font-size:13px;padding:6px 14px;border-radius:var(--radius-sm);
  transition:all .15s ease;
}
.fa-signout:hover{border-color:var(--dawn);background:var(--dawn-soft);}
.fa-signout:focus-visible{outline:2px solid var(--dawn);outline-offset:2px;}

.fa-wrap{max-width:1320px;margin:0 auto;padding:28px 24px 64px;}
.fa-page-head{margin-bottom:22px;}
.fa-page-title{font-family:"Fraunces",serif;font-weight:600;font-size:22px;margin:0 0 4px;letter-spacing:.01em;}
.fa-page-sub{color:var(--muted);font-size:13px;margin:0;}

/* ── 共用狀態面板 ── */
.fa-state{
  background:var(--surface);border:1px solid var(--hair);border-radius:var(--radius);
  padding:48px 24px;text-align:center;color:var(--muted);box-shadow:var(--shadow);
}
.fa-state-title{font-weight:600;color:var(--ink);margin-bottom:6px;}
.fa-state.is-error{border-color:var(--fail);background:var(--fail-soft);color:var(--fail);}
.fa-state.is-error .fa-state-title{color:var(--fail);}
.fa-spinner{
  width:26px;height:26px;border:3px solid var(--hair-strong);border-top-color:var(--dawn);
  border-radius:50%;margin:0 auto 14px;animation:fa-spin .7s linear infinite;
}
@keyframes fa-spin{to{transform:rotate(360deg);}}
.fa-hidden{display:none !important;}

/* ── 啟動遮罩 ── */
.fa-boot{
  position:fixed;inset:0;z-index:100;background:var(--bg);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  color:var(--muted);
}
.fa-boot .fa-state-title{color:var(--ink);}

@media (prefers-reduced-motion:reduce){
  .fa-spinner{animation:none;}
  *{transition:none !important;}
}
@media (max-width:680px){
  .fa-topbar{padding:12px 14px;flex-wrap:wrap;}
  .fa-admin-email{display:none;}
  .fa-wrap{padding:20px 14px 48px;}
}
`;

const DAWN_MARK = `
<svg class="fa-mark" width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
  <line x1="3" y1="22" x2="27" y2="22" stroke="#1B1E27" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M8 22a7 7 0 0 1 14 0" fill="#E26D5C"/>
  <line x1="15" y1="6" x2="15" y2="9.5" stroke="#E26D5C" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="6.5" y1="9.5" x2="8.8" y2="11.8" stroke="#E26D5C" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="23.5" y1="9.5" x2="21.2" y2="11.8" stroke="#E26D5C" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

// ─── 注入 ─────────────────────────────────────────────────────
function injectFonts() {
  if (!document.querySelector('link[href*="Fraunces"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }
}
function injectCss() {
  if (document.getElementById('fa-admin-css')) return;
  const s = document.createElement('style');
  s.id = 'fa-admin-css';
  s.textContent = ADMIN_CSS;
  document.head.appendChild(s);
}

let bootEl = null;
function showBoot() {
  if (document.getElementById('fa-boot')) return;
  bootEl = document.createElement('div');
  bootEl.id = 'fa-boot';
  bootEl.className = 'fa-boot';
  bootEl.innerHTML = `<div class="fa-spinner"></div><div class="fa-state-title">驗證權限中…</div>`;
  document.body.appendChild(bootEl);
}
function bootError(msg) {
  if (!bootEl) showBoot();
  bootEl.innerHTML = `<div class="fa-state-title">無法載入</div><div>${escapeHtml(msg)}</div>`;
}
function removeBoot() {
  bootEl?.remove();
  bootEl = null;
}

function injectChrome(activePage) {
  const navHtml = ADMIN_NAV.map(n =>
    `<a class="fa-nav-link ${n.key === activePage ? 'is-active' : ''}" href="${n.href}">${n.label}</a>`
  ).join('');

  const bar = document.createElement('header');
  bar.className = 'fa-topbar';
  bar.innerHTML = `
    <div style="display:flex;align-items:center;">
      <div class="fa-brand">
        ${DAWN_MARK}
        <div class="fa-brand-text">
          <span class="fa-brand-zh">扶桑晨曦</span>
          <span class="fa-brand-en">FuSang Admin</span>
        </div>
      </div>
      <nav class="fa-nav">${navHtml}</nav>
    </div>
    <div class="fa-topbar-right">
      <span class="fa-admin-email" id="fa-admin-email"></span>
      <button class="fa-signout" id="fa-signout" type="button">登出</button>
    </div>`;
  document.body.insertBefore(bar, document.body.firstChild);

  document.getElementById('fa-signout')?.addEventListener('click', () => signOut());
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 立即注入（import 當下就跑，避免內容閃爍 / 無樣式）
injectFonts();
injectCss();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', showBoot);
} else {
  showBoot();
}

// ─── 對外：把關 + 注入 chrome ─────────────────────────────────
// 回傳 true → admin，chrome 已注入，頁面可往下跑
// 回傳 false → 非 admin（已導走）或出錯（遮罩顯示錯誤）
export async function initAdmin(activePage = null) {
  try {
    showBoot();
    await requireAuth();   // 未登入 → components.js 自行踢回 login.html

    const { data: isAdmin, error } = await supabase.rpc('admin_check');
    if (error) throw error;

    if (isAdmin !== true) {
      window.location.replace(NON_ADMIN_REDIRECT);
      return false;
    }

    injectChrome(activePage);

    // 顯示 admin email（盡力而為）
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const elx = document.getElementById('fa-admin-email');
      if (user?.email && elx) elx.textContent = user.email;
    } catch (_) {}

    removeBoot();
    return true;

  } catch (e) {
    bootError(e?.message || String(e));
    return false;
  }
}
