// ============================================================
// FuSang Vision Portal — i18n 共用模組 (Phase 1 基礎)
//
// 用法(各頁 / components.js):
//   import { initI18n, t, td, getLang, palaceLabel, starLabel, transformLabel } from './i18n.js';
//   const { lang } = await initI18n(session);   // session 可省略(無登入頁)
//   document.getElementById('x').textContent = t('hubTitle');
//   starLabel('紫微')  // → 'ZiWei'(en) / '紫微'(zh)
//
// 設計:
//   - 結構化術語(宮位/星曜/四化) → report_glossary(DB,後端共用),用 *Label() helper
//   - UI 文字 / 顯示字典       → 本檔 I18N(前端專用),用 t()/td()
//   - 語言鎖定不變 → 快取優先;t() 內建 fallback 鏈(當前→en→zh-TW→key)
//   - 加語言 = 加 SUPPORTED 一項 + I18N 一個頂層 key + glossary 一筆 row,邏輯不動
// ============================================================

import { supabase } from './components.js';

// 支援語言(擴充語言時加這裡 + I18N 頂層 key + glossary row)
export const SUPPORTED_LANGS = ['zh-TW', 'zh-CN', 'en'];
const DEFAULT_LANG = 'zh-TW';
const LANG_CACHE_KEY = 'fs_lang';

// ─── 模組狀態 ────────────────────────────────────────────────
let _lang = DEFAULT_LANG;
let _glossary = null; // { language_name, palaces:{}, stars:{}, transforms:{} }

// ─── 語言解析:?lang= > localStorage > profile > 預設 ──────────
async function resolveLanguage(session) {
  // 1) URL 覆蓋(測試用,且寫回快取)
  try {
    const urlLang = new URLSearchParams(location.search).get('lang');
    if (urlLang && SUPPORTED_LANGS.includes(urlLang)) {
      safeSetCache(urlLang);
      return urlLang;
    }
  } catch (_) {}

  // 2) 快取命中即用(語言鎖定不變,快取可靠,免打 DB → 後續載入即時)
  const cached = safeGetCache();
  if (cached && SUPPORTED_LANGS.includes(cached)) return cached;

  // 3) 首次無快取 → 撈 profile(權威來源)
  try {
    const email = session?.user?.email;
    if (email) {
      const { data } = await supabase
        .from('user_profiles')
        .select('preferred_language')
        .eq('email', email)
        .maybeSingle();
      const pl = data?.preferred_language;
      if (pl && SUPPORTED_LANGS.includes(pl)) {
        safeSetCache(pl);
        return pl;
      }
    }
  } catch (_) {}

  // 4) 都沒有 → 預設
  return DEFAULT_LANG;
}

function safeGetCache() {
  try { return localStorage.getItem(LANG_CACHE_KEY); } catch (_) { return null; }
}
function safeSetCache(v) {
  try { localStorage.setItem(LANG_CACHE_KEY, v); } catch (_) {}
}

// ─── 載入該語言 glossary(結構化術語對照)──────────────────────
async function loadGlossary(lang) {
  try {
    const { data } = await supabase
      .from('report_glossary')
      .select('glossary')
      .eq('language_code', lang)
      .maybeSingle();
    return data?.glossary || null;
  } catch (_) {
    return null;
  }
}

// ─── 初始化(各頁 await 一次)──────────────────────────────────
export async function initI18n(session = null) {
  _lang = await resolveLanguage(session);
  _glossary = await loadGlossary(_lang);
  try { document.documentElement.lang = _lang; } catch (_) {}
  return { lang: _lang };
}

export function getLang() {
  return _lang;
}

// ─── UI 字串存取(fallback 鏈:當前→en→zh-TW→key)──────────────
export function t(key) {
  for (const L of [_lang, 'en', DEFAULT_LANG]) {
    const v = I18N[L] && I18N[L][key];
    if (v !== undefined) return v;
  }
  return key; // 連 key 都沒填 → 回傳 key 本身(明顯可見,方便補)
}

// 巢狀字典存取:td('PALACE_EXPLAINER','命宮')
export function td(dict, key) {
  for (const L of [_lang, 'en', DEFAULT_LANG]) {
    const d = I18N[L] && I18N[L][dict];
    if (d && d[key] !== undefined) return d[key];
  }
  return '';
}

// ─── 結構化術語顯示 helper(走 glossary,缺則回中文 key)────────
//   key 一律保持中文(查表用),只在顯示這刻轉
export function palaceLabel(zh) {
  return (_glossary && _glossary.palaces && _glossary.palaces[zh]) || zh;
}
export function starLabel(zh) {
  return (_glossary && _glossary.stars && _glossary.stars[zh]) || zh;
}
// 四化標籤短名:I18N.TRANSFORM_NAME(各語言) → glossary code → 中文 key
//   註:四化的 CSS class 仍用中文(.transform-tag.化忌 上色),只換顯示文字
export function transformLabel(zh) {
  const localized = td('TRANSFORM_NAME', zh);
  if (localized) return localized;
  const code = _glossary && _glossary.transforms && _glossary.transforms[zh] && _glossary.transforms[zh].code;
  return code || zh;
}

