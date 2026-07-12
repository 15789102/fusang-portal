// ============================================================
// FuSang Vision — Consultation Common（單獨問事共用層）
//
// 用法（每個問事頁面）：
//   <div id="site-header"></div>
//   <div id="consult-nav"></div>
//   <div class="fs-page"> ... </div>
//   <div id="site-footer"></div>
//   <script type="module">
//     import { initConsult, ... } from './consultation-common.js';
//     (async () => {
//       const session = await initConsult('form');   // 頁鍵：home|form|list|detail
//       if (!session) return;
//       // ... 頁面專屬邏輯 ...
//     })();
//   </script>
//
// 提供：共用常數 / 語言 / 標籤 / 狀態判定 / 資料查詢 / HTML 片段 /
//       錯誤對應 / 共用 CSS 注入 / 頁內導覽 / initConsult()
//
// 改共用邏輯或樣式 → 只改這個檔，四頁生效
// ============================================================

import { supabase, requireAuth, startCheckout } from './components.js';
export { supabase, requireAuth, startCheckout };

/* ── 常數 ── */
export const PRICE_LABEL = 'US$68';
export const FOLLOWUP_DAYS = 7;
export const AVATAR = 'https://fusang-vision.com/cdn/shop/files/ruei-syuan.jpg?v=1756331083&width=1500';
export const SIGNER = 'RS Chen';

/* ── 語言（沿用元件快取；只切換靜態標籤：中/英）── */
export const LANG = (() => {
  try { const L = window.FSI18N && window.FSI18N.getUILang && window.FSI18N.getUILang(); if (L) return L; } catch (_) {}
  try { const c = localStorage.getItem('fs_ui_lang'); if (c) return c; } catch (_) {}
  return 'zh-TW';
})();
export const isZh = LANG.startsWith('zh');
export const isCN = LANG === 'zh-CN';
// 動態讀取當前 uiLang（支援即時語言切換：切換後由各頁重繪即取到新值）
export function getLang() {
  try { const L = window.FSI18N && window.FSI18N.getUILang && window.FSI18N.getUILang(); if (L) return L; } catch (_) {}
  try { const c = localStorage.getItem('fs_ui_lang'); if (c) return c; } catch (_) {}
  return 'zh-TW';
}
// 三語挑選：繁中／简中／English（每次呼叫都讀當前 uiLang）
export const pick = (tw, cn, en) => { const L = getLang(); return L === 'en' ? en : (L === 'zh-CN' ? cn : tw); };

/* ── 標籤 ── */
export const SUBJECTS = [
  { code: 'career',       zh: '事業與工作', cn: '事业与工作', en: 'Career & Work' },
  { code: 'relationship', zh: '感情與關係', cn: '感情与关系', en: 'Love & Relationships' },
  { code: 'wealth',       zh: '財運與理財', cn: '财运与理财', en: 'Wealth & Finances' },
  { code: 'family',       zh: '人際與家庭', cn: '人际与家庭', en: 'People & Family' },
  { code: 'self',         zh: '自我與方向', cn: '自我与方向', en: 'Self & Direction' },
  { code: 'other',        zh: '其他／綜合', cn: '其他／综合', en: 'Other / General' },
];
export const subjLabel = (code) => {
  const s = SUBJECTS.find((x) => x.code === code);
  return s ? pick(s.zh, s.cn, s.en) : code;
};

export const RATINGS = [
  { code: 'helpful',     zh: '有幫助',   cn: '有帮助',   en: 'Helpful' },
  { code: 'somewhat',    zh: '還好',     cn: '还好',     en: 'Somewhat' },
  { code: 'not_helpful', zh: '沒有幫助', cn: '没有帮助', en: 'Not really' },
];
export const ratingLabel = (code) => {
  const r = RATINGS.find((x) => x.code === code);
  return r ? pick(r.zh, r.cn, r.en) : code;
};

export function statusLabelMap() {
  return {
    pending:  pick('待付款', '待付款', 'Awaiting payment'),
    paid:     pick('已付款・等待回覆', '已付款・等待回复', 'Paid · awaiting reply'),
    answered: pick('已回覆', '已回复', 'Answered'),
    followup: pick('追問中・等待回覆', '追问中・等待回复', 'Follow-up · awaiting reply'),
    closed:   pick('已結案', '已结案', 'Closed'),
  };
}
// Proxy：讓既有的 STATUS_LABEL[status] 取用維持動態(切換語言即時反映)
export const STATUS_LABEL = new Proxy({}, { get: (_, k) => statusLabelMap()[k] });

