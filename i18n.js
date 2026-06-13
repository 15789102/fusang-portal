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

    // detail / hub / loading / error 靜態標籤(applyStaticI18n 用)
    loadingTitle: '載入您的命盤',
    palaceExplainerLabel: '關於這個宮位',
    compositionLabel: '結構組成',
    secInflowTitle: '能量飛入',
    secOutflowTitle: '能量飛出',
    secSuggestTitle: '我們的建議',
    sectionInflowDesc: '<strong>能量飛入</strong>——其他宮位的星曜,以四化的形式流入本宮。代表您的這個領域,正被人生哪些方面<strong>滋養、推動或牽引</strong>。',
    sectionOutflowDesc: '<strong>能量飛出</strong>——本宮的能量,以四化的形式飛入其他宮位。代表您的這個領域,正在<strong>影響、貢獻或牽引</strong>哪些人生方面。',
    errTitle: '無法載入命盤',
    btnBackDashboard: '返回儀表板',

    // 四化標籤短名(transformLabel 用)
    TRANSFORM_NAME: { '化祿': '化祿', '化權': '化權', '化科': '化科', '化忌': '化忌' },

    // 宮位副標(detail-tagline)
    PALACE_TAGLINE: {
      '命宮': '本性與內在', '兄弟宮': '至親與同輩', '夫妻宮': '伴侶與情感', '子女宮': '創造與後輩',
      '財帛宮': '財富與資源', '疾厄宮': '身體與感受', '遷移宮': '外境與機運', '交友宮': '朋友與人脈',
      '官祿宮': '事業與舞台', '田宅宮': '家庭與基地', '福德宮': '心靈與享受', '父母宮': '長輩與權威',
    },

    // 宮位完整說明(detail-explainer;含 domain-keyword span)
    PALACE_EXPLAINER: {
      '命宮': '命宮代表您的<span class="domain-keyword">核心人格、行事風格與根本姿態</span>——您看待自己與世界的最底層方式。這是您一生的「主舞台」,所有其他宮位的能量,最終都會在這裡匯流、被您詮釋、被您演繹。',
      '兄弟宮': '兄弟宮代表您與<span class="domain-keyword">手足、同輩、母親與密切夥伴</span>的關係,也反映您在團隊、同儕系統中的相處模式與資源往來。',
      '夫妻宮': '夫妻宮代表您的<span class="domain-keyword">親密關係、伴侶互動與情感模式</span>——您如何愛人、如何被愛,以及您在一對一深度關係中的姿態。',
      '子女宮': '子女宮代表您的<span class="domain-keyword">子女、後輩、創造力與性</span>——廣義上是您「孕育出來的事物」,包含作品、學生、晚輩與一切親手栽培之物。',
      '財帛宮': '財帛宮代表您的<span class="domain-keyword">財富、現金流與價值觀</span>——您如何賺取、運用與看待金錢,以及您對「擁有」這件事的態度。',
      '疾厄宮': '疾厄宮代表您的<span class="domain-keyword">身體、健康與情緒體質</span>——您的先天體質傾向、身心的感受方式,以及壓力在身體上的展現。',
      '遷移宮': '遷移宮代表您的<span class="domain-keyword">外在世界、際遇與社會形象</span>——您離開熟悉環境後的際遇、在外的機運,以及他人眼中的您。它是命宮的對宮,映照您的另一面。',
      '交友宮': '交友宮代表您的<span class="domain-keyword">朋友、人脈、下屬與社交網絡</span>——您與廣泛人際的互動方式,以及您從社群中獲得或付出的能量。',
      '官祿宮': '官祿宮代表您的<span class="domain-keyword">事業、志向與社會成就</span>——您的工作舞台、專業表現,以及您一生想要建立的功業與位置。',
      '田宅宮': '田宅宮代表您的<span class="domain-keyword">家庭、不動產與安身之所</span>——您的居家環境、家族基地,以及您內心對「歸屬」與「根」的感受。',
      '福德宮': '福德宮代表您的<span class="domain-keyword">精神世界、興趣與享受</span>——您的內在快樂來源、價值信念,以及您靈魂層面的滿足與安頓。',
      '父母宮': '父母宮代表您與<span class="domain-keyword">父母、長輩、權威與庇蔭</span>的關係,也反映您的學養根基、與上位者的相處,以及您所承接的家世背景。',
    },

    // 四化 tooltip(title + body)
    TRANSFORM_TOOLTIP: {
      '化祿': { title: '化祿 · Resource (Lu)', body: '喜悅與緣分增加。能量帶來資源、人脈、順流感與成就的喜悅,是您天生有福、容易順利展開的領域。' },
      '化權': { title: '化權 · Anchor (Quan)', body: '權力與掌控。能量賦予您主導感、決策力與影響力,是您天生想要「說了算」、想要為事情負責的領域。' },
      '化科': { title: '化科 · Stage (Ke)', body: '名望與被看見。能量讓您在這個領域容易獲得聲譽、肯定與優雅形象,是您天生發光、會被欣賞的舞台。' },
      '化忌': { title: '化忌 · Direction (Ji)', body: '不滿足與執著。能量讓您在這個領域反覆投入、深耕、永不饜足。這不是缺憾,而是您一生關注的「核心命題」與成長方向。' },
    },

    // ── TODO(Phase 3):STAR_LEXICON / SAN_FANG_ROLE / SELF_TRANSFORM_NOTE / BIRTH_MEANING / overview 句型 ──
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

    loadingTitle: '载入您的命盘',
    palaceExplainerLabel: '关于这个宫位',
    compositionLabel: '结构组成',
    secInflowTitle: '能量飞入',
    secOutflowTitle: '能量飞出',
    secSuggestTitle: '我们的建议',
    sectionInflowDesc: '<strong>能量飞入</strong>——其他宫位的星曜,以四化的形式流入本宫。代表您的这个领域,正被人生哪些方面<strong>滋养、推动或牵引</strong>。',
    sectionOutflowDesc: '<strong>能量飞出</strong>——本宫的能量,以四化的形式飞入其他宫位。代表您的这个领域,正在<strong>影响、贡献或牵引</strong>哪些人生方面。',
    errTitle: '无法载入命盘',
    btnBackDashboard: '返回仪表板',

    TRANSFORM_NAME: { '化祿': '化禄', '化權': '化权', '化科': '化科', '化忌': '化忌' },

    PALACE_TAGLINE: {
      '命宮': '本性与内在', '兄弟宮': '至亲与同辈', '夫妻宮': '伴侣与情感', '子女宮': '创造与后辈',
      '財帛宮': '财富与资源', '疾厄宮': '身体与感受', '遷移宮': '外境与机运', '交友宮': '朋友与人脉',
      '官祿宮': '事业与舞台', '田宅宮': '家庭与基地', '福德宮': '心灵与享受', '父母宮': '长辈与权威',
    },

    PALACE_EXPLAINER: {
      '命宮': '命宫代表您的<span class="domain-keyword">核心人格、行事风格与根本姿态</span>——您看待自己与世界的最底层方式。这是您一生的「主舞台」,所有其他宫位的能量,最终都会在这里汇流、被您诠释、被您演绎。',
      '兄弟宮': '兄弟宫代表您与<span class="domain-keyword">手足、同辈、母亲与密切伙伴</span>的关系,也反映您在团队、同侪系统中的相处模式与资源往来。',
      '夫妻宮': '夫妻宫代表您的<span class="domain-keyword">亲密关系、伴侣互动与情感模式</span>——您如何爱人、如何被爱,以及您在一对一深度关系中的姿态。',
      '子女宮': '子女宫代表您的<span class="domain-keyword">子女、后辈、创造力与性</span>——广义上是您「孕育出来的事物」,包含作品、学生、晚辈与一切亲手栽培之物。',
      '財帛宮': '财帛宫代表您的<span class="domain-keyword">财富、现金流与价值观</span>——您如何赚取、运用与看待金钱,以及您对「拥有」这件事的态度。',
      '疾厄宮': '疾厄宫代表您的<span class="domain-keyword">身体、健康与情绪体质</span>——您的先天体质倾向、身心的感受方式,以及压力在身体上的展现。',
      '遷移宮': '迁移宫代表您的<span class="domain-keyword">外在世界、际遇与社会形象</span>——您离开熟悉环境后的际遇、在外的机运,以及他人眼中的您。它是命宫的对宫,映照您的另一面。',
      '交友宮': '交友宫代表您的<span class="domain-keyword">朋友、人脉、下属与社交网络</span>——您与广泛人际的互动方式,以及您从社群中获得或付出的能量。',
      '官祿宮': '官禄宫代表您的<span class="domain-keyword">事业、志向与社会成就</span>——您的工作舞台、专业表现,以及您一生想要建立的功业与位置。',
      '田宅宮': '田宅宫代表您的<span class="domain-keyword">家庭、不动产与安身之所</span>——您的居家环境、家族基地,以及您内心对「归属」与「根」的感受。',
      '福德宮': '福德宫代表您的<span class="domain-keyword">精神世界、兴趣与享受</span>——您的内在快乐来源、价值信念,以及您灵魂层面的满足与安顿。',
      '父母宮': '父母宫代表您与<span class="domain-keyword">父母、长辈、权威与庇荫</span>的关系,也反映您的学养根基、与上位者的相处,以及您所承接的家世背景。',
    },

    TRANSFORM_TOOLTIP: {
      '化祿': { title: '化禄 · Resource (Lu)', body: '喜悦与缘分增加。能量带来资源、人脉、顺流感与成就的喜悦,是您天生有福、容易顺利展开的领域。' },
      '化權': { title: '化权 · Anchor (Quan)', body: '权力与掌控。能量赋予您主导感、决策力与影响力,是您天生想要「说了算」、想要为事情负责的领域。' },
      '化科': { title: '化科 · Stage (Ke)', body: '名望与被看见。能量让您在这个领域容易获得声誉、肯定与优雅形象,是您天生发光、会被欣赏的舞台。' },
      '化忌': { title: '化忌 · Direction (Ji)', body: '不满足与执着。能量让您在这个领域反复投入、深耕、永不餍足。这不是缺憾,而是您一生关注的「核心命题」与成长方向。' },
    },
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

    loadingTitle: 'Loading your chart',
    palaceExplainerLabel: 'About this Palace',
    compositionLabel: 'Composition',
    secInflowTitle: 'Inflowing Currents',
    secOutflowTitle: 'Outflowing Currents',
    secSuggestTitle: 'Our Suggestions',
    sectionInflowDesc: '<strong>Inflowing energy</strong> — stars from other palaces flow into this one through the four transformations, showing which areas of life are <strong>nourishing, driving, or drawing on</strong> this part of you.',
    sectionOutflowDesc: '<strong>Outflowing energy</strong> — the energy of this palace flows out into others through the four transformations, showing which areas of life this part of you is <strong>shaping, supporting, or drawing toward it</strong>.',
    errTitle: 'Unable to load your chart',
    btnBackDashboard: 'Back to dashboard',

    TRANSFORM_NAME: { '化祿': 'Lu', '化權': 'Quan', '化科': 'Ke', '化忌': 'Ji' },

    PALACE_TAGLINE: {
      '命宮': 'your innate nature', '兄弟宮': 'siblings & peers', '夫妻宮': 'partner & love', '子女宮': 'creation & legacy',
      '財帛宮': 'wealth & resources', '疾厄宮': 'body & feeling', '遷移宮': 'outer world', '交友宮': 'friends & network',
      '官祿宮': 'career & stage', '田宅宮': 'home & ground', '福德宮': 'spirit & joy', '父母宮': 'parents & authority',
    },

    PALACE_EXPLAINER: {
      '命宮': 'This palace represents your <span class="domain-keyword">core personality, way of acting, and fundamental stance</span> — the deepest way you see yourself and the world. It is the main stage of your life, where the energy of every other palace ultimately converges, to be interpreted and performed by you.',
      '兄弟宮': 'This palace represents your relationships with <span class="domain-keyword">siblings, peers, your mother, and close companions</span>, and reflects how you relate and share resources within teams and peer groups.',
      '夫妻宮': 'This palace represents your <span class="domain-keyword">intimate relationships, partner dynamics, and emotional patterns</span> — how you love and are loved, and how you carry yourself in close one-to-one bonds.',
      '子女宮': 'This palace represents your <span class="domain-keyword">children, juniors, creativity, and sexuality</span> — broadly, all that you bring into being: your work, students, those you mentor, and everything you nurture by hand.',
      '財帛宮': 'This palace represents your <span class="domain-keyword">wealth, cash flow, and values</span> — how you earn, use, and regard money, and your attitude toward having and owning.',
      '疾厄宮': 'This palace represents your <span class="domain-keyword">body, health, and emotional constitution</span> — your innate physical tendencies, how you sense in body and mind, and how stress shows up physically.',
      '遷移宮': 'This palace represents your <span class="domain-keyword">outer world, encounters, and social image</span> — what you meet beyond familiar ground, your fortune away from home, and how others see you. As the palace opposite the Life Palace, it mirrors your other side.',
      '交友宮': 'This palace represents your <span class="domain-keyword">friends, network, subordinates, and social circles</span> — how you engage across wider relationships, and the energy you draw from and give to your communities.',
      '官祿宮': 'This palace represents your <span class="domain-keyword">career, ambition, and social achievement</span> — your working stage, professional expression, and the body of work and standing you wish to build over a lifetime.',
      '田宅宮': 'This palace represents your <span class="domain-keyword">family, property, and place of belonging</span> — your living environment, your family base, and your inner sense of roots and belonging.',
      '福德宮': 'This palace represents your <span class="domain-keyword">inner world, interests, and enjoyment</span> — the sources of your inner joy, your beliefs and values, and the contentment you find at the level of the soul.',
      '父母宮': 'This palace represents your relationship with <span class="domain-keyword">parents, elders, authority, and protection</span>, and reflects your foundation of learning, how you relate to those above you, and the family background you inherit.',
    },

    TRANSFORM_TOOLTIP: {
      '化祿': { title: 'Resource (Lu)', body: 'Joy and connection increase. This energy brings resources, people, flow, and the pleasure of achievement — an area where you are naturally fortunate and things tend to open up with ease.' },
      '化權': { title: 'Anchor (Quan)', body: 'Power and control. This energy gives you leadership, decisiveness, and influence — an area where you naturally want the final say and to take responsibility.' },
      '化科': { title: 'Stage (Ke)', body: 'Reputation and being seen. This energy helps you gain recognition, esteem, and a graceful presence here — a stage where you naturally shine and are appreciated.' },
      '化忌': { title: 'Direction (Ji)', body: 'Yearning and devotion. This energy draws you to return to this area again and again, deepening, never quite satisfied. Not a flaw, but the core theme and direction of growth you attend to all your life.' },
    },
  },
};
