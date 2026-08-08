// ============================================================
// FuSang Vision Portal — 前端環境設定集中(config.js)
//
// 用途:所有前端環境設定(Supabase / webhook)集中於此,
//       一處切換全站指向(production ↔ staging)。
//
// 載入方式(classic script,務必最先載入):
//   <script src="./config.js"></script>   ← 排在 components.js / script.js 之前
//   之後任何 module 或 classic script 皆可讀 window.CFG.xxx
//
// 為何用 window.CFG 而非 ES export:
//   script.js 是傳統 classic script(頁面用 <script src> 載入)。
//   含 export 的檔案無法被 classic <script src> 載入(語法錯誤),
//   因此無法「同一檔既 export 又 classic 載入」。
//   window.CFG 是唯一能同時餵給 module 與 classic 消費者的機制。
//
// 安全:
//   SUPABASE_ANON_KEY 是公開值(設計上放前端,靠 RLS 保護)→ 放這裡沒問題。
//   ⚠ service_role key 絕不可進本檔 / 任何前端。只在後端 EF / n8n。
//   ⚠ Google Maps「前端 key」放這裡沒問題(靠 HTTP referrer 限制保護);
//      但 Google「後端 Time Zone key」絕不可進本檔 —— 那把只放 Supabase secret。
// ============================================================

(function () {
  // ─── 唯一切換點 ──────────────────────────────────────────
  const ENV = 'production';   // 'production' | 'staging'

  // ─── Google Maps 前端(瀏覽器)key ────────────────────────
  //   不分環境:同一把 key 兩環境共用,安全性靠「HTTP referrer 限制」而非藏 key。
  //   ⚠ 只可放「前端 key」(API 限定 Places API (New) + Maps JavaScript API、
  //     Application 限定 Websites=你的網域)。後端 Time Zone key 絕不進此檔。
  const GOOGLE_MAPS_BROWSER_KEY = 'PASTE_YOUR_FRONTEND_KEY_HERE';

  // ─── 功能開關(feature flags)──────────────────────────────
  //   與 ENV 無關:這裡管的是「功能是否對外開放」,不是「指向哪個環境」,
  //   因此獨立於 CONFIGS 之外,兩環境共用同一組值。
  //
  //   CONSULT_ENABLED —— 單獨問事(ticket)是否開放。
  //     false 時前端行為:
  //       · nav / dashboard 卡片顯示「即將推出」小標(仍可點進 landing)
  //       · consultation.html 的 CTA 區改 coming soon(定價區保留)
  //       · consultation-form / list / detail 三頁守衛,導回 consultation.html
  //     後端 ticket checkout 完全不動,僅前端到不了。
  //     未來開通:本值改 true 即全站生效,無需逐檔改回。
  //
  //   ⚠ 消費端一律用「明確等於 true 才算開啟」的判斷:
  //       if (window.CFG && window.CFG.CONSULT_ENABLED === true) { ... }
  //     如此 config.js 載入失敗時 window.CFG 為 undefined → 視同關閉(fail-closed),
  //     不會意外把未開放的購買入口露出來。
  const FEATURE_FLAGS = {
    CONSULT_ENABLED: false,
  };

  const CONFIGS = {
    // ── 正式環境 ──
    production: {
      SUPABASE_URL:      'https://vrquktgjawayuioglqfn.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXVrdGdqYXdheXVpb2dscWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzAzNjIsImV4cCI6MjA5NTA0NjM2Mn0.6qd9mW2jWYgplfBzr3uTrxVVTilFplJ__ZYM5R7Rrw4',

      // n8n webhook(Hugging Face)
      WEBHOOK_MONTHLY:   'https://ben880153-n8n-free.hf.space/webhook/monthly_v3_trigger',
      WEBHOOK_DECADE:    'https://ben880153-n8n-free.hf.space/webhook/decade-v2',
      WEBHOOK_ANNUAL:    'https://ben880153-n8n-free.hf.space/webhook/annual-v2',
    },

    // ── 測試環境(佔位,staging Supabase 專案為後續獨立工作,建好再補真值)──
    staging: {
      SUPABASE_URL:      'https://STAGING_PLACEHOLDER.supabase.co',
      SUPABASE_ANON_KEY: 'STAGING_PLACEHOLDER_ANON_KEY',

      WEBHOOK_MONTHLY:   'https://STAGING_PLACEHOLDER/webhook/monthly',
      WEBHOOK_DECADE:    'https://STAGING_PLACEHOLDER/webhook/decade',
      WEBHOOK_ANNUAL:    'https://STAGING_PLACEHOLDER/webhook/annual',
    },
  };

  // Edge Function URL 一律由 SUPABASE_URL 衍生,不獨立存:
  //   `${window.CFG.SUPABASE_URL}/functions/v1/xxx`

  const cfg = CONFIGS[ENV];
  if (!cfg) {
    throw new Error('[config] 未知的 ENV: ' + ENV);
  }
  cfg.ENV = ENV;          // 方便除錯時確認當前環境
  cfg.GOOGLE_MAPS_BROWSER_KEY = 'AIzaSyD4JeUMZyJATgoSaMNcKmeCR05W44OJhVc';   // 前端 key 併入(不分環境)
  Object.assign(cfg, FEATURE_FLAGS);   // 功能開關併入(不分環境)
  window.CFG = cfg;
})();