export const fmtDate = (iso) => {
  if (!iso) return '';
  try { const L = getLang(); return new Date(iso).toLocaleDateString(L === 'en' ? 'en-US' : (L === 'zh-CN' ? 'zh-CN' : 'zh-TW'), { year:'numeric', month:'short', day:'numeric' }); }
  catch (_) { return iso; }
};

export const refCode = (id) => String(id || '').slice(0, 8);

/* ── 狀態判定 ── */
export const isActive = (t) => {
  if (t.status === 'paid' || t.status === 'followup') return true;
  if (t.status === 'answered' && t.answered_at) {
    return new Date(t.answered_at).getTime() + FOLLOWUP_DAYS * 864e5 > Date.now();
  }
  return false;
};
export const isPendingDraft = (t) => t.status === 'pending' && t.payment_status === 'pending';
export const inFollowupWindow = (t) =>
  t.status === 'answered' && t.answered_at &&
  new Date(t.answered_at).getTime() + FOLLOWUP_DAYS * 864e5 > Date.now();
export const needsFeedback = (t) => t.status === 'closed' && !t.rating && !t.closed_by_admin;
export const isAdminClosed = (t) => t.status === 'closed' && t.closed_by_admin === true;
// 顯示用狀態文字：admin 關閉 → 已關閉；其餘照 STATUS_LABEL
export const statusText = (t) => isAdminClosed(t) ? pick('已關閉', '已关闭', 'Closed') : (STATUS_LABEL[t.status] || t.status);

export const findActive = (tickets) => tickets.find(isActive) || null;
export const findPendingDraft = (tickets) => tickets.find(isPendingDraft) || null;
export const findFeedbackTarget = (tickets) => tickets.find(needsFeedback) || null;

