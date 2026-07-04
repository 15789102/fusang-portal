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
// ============================================================

(function () {
  // ─── 唯一切換點 ──────────────────────────────────────────
  const ENV = 'production';   // 'production' | 'staging'

  const CONFIGS = {
    // ── 正式環境 ──
    production: {
      SUPABASE_URL:      'https://vrquktgjawayuioglqfn.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycXVrdGdqYXdheXVpb2dscWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzAzNjIsImV4cCI6MjA5NTA0NjM2Mn0.6qd9mW2jWYgplfBzr3uTrxVVTilFplJ__ZYM5R7Rrw4',

      // webhook 真值待遷移 annual/monthly/decade.html 時,從各檔搬入
      WEBHOOK_MONTHLY:   'TODO_FILL_FROM_monthly_html',
      WEBHOOK_DECADE:    'TODO_FILL_FROM_decade_html',
      WEBHOOK_ANNUAL:    'TODO_FILL_FROM_annual_html',
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
  window.CFG = cfg;
})();