// ============================================================
// I18N 字典(前端 UI / 顯示文案)
//   Phase 1:種子(小而核心,三語已填)。大字典留 TODO,後續塊補。
//   zh-CN 多由 zh-TW 機械轉簡;en 為翻譯,Ben 可覆核字詞。
// ============================================================
export const I18N = {
  // ── 繁體中文(現行文案的權威來源)──────────────────────────
  'zh-TW': {
    // 導航 / footer(components.js 用)
    navChart: '本命盤', navAnnual: '流年', navMonthly: '流月', navAccount: '帳戶', navSignOut: '登出',
    footerTagline: '不是預知命運，<br>而是穩健有意識地走向嚮往的生活',
    footerPrivacy: '隱私政策', footerDisclaimer: '免責聲明', footerContact: '聯絡我們',
    footerCopySuffix: '紫微斗數',

    // chart.html 早期 UI
    loadingSub: '正在為您展開本命十二宮…',
    hubTitle: '本命十二宮',
    hubSub: '點選一宮以閱讀完整內容',
    ovToHub: '瀏覽全部十二宮 →',
    palaceSubtitle: '本宮主星 · 輔星 · 四化',
    sectionPalaceAnalysis: '宮位解析',

    // 結構化呈現的小字
    compHeavenlyStem: '天干', compBranch: '地支', compOpposite: '對宮', compTrines: '三方',
    emptyNoStar: '(無星)', emptyNoMainStar: '(無主星)',
    dirIn: '飛入', dirOut: '飛出',
    energyEmptyIn: '此宮無能量飛入', energyEmptyOut: '此宮無能量飛出',

    // 錯誤訊息
    errJobFail: '無法取得您的命盤資料：',
    errNotReady: '您的命盤尚未完成，請稍候幾分鐘後再回來查看。',
    errNoPalace: '找不到您命盤的宮位內容。',
    errLoad: '載入時發生錯誤。',
    errReportsFail: '無法載入宮位內容：',
    chipSourceLabel: '來源', chipFlowLabel: '流向',

    // 四化標籤短名(transformLabel 用)
    TRANSFORM_NAME: { '化祿': '化祿', '化權': '化權', '化科': '化科', '化忌': '化忌' },

    // ── TODO(後續塊補,大字典)──
    // PALACE_TAGLINE: {...}, PALACE_EXPLAINER: {...},
    // TRANSFORM_EN: {...}, TRANSFORM_TOOLTIP: {...},
    // STAR_LEXICON: {...}, SAN_FANG_ROLE: {...},
    // SELF_TRANSFORM_NOTE: {...}, BIRTH_MEANING: {...},
    // overview legends / 句型模板 ...
  },

  // ── 简体中文 ────────────────────────────────────────────────
  'zh-CN': {
    navChart: '本命盘', navAnnual: '流年', navMonthly: '流月', navAccount: '账户', navSignOut: '登出',
    footerTagline: '不是预知命运，<br>而是稳健有意识地走向向往的生活',
    footerPrivacy: '隐私政策', footerDisclaimer: '免责声明', footerContact: '联系我们',
    footerCopySuffix: '紫微斗数',

    loadingSub: '正在为您展开本命十二宫…',
    hubTitle: '本命十二宫',
    hubSub: '点选一宫以阅读完整内容',
    ovToHub: '浏览全部十二宫 →',
    palaceSubtitle: '本宫主星 · 辅星 · 四化',
    sectionPalaceAnalysis: '宫位解析',

    compHeavenlyStem: '天干', compBranch: '地支', compOpposite: '对宫', compTrines: '三方',
    emptyNoStar: '(无星)', emptyNoMainStar: '(无主星)',
    dirIn: '飞入', dirOut: '飞出',
    energyEmptyIn: '此宫无能量飞入', energyEmptyOut: '此宫无能量飞出',

    errJobFail: '无法取得您的命盘资料：',
    errNotReady: '您的命盘尚未完成，请稍候几分钟后再回来查看。',
    errNoPalace: '找不到您命盘的宫位内容。',
    errLoad: '载入时发生错误。',
    errReportsFail: '无法载入宫位内容：',
    chipSourceLabel: '来源', chipFlowLabel: '流向',

    TRANSFORM_NAME: { '化祿': '化禄', '化權': '化权', '化科': '化科', '化忌': '化忌' },
  },

  // ── English(翻譯,Ben 可覆核)────────────────────────────────
  'en': {
    navChart: 'Natal', navAnnual: 'Annual', navMonthly: 'Monthly', navAccount: 'Account', navSignOut: 'Sign out',
    footerTagline: 'Not foreseeing fate, but moving<br>steadily and consciously toward the life you long for.',
    footerPrivacy: 'Privacy', footerDisclaimer: 'Disclaimer', footerContact: 'Contact',
    footerCopySuffix: 'Zi Wei Dou Shu',

    loadingSub: 'Opening your twelve natal palaces…',
    hubTitle: 'The Twelve Palaces',
    hubSub: 'Tap a palace to read its full reading',
    ovToHub: 'Browse all twelve palaces →',
    palaceSubtitle: 'Main stars · Support stars · Transformations',
    sectionPalaceAnalysis: 'Palace Reading',

    compHeavenlyStem: 'Heavenly Stem', compBranch: 'Earthly Branch', compOpposite: 'Opposite Palace', compTrines: 'Trines',
    emptyNoStar: '(no stars)', emptyNoMainStar: '(no main star)',
    dirIn: 'Incoming', dirOut: 'Outgoing',
    energyEmptyIn: 'No energy flows into this palace', energyEmptyOut: 'No energy flows out of this palace',

    errJobFail: 'Could not load your chart data: ',
    errNotReady: 'Your chart is not ready yet. Please check back in a few minutes.',
    errNoPalace: 'Could not find the palace content for your chart.',
    errLoad: 'Something went wrong while loading.',
    errReportsFail: 'Could not load palace content: ',
    chipSourceLabel: 'From', chipFlowLabel: 'To',

    TRANSFORM_NAME: { '化祿': 'Lu', '化權': 'Quan', '化科': 'Ke', '化忌': 'Ji' },
  },
};