/* ── 資料查詢 ── */
export async function getMyChartSession() {
  try {
    const { data } = await supabase.rpc('get_my_chart_session');
    return data || null;
  } catch (_) { return null; }
}
export async function getMyTickets() {
  try {
    const { data } = await supabase
      .from('consultation_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  } catch (_) { return []; }
}
export async function getTicketById(id) {
  try {
    const { data } = await supabase
      .from('consultation_tickets')
      .select('*')
      .eq('id', id)
      .maybeSingle();      // RLS 保證只讀得到本人的；非本人回 null
    return data || null;
  } catch (_) { return null; }
}

/* ── HTML 片段 ── */
export function signatureHtml() {
  return `<div class="sig">` +
    `<img src="${AVATAR}" alt="${esc(SIGNER)}" />` +
    `<div><div class="sig-name">${esc(SIGNER)}</div><div class="sig-org">FuSang Vision</div></div>` +
  `</div>`;
}

export function disclaimerHtml() {
  const L = getLang();
  if (L === 'zh-CN') {
    return `<div class="disclaim"><div class="disclaim-h">提交前请确认</div><ul>` +
      `<li>这是由真人解盘的个人化紫微斗数咨询。提供的背景越完整，回复越精准。</li>` +
      `<li>回复将以你设定的报告语言（繁体中文／简体中文／English）为主，与你的报告内容一致。</li>` +
      `<li><strong>同一时间仅能进行一则咨询。</strong>须待目前咨询结案后，才能再提交新的问题。</li>` +
      `<li>付款后 <strong>7 天内</strong>你会收到书面回复。回复后可于 <strong>7 天内追问一次</strong>；逾时咨询即结案。</li>` +
      `<li>本服务仅提供紫微斗数命理解读，<strong>不</strong>提供医疗、法律、财务或投资意见。</li>` +
      `<li><strong>数字服务，提交后恕不退款。</strong>每则咨询皆为你个别撰写，付款送出后不予退费。</li>` +
      `</ul></div>`;
  }
  if (L.startsWith('zh')) {
    return `<div class="disclaim"><div class="disclaim-h">提交前請確認</div><ul>` +
      `<li>這是由真人解盤的個人化紫微斗數諮詢。提供的背景越完整，回覆越精準。</li>` +
      `<li>回覆將以你設定的報告語言（繁體中文／简体中文／English）為主，與你的報告內容一致。</li>` +
      `<li><strong>同一時間僅能進行一則諮詢。</strong>須待目前諮詢結案後，才能再提交新的問題。</li>` +
      `<li>付款後 <strong>7 天內</strong>你會收到書面回覆。回覆後可於 <strong>7 天內追問一次</strong>；逾時諮詢即結案。</li>` +
      `<li>本服務僅提供紫微斗數命理解讀，<strong>不</strong>提供醫療、法律、財務或投資意見。</li>` +
      `<li><strong>數位服務，提交後恕不退款。</strong>每則諮詢皆為你個別撰寫，付款送出後不予退費。</li>` +
      `</ul></div>`;
  }
  return `<div class="disclaim"><div class="disclaim-h">Before you submit</div><ul>` +
    `<li>This is a personal Zi Wei Dou Shu consultation, answered by a human. The more context you give, the more precise the reading.</li>` +
    `<li>Your reply will be written in your registered report language (繁體中文 / 简体中文 / English), matching your report.</li>` +
    `<li><strong>One open consultation at a time.</strong> You can start a new one only after your current consultation is resolved.</li>` +
    `<li>You'll receive a written reply within <strong>7 days</strong> of payment. After the reply, you may ask <strong>one follow-up within 7 days</strong>; after that the consultation closes.</li>` +
    `<li>This service provides Zi Wei Dou Shu interpretation only. It is <strong>not</strong> medical, legal, financial, or investment advice.</li>` +
    `<li><strong>Digital service — all sales are final.</strong> Each consultation is prepared individually for you, so payment is non-refundable once submitted.</li>` +
    `</ul></div>`;
}

/* ── 錯誤對應 ── */
export function mapCreateErr(m) {
  if (m.includes('ticket_in_progress')) return pick('你已有一則進行中的諮詢，請先完成後再提交新問題。', '你已有一则进行中的咨询，请先完成后再提交新问题。', 'You already have an open consultation. Finish it first.');
  if (m.includes('chart_not_found'))   return pick('找不到你的命盤，請先回儀表板生成。', '找不到你的命盘，请先回仪表板生成。', 'Your chart wasn\'t found. Please generate it from the dashboard first.');
  if (m.includes('invalid_subject'))   return pick('請選擇一個主題。', '请选择一个主题。', 'Please choose a topic.');
  if (m.includes('empty_content'))     return pick('請填寫你的問題內容。', '请填写你的问题内容。', 'Please describe your question.');
  if (m.includes('not_authenticated')) return pick('登入狀態已失效，請重新登入。', '登入状态已失效，请重新登入。', 'Your session expired. Please sign in again.');
  return pick('提交時發生問題，請稍後再試。', '提交时发生问题，请稍后再试。', 'Something went wrong. Please try again.');
}
export function mapCheckoutErr(code) {
  if (code === 'ticket_not_payable') return pick('這筆諮詢已付款或狀態已變更。', '这笔咨询已付款或状态已变更。', 'This consultation is already paid or changed.');
  if (code === 'ticket_not_found')   return pick('找不到對應的諮詢，請重新提交。', '找不到对应的咨询，请重新提交。', 'Consultation not found. Please submit again.');
  if (code === 'missing_ticket_id')  return pick('提交資料不完整，請重試。', '提交资料不完整，请重试。', 'Incomplete request. Please try again.');
  if (code === 'not_authenticated')  return pick('登入狀態已失效，請重新登入。', '登入状态已失效，请重新登入。', 'Your session expired. Please sign in again.');
  return pick('前往付款時發生問題，請稍後再試。', '前往付款时发生问题，请稍后再试。', 'Couldn\'t reach checkout. Please try again.');
}
export function mapFollowupErr(m) {
  if (m.includes('followup_exists'))        return pick('每則諮詢僅能追問一次。', '每则咨询仅能追问一次。', 'Only one follow-up per consultation.');
  if (m.includes('followup_window_closed')) return pick('追問期限已過，諮詢已結案。', '追问期限已过，咨询已结案。', 'The follow-up window has closed.');
  if (m.includes('not_answerable'))         return pick('目前無法追問。', '目前无法追问。', 'Follow-up isn\'t available right now.');
  if (m.includes('ticket_not_found'))       return pick('找不到這則諮詢。', '找不到这则咨询。', 'Consultation not found.');
  if (m.includes('empty_content'))          return pick('請填寫追問內容。', '请填写追问内容。', 'Please write your follow-up.');
  return pick('送出追問時發生問題，請稍後再試。', '送出追问时发生问题，请稍后再试。', 'Something went wrong. Please try again.');
}
export function mapCloseErr(m) {
  if (m.includes('not_closable'))     return pick('目前無法結案。', '目前无法结案。', 'This consultation can\'t be closed right now.');
  if (m.includes('ticket_not_found')) return pick('找不到這則諮詢。', '找不到这则咨询。', 'Consultation not found.');
  if (m.includes('not_authenticated')) return pick('登入狀態已失效，請重新登入。', '登入状态已失效，请重新登入。', 'Your session expired. Please sign in again.');
  return pick('結案時發生問題，請稍後再試。', '结案时发生问题，请稍后再试。', 'Something went wrong. Please try again.');
}
export function mapFeedbackErr(m) {
  if (m.includes('feedback_exists'))   return pick('這則諮詢已回饋過。', '这则咨询已反馈过。', 'You\'ve already given feedback for this consultation.');
  if (m.includes('not_feedbackable'))  return pick('目前無法回饋。', '目前无法反馈。', 'Feedback isn\'t available for this consultation.');
  if (m.includes('invalid_rating'))    return pick('請選擇一個選項。', '请选择一个选项。', 'Please choose an option.');
  if (m.includes('ticket_not_found'))  return pick('找不到這則諮詢。', '找不到这则咨询。', 'Consultation not found.');
  return pick('送出回饋時發生問題，請稍後再試。', '送出反馈时发生问题，请稍后再试。', 'Something went wrong. Please try again.');
}

/* ── DOM utils ── */
export function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export function showMsg(node, kind, text) { node.className = 'msg show ' + kind; node.innerHTML = text; }
export function reloadSoon(ms = 2200) { setTimeout(() => window.location.reload(), ms); return ''; }

/* ── 頁內導覽 ── */
// activePage: 'home' | 'form' | 'list' | 'detail'
function navConfig() {
  return {
    form:   { label: pick('提交問事', '提交问事', 'New consultation'),   back: 'consultation.html',       backLabel: pick('問事首頁', '问事首页', 'Consultation') },
    list:   { label: pick('我的問事紀錄', '我的问事纪录', 'My consultations'), back: 'consultation.html',       backLabel: pick('問事首頁', '问事首页', 'Consultation') },
    detail: { label: pick('諮詢細節', '咨询细节', 'Consultation'),        back: 'consultation-list.html',  backLabel: pick('我的問事紀錄', '我的问事纪录', 'My consultations') },
  };
}

let _consultActivePage = null;
function injectConsultNav(activePage) {
  _consultActivePage = activePage;
  const host = document.getElementById('consult-nav');
  const NAV = navConfig();
  if (!host || activePage === 'home' || !NAV[activePage]) return;
  const n = NAV[activePage];
  host.innerHTML =
    `<div class="consult-nav">` +
      `<a class="consult-back" data-href="${n.back}">← ${esc(n.backLabel)}</a>` +
      `<span class="sep">›</span>` +
      `<span class="cur">${esc(n.label)}</span>` +
    `</div>`;
  const back = host.querySelector('.consult-back');
  if (back) back.addEventListener('click', () => { window.location.href = back.getAttribute('data-href'); });
}

/* ── 共用 CSS ── */
const CONSULT_CSS = `
  /* 冷藍改版：consultation 內容範圍覆寫 shared token（header/footer 在此範圍外，維持全站色）*/
  .cons-wrap, .consult-nav, .cons-loading {
    --ink-darkest: #001b3c; --ink-dark: #16323f; --ink-mid: #41484d; --ink-light: #8a97a5; --ink-faint: #b6c2cd;
    --accent-deep: #1d4e63; --accent-soft: #296283; --accent-pale: #c7e7ff;
    --rule: #dbe2ea; --rule-soft-2: #e6ecf2; --bg-primary: #f8f9fa; --bg-soft: #eef3f9; --bg-soft-2: #e9eff7; --bg-card: #ffffff;
    --gold: #b8945c; --gold-soft: #c9ab7d;
  }

  .cons-wrap { max-width: 760px; margin: 0 auto; padding: 40px 32px 80px; }
  @media (max-width: 720px) { .cons-wrap { padding: 28px 22px 64px; } }

  /* ── 頁內導覽 ── */
  .consult-nav {
    max-width: 760px; margin: 0 auto; padding: 24px 32px 0;
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-sans); font-size: 12.5px;
  }
  @media (max-width: 720px) { .consult-nav { padding: 18px 22px 0; } }
  .consult-nav a { color: var(--ink-light); border-bottom: 1px solid transparent; cursor: pointer; transition: color 0.2s; }
  .consult-nav a:hover { color: var(--accent-deep); border-color: var(--accent-pale); }
  .consult-nav .sep { color: var(--ink-faint); }
  .consult-nav .cur { color: var(--ink-mid); }

  /* ── Hero ── */
  .cons-hero { margin-bottom: 40px; opacity: 0; animation: fsRise 0.7s cubic-bezier(0.2,0.7,0.2,1) forwards; }
  .cons-eyebrow { font-family: var(--font-sans); font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold); margin-bottom: 14px; }
  .cons-title { font-family: var(--font-serif-zh); font-weight: 500; font-size: clamp(28px, 5vw, 40px); line-height: 1.25; color: var(--ink-darkest); letter-spacing: 0.01em; }
  .cons-sub { margin-top: 12px; font-family: var(--font-serif-en); font-style: italic; font-size: 16px; color: var(--ink-light); }
  .cons-rule { margin-top: 24px; width: 64px; height: 1px; background: var(--gold); opacity: 0.6; }

  /* ── Card ── */
  .cons-card { position: relative; background: var(--bg-card); border: 1px solid var(--rule); border-radius: 4px; padding: 30px 30px 28px; margin-bottom: 22px; overflow: hidden; opacity: 0; animation: fsRise 0.7s cubic-bezier(0.2,0.7,0.2,1) forwards; }
  .cons-card::before { content: ''; position: absolute; top: 0; right: 0; width: 38px; height: 38px; border-top: 1px solid var(--gold); border-right: 1px solid var(--gold); opacity: 0.4; border-top-right-radius: 4px; }
  .cons-card.soft { background: var(--bg-soft-2); }
  .card-kicker { font-family: var(--font-sans); font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--ink-light); margin-bottom: 14px; }
  .card-h { font-family: var(--font-serif-zh); font-weight: 500; font-size: 22px; color: var(--ink-darkest); letter-spacing: 0.02em; margin-bottom: 16px; }

  /* ── Subject picker ── */
  .subj-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
  @media (max-width: 480px) { .subj-grid { grid-template-columns: 1fr; } }
  .subj-opt { font-family: var(--font-serif-zh); font-size: 15px; color: var(--ink-dark); background: var(--bg-primary); border: 1px solid var(--rule); border-radius: 3px; padding: 14px 16px; cursor: pointer; transition: border-color 0.2s, background 0.2s; text-align: left; }
  .subj-opt:hover { border-color: var(--gold-soft); }
  .subj-opt.sel { border-color: var(--accent-soft); background: var(--accent-pale); color: var(--ink-darkest); }
  .subj-opt .en { display: block; font-family: var(--font-serif-en); font-style: italic; font-size: 12.5px; color: var(--ink-light); margin-top: 3px; }

  /* ── Textarea ── */
  .field-label { font-family: var(--font-serif-zh); font-size: 15px; color: var(--ink-dark); margin-bottom: 8px; }
  .field-hint { font-family: var(--font-sans); font-size: 12.5px; line-height: 1.7; color: var(--ink-light); margin-bottom: 12px; }
  textarea.cons-input { width: 100%; min-height: 150px; font-family: var(--font-serif-zh); font-size: 15px; line-height: 1.8; color: var(--ink-darkest); background: var(--bg-primary); border: 1px solid var(--rule); border-radius: 3px; padding: 14px 16px; resize: vertical; transition: border-color 0.2s; }
  textarea.cons-input:focus { outline: none; border-color: var(--accent-soft); }
  .char-count { text-align: right; font-family: var(--font-sans); font-size: 11px; color: var(--ink-faint); margin-top: 6px; }

  /* ── Disclaimer ── */
  .disclaim { background: var(--bg-soft-2); border: 1px solid var(--rule-soft-2); border-radius: 3px; padding: 18px 20px; margin: 24px 0 20px; }
  .disclaim-h { font-family: var(--font-sans); font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }
  .disclaim ul { list-style: none; }
  .disclaim li { position: relative; font-family: var(--font-serif-zh); font-size: 13.5px; line-height: 1.75; color: var(--ink-mid); padding-left: 16px; margin-bottom: 9px; }
  .disclaim li::before { content: '·'; position: absolute; left: 4px; color: var(--gold); }
  .disclaim li strong { color: var(--ink-dark); font-weight: 600; }

  /* ── Consent ── */
  .consent { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 22px; cursor: pointer; }
  .consent input { margin-top: 3px; width: 16px; height: 16px; accent-color: var(--accent-deep); cursor: pointer; }
  .consent span { font-family: var(--font-serif-zh); font-size: 13.5px; line-height: 1.6; color: var(--ink-dark); }

  /* ── Buttons ── */
  .cons-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; font-family: var(--font-serif-zh); font-size: 16px; letter-spacing: 0.04em; color: var(--bg-card); background: var(--accent-deep); padding: 15px 24px; border-radius: 3px; cursor: pointer; transition: background 0.25s, transform 0.25s, opacity 0.25s; border: none; }
  .cons-btn:hover:not([disabled]) { background: #143a4a; transform: translateY(-1px); }
  .cons-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
  .cons-btn.ghost { color: var(--accent-deep); background: var(--bg-card); border: 1px solid var(--gold-soft); }
  .cons-btn.ghost:hover:not([disabled]) { background: var(--accent-pale); }

  /* ── Status / answer ── */
  .status-pill { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--accent-pale); color: var(--accent-deep); background: var(--bg-primary); }
  .status-pill .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-soft); }
  .status-pill.wait .dot { animation: fsPulse 1.6s ease-in-out infinite; }
  .status-pill.done .dot { background: var(--t-lu); }

  .qa-block { margin-top: 22px; }
  .qa-label { font-family: var(--font-sans); font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-light); margin-bottom: 8px; }
  .qa-text { font-family: var(--font-serif-zh); font-size: 15px; line-height: 1.85; color: var(--ink-darkest); white-space: pre-wrap; }
  .qa-meta { font-family: var(--font-sans); font-size: 11.5px; color: var(--ink-light); margin-top: 6px; }
  .qa-divider { height: 1px; background: var(--rule); margin: 22px 0; }
  .answer-box { background: var(--t-lu-bg); border: 1px solid #cfe0d5; border-radius: 3px; padding: 18px 20px; }
  .followup-note { font-family: var(--font-sans); font-size: 12.5px; line-height: 1.7; color: var(--ink-mid); margin: 16px 0 12px; }
  .followup-note strong { color: var(--ink-dark); }

  /* ── History ── */
  .hist-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 18px; border: 1px solid var(--rule); border-radius: 4px; margin-bottom: 10px; cursor: pointer; background: var(--bg-card); transition: border-color 0.2s, transform 0.2s; }
  .hist-item:hover { border-color: var(--gold-soft); transform: translateY(-1px); }
  .hist-subj { font-family: var(--font-serif-zh); font-size: 15px; color: var(--ink-dark); }
  .hist-date { font-family: var(--font-sans); font-size: 11.5px; color: var(--ink-light); }

  /* ── Banner ── */
  .banner { background: var(--bg-soft-2); border: 1px solid var(--gold-soft); border-radius: 3px; padding: 14px 18px; margin-bottom: 22px; font-family: var(--font-serif-zh); font-size: 14px; line-height: 1.6; color: var(--ink-dark); }

  /* ── Inline message ── */
  .msg { font-family: var(--font-sans); font-size: 13px; line-height: 1.6; margin-top: 14px; padding: 12px 14px; border-radius: 3px; display: none; }
  .msg.show { display: block; }
  .msg.err { background: var(--t-ji-bg); color: var(--t-ji); border: 1px solid #e4ccd1; }
  .msg.ok  { background: var(--t-lu-bg); color: var(--t-lu); border: 1px solid #cfe0d5; }

  .form-gate { font-family: var(--font-sans); font-size: 12px; line-height: 1.6; color: var(--ink-light); text-align: center; margin-top: 10px; min-height: 18px; transition: opacity 0.2s; }
  .cons-loading { text-align: center; padding: 90px 20px; font-family: var(--font-serif-zh); color: var(--ink-light); font-size: 15px; letter-spacing: 0.08em; }
  .empty-note { font-family: var(--font-serif-zh); font-size: 15px; line-height: 1.9; color: var(--ink-mid); }
  .link-inline { color: var(--accent-soft); border-bottom: 1px solid var(--accent-pale); cursor: pointer; }
  .link-inline:hover { color: var(--accent-deep); }

  /* ── 署名 ── */
  .sig { display: flex; align-items: center; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--rule); }
  .sig img { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; object-position: center top; display: block; flex: 0 0 auto; }
  .sig-name { font-family: var(--font-serif-zh); font-size: 15px; color: var(--ink-darkest); font-weight: 500; }
  .sig-org { font-family: var(--font-sans); font-size: 11.5px; color: var(--ink-light); letter-spacing: 0.04em; }

  /* ── 結案 / 確認 ── */
  .close-row { margin-top: 18px; }
  .close-link { font-family: var(--font-sans); font-size: 12.5px; color: var(--ink-light); cursor: pointer; border-bottom: 1px solid var(--rule); padding-bottom: 1px; }
  .close-link:hover { color: var(--ink-mid); }
  .confirm-box { margin-top: 14px; background: var(--bg-soft-2); border: 1px solid var(--gold-soft); border-radius: 3px; padding: 16px 18px; }
  .confirm-text { font-family: var(--font-serif-zh); font-size: 14px; line-height: 1.7; color: var(--ink-dark); margin-bottom: 14px; }
  .confirm-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .btn-sm { font-family: var(--font-serif-zh); font-size: 14px; padding: 9px 18px; border-radius: 3px; cursor: pointer; transition: background 0.2s, transform 0.2s; border: none; }
  .btn-sm.confirm { color: var(--bg-card); background: var(--accent-deep); }
  .btn-sm.confirm:hover { background: #143a4a; }
  .btn-sm.cancel { color: var(--ink-mid); background: var(--bg-card); border: 1px solid var(--rule); }
  .btn-sm.cancel:hover { border-color: var(--ink-light); }

  /* ── 回饋 ── */
  .fb-q { font-family: var(--font-serif-zh); font-size: 17px; color: var(--ink-darkest); line-height: 1.6; margin-bottom: 18px; }
  .fb-opts { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .fb-opt { flex: 1 1 0; min-width: 92px; font-family: var(--font-serif-zh); font-size: 15px; color: var(--ink-dark); background: var(--bg-primary); border: 1px solid var(--rule); border-radius: 3px; padding: 14px 10px; cursor: pointer; text-align: center; transition: border-color 0.2s, background 0.2s; }
  .fb-opt:hover { border-color: var(--gold-soft); }
  .fb-opt.sel { border-color: var(--accent-soft); background: var(--accent-pale); color: var(--ink-darkest); }
  .fb-consent { display: flex; align-items: flex-start; gap: 10px; margin: 16px 0 20px; cursor: pointer; }
  .fb-consent input { margin-top: 3px; width: 16px; height: 16px; accent-color: var(--accent-deep); cursor: pointer; }
  .fb-consent span { font-family: var(--font-sans); font-size: 12.5px; line-height: 1.6; color: var(--ink-mid); }
  .fb-thanks { font-family: var(--font-serif-zh); font-size: 15px; line-height: 1.8; color: var(--ink-mid); }

  @keyframes fsRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fsPulse { 0%,100% { opacity: 0.4; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.1); } }
  @media (prefers-reduced-motion: reduce) {
    .cons-hero, .cons-card { animation: none; opacity: 1; }
    .status-pill .dot { animation: none; }
  }
`;

function injectConsultCss() {
  if (document.getElementById('fs-consult-css')) return;
  const s = document.createElement('style');
  s.id = 'fs-consult-css';
  s.textContent = CONSULT_CSS;
  document.head.appendChild(s);
}

/* ── init ── */
// 回傳 session（未登入 → components.requireAuth 已導走，回 null）
export async function initConsult(activePage = null) {
  injectConsultCss();
  const session = await requireAuth();
  if (!session) return null;
  injectConsultNav(activePage);
  window.addEventListener('i18n:changed', () => injectConsultNav(_consultActivePage));
  return session;
}
