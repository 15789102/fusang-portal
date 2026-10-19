// ============================================================
// y27-md.js：2027 年報全文的 Markdown 排版（PT-007b，2026-10-19）
//   用法：import { renderReport } from './y27-md.js';  await renderReport(el, text);
//   · 支援：標題、粗體／斜體、清單、表格、引言、分隔線、連結、換行。
//   · 安全：marked 轉成 HTML 後一律經 DOMPurify 白名單過濾（不允許 script、style、
//     iframe、事件屬性等）；連結一律開新分頁並加 rel="noopener noreferrer"。
//   · 表格包一層 .y27-md-table 讓手機可以左右捲動，不撐破版面。
//   · 函式庫載入失敗時退回純文字顯示（textContent），不會空白。
//   annual-2027.html（客戶頁）與 admin-annual-requests.html（後台預覽）共用。
// ============================================================

const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';
const PURIFY_URL = 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.es.mjs';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'del', 's',
  'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];
const ALLOWED_ATTR = ['href', 'title', 'align', 'start'];

let libs = null;
async function loadLibs() {
  if (!libs) {
    libs = Promise.all([import(MARKED_URL), import(PURIFY_URL)]).then(([m, p]) => {
      const marked = m.marked || m.default;
      const DOMPurify = p.default || p;
      marked.setOptions({ gfm: true, breaks: true });
      DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.tagName === 'A') {
          const href = node.getAttribute('href') || '';
          if (!/^(https?:|mailto:)/i.test(href)) { node.removeAttribute('href'); return; }
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      });
      return { marked, DOMPurify };
    });
  }
  return libs;
}

export async function renderReport(el, text) {
  const src = String(text ?? '');
  try {
    const { marked, DOMPurify } = await loadLibs();
    const html = DOMPurify.sanitize(marked.parse(src), {
      ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false,
    });
    el.classList.add('y27-md');
    el.classList.remove('y27-md-plain');
    el.innerHTML = html;
    el.querySelectorAll('table').forEach((t) => {
      const wrap = document.createElement('div');
      wrap.className = 'y27-md-table';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
    return true;
  } catch (e) {
    console.error('[y27-md] Markdown 函式庫載入失敗，改以純文字顯示：', e);
    el.classList.remove('y27-md');
    el.classList.add('y27-md-plain');
    el.textContent = src;
    return false;
  }
}

// 共用排版樣式（兩個頁面各自注入一次）
export const MD_CSS = `
.y27-md-plain { white-space: pre-wrap; overflow-wrap: anywhere; }
.y27-md { white-space: normal; overflow-wrap: anywhere; }
.y27-md > :first-child { margin-top: 0; }
.y27-md h1 { margin: 0 0 24px; font-size: 26px; line-height: 38px; font-weight: 600; }
.y27-md h2 { margin: 40px 0 14px; padding-top: 4px; font-size: 21px; line-height: 32px; font-weight: 600; }
.y27-md h3 { margin: 28px 0 10px; font-size: 18px; line-height: 28px; font-weight: 600; }
.y27-md h4, .y27-md h5, .y27-md h6 { margin: 22px 0 8px; font-size: 16px; line-height: 26px; font-weight: 600; }
.y27-md p { margin: 0 0 16px; }
.y27-md strong, .y27-md b { font-weight: 600; }
.y27-md ul, .y27-md ol { margin: 0 0 16px; padding-left: 1.5em; }
.y27-md li { margin: 0 0 6px; }
.y27-md li > p { margin: 0 0 6px; }
.y27-md hr { margin: 36px 0; border: 0; border-top: 1px solid #dedede; }
.y27-md blockquote { margin: 0 0 16px; padding: 12px 16px; border-left: 3px solid #a1bfee; background: #fafdff; color: #404040; }
.y27-md blockquote > :last-child { margin-bottom: 0; }
.y27-md a { color: #3b83f6; text-decoration: none; border-bottom: 1px solid #a1bfee; }
.y27-md code { padding: 1px 5px; background: #f3f4f6; font-size: .92em; }
.y27-md pre { margin: 0 0 16px; padding: 12px 14px; background: #f6f7f9; overflow-x: auto; white-space: pre; }
.y27-md pre code { padding: 0; background: none; }
.y27-md-table { margin: 0 0 20px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.y27-md table { width: 100%; min-width: 480px; border-collapse: collapse; font-size: .94em; line-height: 1.7; }
.y27-md th, .y27-md td { padding: 10px 12px; border: 1px solid #dedede; text-align: left; vertical-align: top; }
.y27-md th { background: #eff5ff; font-weight: 600; }
.y27-md th:empty { background: #eff5ff; }
@media (max-width: 799px) {
  .y27-md h1 { font-size: 22px; line-height: 32px; }
  .y27-md h2 { font-size: 19px; line-height: 29px; margin-top: 32px; }
  .y27-md h3 { font-size: 17px; line-height: 27px; }
}
@media print {
  .y27-md-table { overflow: visible; }
  .y27-md table { min-width: 0; }
  .y27-md h2, .y27-md h3 { break-after: avoid; }
  .y27-md tr, .y27-md blockquote { break-inside: avoid; }
}
`;

export function injectMdCss() {
  if (document.getElementById('y27-md-css')) return;
  const s = document.createElement('style');
  s.id = 'y27-md-css';
  s.textContent = MD_CSS;
  document.head.appendChild(s);
}
