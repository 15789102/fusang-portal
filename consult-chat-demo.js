/* ════════════════════════════════════════════════════════════════
   consult-chat-demo.js — 單獨問事「範例對話」示範模組（PT-008）

   獨立模組，方便日後搬到官網：
   - 不 import 其他檔案、不讀 i18n、不讀 Supabase；所有文字由呼叫端傳入。
   - 文字一律以 textContent 寫入。
   - 搭配 consult-chat-demo.css（class 皆為 cvd- 前綴）。

   用法：
     import { mountChatDemo } from './consult-chat-demo.js';
     const demo = mountChatDemo(el, {
       avatar: 'assets/rs-fusang.webp',
       avatarFocus: { x: '48%', y: '28%', zoom: 2 },   // 選填：頭像裁切焦點
       name: 'R.S. Chen',
       sub: '單獨問事',
       badge: '範例對話',          // 同時作為對話框 aria-label
       replay: '重播',
       you: '你',                  // 客戶訊息前的視覺隱藏說話者名稱
       day: (n) => `第 ${n} 天`,   // 或含 {n} 的字串
       messages: [{ who: 'client' | 'advisor', day: 1, text: '…' }, …],
       closed: '客戶主動結案',
       closedNote: '…',
       sampleNote: '…',
       autoplay: true,             // 選填，預設 true：捲入約 40% 時播一次
       onPlay: () => {},           // 選填：開始播放（自動或重播）時呼叫
     });
     demo.showAll(); demo.replay(); demo.destroy();
   ════════════════════════════════════════════════════════════════ */

const TYPING_MS = 1200;   // 打字點持續時間
const GAP_MS = 1300;      // 每則之間的間隔
const FIRST_MS = 400;     // 開始播放到第一則的延遲

function node(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

function avatarNode(cls, src) {
  const wrap = node('span', cls);
  wrap.setAttribute('aria-hidden', 'true');
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.decoding = 'async';
  img.loading = 'lazy';
  wrap.appendChild(img);
  return wrap;
}

function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
}

