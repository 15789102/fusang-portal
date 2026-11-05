// ============================================================
// FuSang Vision Portal — 頁面瀏覽與按鈕點擊追蹤(track.js)  PT-010 B
//
// 載入方式(classic script,排在 config.js 之後;admin 頁一律不載入):
//   <script src="config.js"></script>
//   <script src="track.js" defer></script>
//
// 做什麼:只送四種事件到 Supabase RPC public.log_event(伺服器端有白名單與限流)
//   page_view      每次頁面載入一次
//   cta_view       帶 data-fs-cta 的元素 ≥50% 在畫面內、連續 ≥1 秒、未 disabled、
//                  分頁可見 → 每個 cta_id 每次載入最多一次
//   cta_click      點擊帶 data-fs-cta 的元素(事件委派 capture;動態產生的也抓得到)
//   checkout_start 由 components.js 的 startCheckout 呼叫 window.fsTrack 觸發
//
// 設計限制(PT-010.md 與 PT-010_B_決定.md):
//   · 不依賴 components.js / i18n.js / supabase-js;只用 window.CFG 與 fetch
//   · 失敗一律靜默(try/catch),絕不影響頁面功能與載入速度
//   · 本檔是 public:不放任何金鑰(anon key 取自 config.js,本來就公開)
//   · 不存 IP、完整 UA、完整 referrer 網址、email、姓名、出生資料
//   · user_id 由伺服器用 auth.uid() 填;前端只帶 JWT,不傳 user_id
//   · 所有來自 URL 的字串(utm_*)只進 JSON 請求本文,不進任何 innerHTML
//
// 不送的情況:navigator.doNotTrack === '1'、navigator.globalPrivacyControl === true、
//   navigator.webdriver === true、localStorage fs_no_track === '1'
//   內部排除:任一頁加 ?notrack=1 → 設 fs_no_track=1;?notrack=0 → 取消
// ============================================================
(function () {
  'use strict';

  try {
    var W = window, D = document, N = navigator;

    // ── 內部排除開關(先處理,即使 DNT 也要讓 ?notrack 生效)──────────────
    var NO_TRACK_KEY = 'fs_no_track';
    try {
      var nt = new URLSearchParams(W.location.search).get('notrack');
      if (nt === '1') W.localStorage.setItem(NO_TRACK_KEY, '1');
      else if (nt === '0') W.localStorage.removeItem(NO_TRACK_KEY);
    } catch (_) {}

    // ── 不送的情況 ──────────────────────────────────────────────────────
    if (N.doNotTrack === '1') return;
    if (N.globalPrivacyControl === true) return;
    if (N.webdriver === true) return;
    try { if (W.localStorage.getItem(NO_TRACK_KEY) === '1') return; } catch (_) {}

    // ── 設定(config.js 須先載入)─────────────────────────────────────────
    var CFG = W.CFG;
    if (!CFG || !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) return;
    var RPC_URL = String(CFG.SUPABASE_URL).replace(/\/+$/, '') + '/rest/v1/rpc/log_event';
    var ANON_KEY = CFG.SUPABASE_ANON_KEY;

    // supabase-js 預設 storageKey:sb-<SUPABASE_URL 主機名第一段>-auth-token(localStorage,JSON session)
    var AUTH_KEY = null;
    try { AUTH_KEY = 'sb-' + new URL(CFG.SUPABASE_URL).hostname.split('.')[0] + '-auth-token'; } catch (_) {}

    // ── 格式(與 log_event 的驗證一致;不合格式的值直接不送)─────────────
    var RE_ID   = /^[A-Za-z0-9_-]{8,64}$/;
    var RE_CTA  = /^[a-z0-9-]{1,40}$/;
    var RE_PAGE = /^[a-z0-9-]{1,40}$/;
    var RE_LANG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
    var RE_HOST = /^[a-z0-9.-]{1,100}$/;
    var RE_PROD = /^[a-z0-9_-]{1,30}$/;

    // ── 隨機 ID(不是指紋)──────────────────────────────────────────────
    function randId() {
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      var out = '', i;
      try {
        var a = new Uint8Array(24);
        W.crypto.getRandomValues(a);
        for (i = 0; i < a.length; i++) out += chars.charAt(a[i] % chars.length);
      } catch (_) {
        out = '';
        for (i = 0; i < 24; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return out;
    }

    // visitor_id → localStorage(跨分頁、跨造訪);session_id → sessionStorage
    // storage 不可用時退回「本次載入」的記憶體值(仍符合格式,只是不跨頁)
    function stableId(store, key) {
      var id = null;
      try { id = store.getItem(key); } catch (_) {}
      if (id && RE_ID.test(id)) return id;
      id = randId();
      try { store.setItem(key, id); } catch (_) {}
      return id;
    }
    var visitorId, sessionId;
    try { visitorId = stableId(W.localStorage, 'fs_vid'); } catch (_) { visitorId = randId(); }
    try { sessionId = stableId(W.sessionStorage, 'fs_sid'); } catch (_) { sessionId = randId(); }

    // ── 欄位取得 ────────────────────────────────────────────────────────
    // page:檔名去掉 .html、小寫;根路徑與 index.html 都是 index
    function pageName() {
      var p = (W.location.pathname || '/').toLowerCase();
      var seg = p.replace(/\/+$/, '').split('/').pop() || '';
      seg = seg.replace(/\.html$/, '');
      if (!seg) seg = 'index';
      return RE_PAGE.test(seg) ? seg : null;
    }
    var PAGE = pageName();
    if (!PAGE) return;

    function uiLang() {
      var l = D.documentElement && D.documentElement.lang;
      return l && RE_LANG.test(l) ? l : null;
    }
    function referrerHost() {
      try {
        if (!D.referrer) return null;
        var h = new URL(D.referrer).hostname.toLowerCase();
        return RE_HOST.test(h) ? h : null;
      } catch (_) { return null; }
    }
    function utm(name) {
      try {
        var v = new URLSearchParams(W.location.search).get(name);
        if (v == null) return null;
        v = String(v).trim().slice(0, 100);
        return v || null;
      } catch (_) { return null; }
    }
    function viewportClass() {
      try {
        if (W.matchMedia) return W.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
      } catch (_) {}
      return (W.innerWidth || 1024) < 768 ? 'mobile' : 'desktop';
    }

    // ── 登入 JWT(有效才帶;過期就用 anon key,避免 RPC 回 401 整筆掉)─────
    function bearer() {
      try {
        if (!AUTH_KEY) return ANON_KEY;
        var raw = W.localStorage.getItem(AUTH_KEY);
        if (!raw) return ANON_KEY;
        var s = JSON.parse(raw);
        if (s && typeof s.access_token === 'string' && typeof s.expires_at === 'number' &&
            s.expires_at - 30 > Date.now() / 1000) {
          return s.access_token;
        }
      } catch (_) {}
      return ANON_KEY;
    }

    // ── 送出(fire-and-forget;keepalive 讓點擊後立刻換頁也送得出去)──────
    function send(event, ctaId, props) {
      try {
        var body = {
          p_event: event,
          p_page: PAGE,
          p_visitor_id: visitorId,
          p_cta_id: ctaId || null,
          p_session_id: sessionId,
          p_ui_lang: uiLang(),
          p_referrer_host: referrerHost(),
          p_utm_source: utm('utm_source'),
          p_utm_medium: utm('utm_medium'),
          p_utm_campaign: utm('utm_campaign'),
          p_viewport_class: viewportClass(),
          p_props: props || null
        };
        var p = W.fetch(RPC_URL, {
          method: 'POST',
          keepalive: true,
          headers: {
            'apikey': ANON_KEY,
            'Authorization': 'Bearer ' + bearer(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } catch (_) {}
    }

    // ── 公開給 components.js 的 startCheckout 呼叫(只接受 checkout_start)──
    // 意義:登入狀態下使用者按了購買、系統開始建立結帳(不保證成功跳轉 Stripe)
    W.fsTrack = function (event, props) {
      try {
        if (event !== 'checkout_start') return;
        var pt = props && props.product_type;
        if (typeof pt !== 'string' || !RE_PROD.test(pt)) return;
        send('checkout_start', null, { product_type: pt });
      } catch (_) {}
    };

    // ── cta_click:事件委派(capture)────────────────────────────────────
    function ctaIdOf(el) {
      var id = el && el.getAttribute && el.getAttribute('data-fs-cta');
      return id && RE_CTA.test(id) ? id : null;
    }
    D.addEventListener('click', function (e) {
      try {
        var t = e.target;
        if (!t || !t.closest) return;
        var el = t.closest('[data-fs-cta]');
        if (!el) return;
        var id = ctaIdOf(el);
        if (id) send('cta_click', id, null);
      } catch (_) {}
    }, true);

    // ── cta_view ───────────────────────────────────────────────────────
    // 條件(PT-010_B_決定.md 第 5 點),三者同時成立且連續 ≥1 秒才送,每個 cta_id 每次載入最多一次:
    //   1. 元素至少 50% 在畫面內
    //   2. 未 disabled、不含 .is-owned、沒有 aria-disabled="true"(計時結束時再檢查一次)
    //   3. document.visibilityState === 'visible'
    // 不滿足就取消計時;離開畫面再回來重新計時。
    var DWELL_MS = 1000;
    var sentViews = {};          // cta_id → true
    var tracked = [];            // [{el, vis, timer}]
    var io = null;

    function findRec(el) {
      for (var i = 0; i < tracked.length; i++) if (tracked[i].el === el) return tracked[i];
      return null;
    }
    function eligible(el) {
      if (!el.isConnected) return false;
      if (el.disabled === true) return false;
      if (el.getAttribute('aria-disabled') === 'true') return false;
      if (el.classList && el.classList.contains('is-owned')) return false;
      return D.visibilityState === 'visible';
    }
    function clearTimer(rec) {
      if (rec.timer) { clearTimeout(rec.timer); rec.timer = null; }
    }
    function evaluate(rec) {
      var id = ctaIdOf(rec.el);
      if (!id || sentViews[id]) { clearTimer(rec); return; }
      var ok = rec.vis && eligible(rec.el);
      if (ok && !rec.timer) {
        rec.timer = setTimeout(function () {
          rec.timer = null;
          try {
            var cur = ctaIdOf(rec.el);
            if (cur && !sentViews[cur] && rec.vis && eligible(rec.el)) {
              sentViews[cur] = true;
              send('cta_view', cur, null);
            }
          } catch (_) {}
        }, DWELL_MS);
      } else if (!ok && rec.timer) {
        clearTimer(rec);
      }
    }
    function watch(el) {
      if (!io || findRec(el)) return;
      var rec = { el: el, vis: false, timer: null };
      tracked.push(rec);
      io.observe(el);
    }
    function forget(el) {
      for (var i = 0; i < tracked.length; i++) {
        if (tracked[i].el === el) {
          clearTimer(tracked[i]);
          tracked.splice(i, 1);
          try { io.unobserve(el); } catch (_) {}
          return;
        }
      }
    }
    function scan(node, fn) {
      if (!node || node.nodeType !== 1) return;
      if (node.hasAttribute && node.hasAttribute('data-fs-cta')) fn(node);
      if (node.querySelectorAll) {
        var list = node.querySelectorAll('[data-fs-cta]');
        for (var i = 0; i < list.length; i++) fn(list[i]);
      }
    }

    function startViewTracking() {
      if (typeof W.IntersectionObserver !== 'function') return;
      io = new W.IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var rec = findRec(entries[i].target);
          if (!rec) continue;
          rec.vis = entries[i].intersectionRatio >= 0.5;
          evaluate(rec);
        }
      }, { threshold: [0.5] });

      scan(D.documentElement, watch);

      // 動態產生(含 <template> clone、innerHTML 重畫)、disabled / class 變化
      if (typeof W.MutationObserver === 'function') {
        new W.MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            if (m.type === 'childList') {
              for (var a = 0; a < m.addedNodes.length; a++) scan(m.addedNodes[a], watch);
              for (var r = 0; r < m.removedNodes.length; r++) scan(m.removedNodes[r], forget);
            } else if (m.type === 'attributes') {
              var rec = findRec(m.target);
              if (rec) evaluate(rec);
              else if (m.target.hasAttribute && m.target.hasAttribute('data-fs-cta')) watch(m.target);
            }
          }
        }).observe(D.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['disabled', 'aria-disabled', 'class', 'data-fs-cta']
        });
      }

      // 分頁切到背景 → 取消計時;回到前景 → 重新評估
      D.addEventListener('visibilitychange', function () {
        for (var i = 0; i < tracked.length; i++) evaluate(tracked[i]);
      });
    }

    // ── 啟動 ────────────────────────────────────────────────────────────
    function boot() {
      try { send('page_view', null, null); } catch (_) {}
      try { startViewTracking(); } catch (_) {}
    }
    // 預渲染(prerender)的頁面等到真正被看見才算一次載入
    if (D.prerendering) {
      D.addEventListener('prerenderingchange', boot, { once: true });
    } else {
      boot();
    }
  } catch (_) {
    // 靜默:追蹤失敗不得影響頁面
  }
})();