export function mountChatDemo(root, data) {
  const d = data || {};
  const msgs = Array.isArray(d.messages) ? d.messages : [];
  const dayText = (n) => (typeof d.day === 'function' ? d.day(n) : String(d.day || '{n}').replace('{n}', n));

  // ── 建立 DOM ──
  const wrap = node('div', 'cvd');
  if (d.avatarFocus) {
    if (d.avatarFocus.x) wrap.style.setProperty('--cvd-av-x', d.avatarFocus.x);
    if (d.avatarFocus.y) wrap.style.setProperty('--cvd-av-y', d.avatarFocus.y);
    if (d.avatarFocus.zoom) wrap.style.setProperty('--cvd-av-zoom', String(d.avatarFocus.zoom));
  }

  const box = node('div', 'cvd-box');
  box.setAttribute('role', 'group');
  if (d.badge) box.setAttribute('aria-label', d.badge);

  // 頂部
  const head = node('div', 'cvd-head');
  head.appendChild(avatarNode('cvd-av', d.avatar || ''));
  const who = node('div', 'cvd-who');
  who.appendChild(node('span', 'cvd-name', d.name || ''));
  if (d.sub) who.appendChild(node('span', 'cvd-sub', d.sub));
  head.appendChild(who);
  const tools = node('div', 'cvd-tools');
  if (d.badge) tools.appendChild(node('span', 'cvd-badge', d.badge));
  const replayBtn = node('button', 'cvd-replay');
  replayBtn.type = 'button';
  const ns = 'http://www.w3.org/2000/svg';
  const ic = document.createElementNS(ns, 'svg');
  ic.setAttribute('viewBox', '0 0 24 24');
  ic.setAttribute('aria-hidden', 'true');
  const p1 = document.createElementNS(ns, 'path');
  p1.setAttribute('d', 'M3 12a9 9 0 1 0 3-6.7');
  const p2 = document.createElementNS(ns, 'path');
  p2.setAttribute('d', 'M3 4v5h5');
  ic.appendChild(p1); ic.appendChild(p2);
  replayBtn.appendChild(ic);
  replayBtn.appendChild(node('span', null, d.replay || 'Replay'));
  tools.appendChild(replayBtn);
  head.appendChild(tools);
  box.appendChild(head);

  // 訊息
  const log = node('div', 'cvd-log');
  const steps = [];   // 依播放順序：{ kind:'day'|'msg'|'closed', el, who }
  let lastDay = null;
  msgs.forEach((m) => {
    if (m.day !== undefined && m.day !== lastDay) {
      const dayEl = node('div', 'cvd-day', dayText(m.day));
      log.appendChild(dayEl);
      steps.push({ kind: 'day', el: dayEl });
      lastDay = m.day;
    }
    const isAdv = m.who === 'advisor';
    const row = node('div', 'cvd-row ' + (isAdv ? 'cvd-row--advisor' : 'cvd-row--client'));
    if (isAdv) row.appendChild(avatarNode('cvd-av-sm', d.avatar || ''));
    const bubble = node('div', 'cvd-bubble');
    bubble.appendChild(node('span', 'cvd-sr', (isAdv ? (d.name || '') : (d.you || '')) + ': '));
    bubble.appendChild(node('span', 'cvd-text', m.text || ''));
    row.appendChild(bubble);
    if (isAdv) {
      const dots = node('span', 'cvd-dots');
      dots.setAttribute('aria-hidden', 'true');
      dots.appendChild(node('i')); dots.appendChild(node('i')); dots.appendChild(node('i'));
      row.appendChild(dots);
    }
    log.appendChild(row);
    steps.push({ kind: 'msg', el: row, who: isAdv ? 'advisor' : 'client' });
  });

  if (d.closed || d.closedNote) {
    const closed = node('div', 'cvd-closed');
    const line = node('div', 'cvd-closed-line');
    if (d.closed) line.appendChild(node('span', 'cvd-closed-tag', d.closed));
    closed.appendChild(line);
    if (d.closedNote) closed.appendChild(node('p', 'cvd-closed-note', d.closedNote));
    log.appendChild(closed);
    steps.push({ kind: 'closed', el: closed });
  }
  box.appendChild(log);
  wrap.appendChild(box);
  if (d.sampleNote) wrap.appendChild(node('p', 'cvd-note', d.sampleNote));
  root.appendChild(wrap);

  // ── 播放控制 ──
  let timers = [];
  let observer = null;
  let played = false;
  let destroyed = false;

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function setState(el, state) {
    el.classList.remove('cvd-wait', 'cvd-typing', 'cvd-in');
    if (state) el.classList.add(state);
  }

  function showAll() {
    if (destroyed) return;
    clearTimers();
    steps.forEach((s) => setState(s.el, null));
    played = true;
    if (observer) { observer.disconnect(); observer = null; }
  }

  function hideAll() { steps.forEach((s) => setState(s.el, 'cvd-wait')); }

  function play() {
    if (destroyed) return;
    clearTimers();
    played = true;
    if (typeof d.onPlay === 'function') { try { d.onPlay(); } catch (_) {} }
    if (observer) { observer.disconnect(); observer = null; }
    if (reducedMotion()) { showAll(); return; }
    hideAll();
    let t = FIRST_MS;
    let pendingDay = null;
    steps.forEach((s) => {
      if (s.kind === 'day') { pendingDay = s; return; }
      const dayStep = pendingDay;
      pendingDay = null;
      if (s.kind === 'msg' && s.who === 'advisor') {
        at(t, () => {
          if (dayStep) setState(dayStep.el, 'cvd-in');
          setState(s.el, 'cvd-typing');
        });
        t += TYPING_MS;
        at(t, () => setState(s.el, 'cvd-in'));
      } else {
        at(t, () => {
          if (dayStep) setState(dayStep.el, 'cvd-in');
          setState(s.el, 'cvd-in');
        });
      }
      t += GAP_MS;
    });
  }

  function replay() { play(); }

  function destroy() {
    destroyed = true;
    clearTimers();
    if (observer) { observer.disconnect(); observer = null; }
    replayBtn.removeEventListener('click', replay);
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  replayBtn.addEventListener('click', replay);

  // ── 自動播放：捲入約 40% 才播，只播一次 ──
  if (d.autoplay === false || reducedMotion() || typeof IntersectionObserver === 'undefined') {
    showAll();
  } else {
    hideAll();
    // 對話框比螢幕高時（手機），可見比例可能永遠到不了 40%，
    //   故「框的 40% 可見」或「已占螢幕高度 40%」任一成立即播放。
    const TH = [];
    for (let i = 0; i <= 20; i++) TH.push(i / 20);
    observer = new IntersectionObserver((entries) => {
      if (played) return;
      const hit = entries.some((e) => {
        if (!e.isIntersecting) return false;
        if (e.intersectionRatio >= 0.4) return true;
        const vh = (e.rootBounds && e.rootBounds.height) || window.innerHeight || 0;
        return vh > 0 && e.intersectionRect.height >= vh * 0.4;
      });
      if (hit) play();
    }, { threshold: TH });
    observer.observe(box);
  }

  return { showAll, replay, destroy };
}
