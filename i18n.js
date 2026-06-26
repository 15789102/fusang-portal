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
      '命宮': '命宮代表您的<span class="domain-keyword">核心人格、行事風格與根本姿態</span>——您看待自己與世界的最底層方式。這是您一生的核心,所有其他宮位的能量,最終都會在這裡匯流,由您詮釋、由您活出來。',
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

    // ── overview 詞庫(Phase 3)──
    SAN_FANG_ROLE: { '命宮': '自我', '財帛宮': '財', '官祿宮': '事業' },
    STAR_LEXICON: {
      '紫微': { kw: ['領導','主導','尊貴'], phrase: '領導開拓' },
      '天機': { kw: ['機巧','善謀','多變'], phrase: '謀略應變' },
      '太陽': { kw: ['博愛','熱忱','外放'], phrase: '熱忱付出' },
      '武曲': { kw: ['務實','決斷','重效率'], phrase: '務實果決' },
      '天同': { kw: ['溫和','享受','隨和'], phrase: '隨和享受' },
      '廉貞': { kw: ['公關','變通','重情'], phrase: '公關變通' },
      '天府': { kw: ['穩健','保守','善理財'], phrase: '穩健守成' },
      '太陰': { kw: ['細膩','內斂','重感受'], phrase: '細膩經營' },
      '貪狼': { kw: ['多元慾望','好奇','交際'], phrase: '多元慾望' },
      '巨門': { kw: ['口才','思辨','深究'], phrase: '思辨深究' },
      '天相': { kw: ['協調','重信','穩重'], phrase: '協調穩重' },
      '天梁': { kw: ['庇蔭','原則','長者風'], phrase: '庇蔭擔當' },
      '七殺': { kw: ['衝鋒','獨立','開拓'], phrase: '衝鋒開拓' },
      '破軍': { kw: ['開創','破舊立新','變動'], phrase: '開創' },
    },
    ALLY_LEXICON: {
      '左輔': { self: '整合資源、左右逢源', ext: '平輩貴人並肩相助' },
      '右弼': { self: '整合資源、左右逢源', ext: '平輩貴人並肩相助' },
      '天魁': { self: '自帶貴氣與格調', ext: '長輩貴人提攜' },
      '天鉞': { self: '易被看見、被提攜的氣場', ext: '長輩貴人提攜' },
      '文昌': { self: '才學與條理', ext: '才學文書型助力' },
      '文曲': { self: '才藝、口才與感性', ext: '才藝口才型助力' },
    },
    SELF_TRANSFORM_NOTE: {
      '化祿': '天生的順流與福分在「自我」展現。',
      '化權': '天生的主導性落在「自我」。',
      '化科': '天生的名聲與優雅落在「自我」。',
      '化忌': '對「想要更多、想體驗更多」的深耕——自我的核心命題、一生反覆投注的方向。',
    },
    BIRTH_MEANING: { '化祿': '天生福分落點', '化權': '天生掌控與課題', '化科': '天生名聲落點', '化忌': '天生命題・深耕方向' },

    // ── overview 靜態標籤 ──
    ovEyebrow: '總覽',
    ovTitle: '你的命盤總覽',
    blockSub1: '你在自己故事裡，是什麼樣的主角。',
    blockHead2: '我的資源',
    blockSub2: '你手上有什麼牌——自帶的、與別人能給的。',

    // ── 四大生活面向(Block II)──
    domainsBlockHead: '你的四個人生面向',
    domainsBlockSub: '你在事業、金錢、感情與人際裡，天生的樣子。',
    domainAlsoSee: '也參見',
    domainEmpty: '此宮為空宮，暫無內容。',
    DOMAIN_META: {
      career: { label: '事業', en: 'Career', cover: '你天生的做事方式與動力來源。' },
      wealth: { label: '金錢', en: 'Wealth', cover: '你與金錢的關係、理財本能與盲點。' },
      love:   { label: '感情', en: 'Love',   cover: '你在關係裡自然的樣子、容易被什麼吸引。' },
      social: { label: '人際', en: 'Connections', cover: '你的人際本能、容易與什麼樣的人共振。' },
    },

    secLeadLabel: '主角',
    secStageLabel: '生活核心', secStageSub: 'The Stage · 命三方',
    secGiftLabel: '角色天賦線', secGiftSub: 'Innate Kit · 生年四化落點',
    secAllyLabel: '貴人',
    secFeedLabel: '後盾', secFeedSub: 'Foundation · 飛入助力',
    legendStage: '句型固定為「以【財】為舞台，由【命】驅動，於【官】展開」，括號內短語取自各宮主星的固定句用詞<span class="sp">|</span>點宮位進該宮完整內容',
    legendAlly: '依六內六外分欄：貴人星落<span class="tg">內部宮</span>＝自帶特質；落<span class="tg">外部宮</span>＝別人助力<span class="sp">|</span><span class="tg">左輔右弼</span> 整合・左右逢源<span class="sp">|</span><span class="tg">天魁天鉞</span> 提攜・貴氣<span class="sp">|</span><span class="tg">文昌</span> 才學<span class="sp">|</span><span class="tg">文曲</span> 才藝・口才',
    legendFeed: '<span class="tg">祿</span> 資源・緣分<span class="sp">|</span><span class="tg">權</span> 主導・掌控<span class="sp">|</span><span class="tg">科</span> 名聲・貴氣<span class="sp">|</span>助力合計＝祿＋權＋科 飛入數（依合計排序）',

    // ── overview JS 句型 / 標籤 ──
    leadThemePrefix: '核心命題（生年化坐命）：',
    ovStarsLabel: '星曜：',
    ovLeadFullLink: '{p}完整解析 →',
    leadLegendPrefix: '個性＝命宮主星於固定詞庫的聚合',
    ovEmptyLife: '命宮為空宮 · 無主星',
    stageWealthClause: '以「<b>{x}</b>」為舞台',
    stageLifeClause: '由「<b>{x}</b>」驅動',
    stageCareerClause: '於「<b>{x}</b>」中展開',
    stageJoin: '，', stageEnd: '。',
    ovStageEmpty: '命三方含空宮，敘述從略',
    allySelfHeader: '自帶特質 · 內部宮（你本身具備）',
    allyExtHeader: '外部貴人 · 外部宮（別人會幫你）',
    allyEmpty: '此盤無貴人星',
    feedLu: '祿', feedQuan: '權', feedKe: '科', feedSumLabel: '助力', feedEmpty: '無飛入助力',
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
      '命宮': '命宫代表您的<span class="domain-keyword">核心人格、行事风格与根本姿态</span>——您看待自己与世界的最底层方式。这是您一生的核心,所有其他宫位的能量,最终都会在这里汇流,由您诠释、由您活出来。',
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

    SAN_FANG_ROLE: { '命宮': '自我', '財帛宮': '财', '官祿宮': '事业' },
    STAR_LEXICON: {
      '紫微': { kw: ['领导','主导','尊贵'], phrase: '领导开拓' },
      '天機': { kw: ['机巧','善谋','多变'], phrase: '谋略应变' },
      '太陽': { kw: ['博爱','热忱','外放'], phrase: '热忱付出' },
      '武曲': { kw: ['务实','决断','重效率'], phrase: '务实果决' },
      '天同': { kw: ['温和','享受','随和'], phrase: '随和享受' },
      '廉貞': { kw: ['公关','变通','重情'], phrase: '公关变通' },
      '天府': { kw: ['稳健','保守','善理财'], phrase: '稳健守成' },
      '太陰': { kw: ['细腻','内敛','重感受'], phrase: '细腻经营' },
      '貪狼': { kw: ['多元欲望','好奇','交际'], phrase: '多元欲望' },
      '巨門': { kw: ['口才','思辨','深究'], phrase: '思辨深究' },
      '天相': { kw: ['协调','重信','稳重'], phrase: '协调稳重' },
      '天梁': { kw: ['庇荫','原则','长者风'], phrase: '庇荫担当' },
      '七殺': { kw: ['冲锋','独立','开拓'], phrase: '冲锋开拓' },
      '破軍': { kw: ['开创','破旧立新','变动'], phrase: '开创' },
    },
    ALLY_LEXICON: {
      '左輔': { self: '整合资源、左右逢源', ext: '平辈贵人并肩相助' },
      '右弼': { self: '整合资源、左右逢源', ext: '平辈贵人并肩相助' },
      '天魁': { self: '自带贵气与格调', ext: '长辈贵人提携' },
      '天鉞': { self: '易被看见、被提携的气场', ext: '长辈贵人提携' },
      '文昌': { self: '才学与条理', ext: '才学文书型助力' },
      '文曲': { self: '才艺、口才与感性', ext: '才艺口才型助力' },
    },
    SELF_TRANSFORM_NOTE: {
      '化祿': '天生的顺流与福分在「自我」展现。',
      '化權': '天生的主导性落在「自我」。',
      '化科': '天生的名声与优雅落在「自我」。',
      '化忌': '对「想要更多、想体验更多」的深耕——自我的核心命题、一生反复投注的方向。',
    },
    BIRTH_MEANING: { '化祿': '天生福分落点', '化權': '天生掌控与课题', '化科': '天生名声落点', '化忌': '天生命题・深耕方向' },

    ovEyebrow: '总览',
    ovTitle: '你的命盘总览',
    blockSub1: '你在自己故事里，是什么样的主角。',
    blockHead2: '我的资源',
    blockSub2: '你手上有什么牌——自带的、与别人能给的。',

    // ── 四大生活面向(Block II)──
    domainsBlockHead: '你的四个人生面向',
    domainsBlockSub: '你在事业、金钱、感情与人际里，天生的样子。',
    domainAlsoSee: '也参见',
    domainEmpty: '此宫为空宫，暂无内容。',
    DOMAIN_META: {
      career: { label: '事业', en: 'Career', cover: '你天生的做事方式与动力来源。' },
      wealth: { label: '金钱', en: 'Wealth', cover: '你与金钱的关系、理财本能与盲点。' },
      love:   { label: '感情', en: 'Love',   cover: '你在关系里自然的样子、容易被什么吸引。' },
      social: { label: '人际', en: 'Connections', cover: '你的人际本能、容易与什么样的人共振。' },
    },

    secLeadLabel: '主角',
    secStageLabel: '生活核心', secStageSub: 'The Stage · 命三方',
    secGiftLabel: '角色天赋线', secGiftSub: 'Innate Kit · 生年四化落点',
    secAllyLabel: '贵人',
    secFeedLabel: '后盾', secFeedSub: 'Foundation · 飞入助力',
    legendStage: '句型固定为「以【财】为舞台，由【命】驱动，于【官】展开」，括号内短语取自各宫主星的固定句用词<span class="sp">|</span>点宫位进该宫完整内容',
    legendAlly: '依六内六外分栏：贵人星落<span class="tg">内部宫</span>＝自带特质；落<span class="tg">外部宫</span>＝别人助力<span class="sp">|</span><span class="tg">左辅右弼</span> 整合・左右逢源<span class="sp">|</span><span class="tg">天魁天钺</span> 提携・贵气<span class="sp">|</span><span class="tg">文昌</span> 才学<span class="sp">|</span><span class="tg">文曲</span> 才艺・口才',
    legendFeed: '<span class="tg">禄</span> 资源・缘分<span class="sp">|</span><span class="tg">权</span> 主导・掌控<span class="sp">|</span><span class="tg">科</span> 名声・贵气<span class="sp">|</span>助力合计＝禄＋权＋科 飞入数（依合计排序）',

    leadThemePrefix: '核心命题（生年化坐命）：',
    ovStarsLabel: '星曜：',
    ovLeadFullLink: '{p}完整解析 →',
    leadLegendPrefix: '个性＝命宫主星于固定词库的聚合',
    ovEmptyLife: '命宫为空宫 · 无主星',
    stageWealthClause: '以「<b>{x}</b>」为舞台',
    stageLifeClause: '由「<b>{x}</b>」驱动',
    stageCareerClause: '于「<b>{x}</b>」中展开',
    stageJoin: '，', stageEnd: '。',
    ovStageEmpty: '命三方含空宫，叙述从略',
    allySelfHeader: '自带特质 · 内部宫（你本身具备）',
    allyExtHeader: '外部贵人 · 外部宫（别人会帮你）',
    allyEmpty: '此盘无贵人星',
    feedLu: '禄', feedQuan: '权', feedKe: '科', feedSumLabel: '助力', feedEmpty: '无飞入助力',
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
      '命宮': 'This palace represents your <span class="domain-keyword">core personality, way of acting, and fundamental stance</span> — the deepest way you see yourself and the world. It is the core of your life, where the energy of every other palace ultimately converges, to be interpreted and lived out by you.',
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

    SAN_FANG_ROLE: { '命宮': 'Self', '財帛宮': 'Wealth', '官祿宮': 'Career' },
    STAR_LEXICON: {
      '紫微': { kw: ['Leadership','Authority','Nobility'], phrase: 'leadership & initiative' },
      '天機': { kw: ['Ingenuity','Strategy','Versatility'], phrase: 'strategy & adaptation' },
      '太陽': { kw: ['Generosity','Warmth','Outward energy'], phrase: 'warm devotion' },
      '武曲': { kw: ['Pragmatism','Decisiveness','Efficiency'], phrase: 'pragmatic resolve' },
      '天同': { kw: ['Gentleness','Enjoyment','Ease'], phrase: 'easygoing enjoyment' },
      '廉貞': { kw: ['Charisma','Adaptability','Feeling'], phrase: 'charm & adaptability' },
      '天府': { kw: ['Steadiness','Prudence','Stewardship'], phrase: 'steady stewardship' },
      '太陰': { kw: ['Sensitivity','Reserve','Feeling'], phrase: 'careful cultivation' },
      '貪狼': { kw: ['Many desires','Curiosity','Sociability'], phrase: 'wide-ranging desire' },
      '巨門': { kw: ['Eloquence','Reasoning','Depth'], phrase: 'probing analysis' },
      '天相': { kw: ['Coordination','Trust','Composure'], phrase: 'steady coordination' },
      '天梁': { kw: ['Protection','Principle','Elder presence'], phrase: 'protective duty' },
      '七殺': { kw: ['Drive','Independence','Pioneering'], phrase: 'charging ahead' },
      '破軍': { kw: ['Innovation','Renewal','Change'], phrase: 'breaking new ground' },
    },
    ALLY_LEXICON: {
      '左輔': { self: 'integrating resources, support all around', ext: 'peers who help shoulder to shoulder' },
      '右弼': { self: 'integrating resources, support all around', ext: 'peers who help shoulder to shoulder' },
      '天魁': { self: 'innate distinction and grace', ext: 'mentorship from elders' },
      '天鉞': { self: 'a presence that gets noticed and lifted up', ext: 'mentorship from elders' },
      '文昌': { self: 'learning and structure', ext: 'help through scholarship and paperwork' },
      '文曲': { self: 'artistry, eloquence, and feeling', ext: 'help through talent and eloquence' },
    },
    SELF_TRANSFORM_NOTE: {
      '化祿': 'Innate flow and fortune express through the self.',
      '化權': 'Innate authority settles on the self.',
      '化科': 'Innate reputation and grace settle on the self.',
      '化忌': 'A deep pull toward wanting and experiencing more — the core theme of the self, the direction you return to throughout life.',
    },
    BIRTH_MEANING: { '化祿': 'where innate fortune lands', '化權': 'innate control & challenge', '化科': 'where innate reputation lands', '化忌': 'innate theme · direction of depth' },

    ovEyebrow: 'Overview',
    ovTitle: 'Your Chart Overview',
    blockSub1: 'What kind of lead are you, in your own story?',
    blockHead2: 'What You Hold',
    blockSub2: 'What cards you hold — your own, and what others can offer.',

    // ── Four areas of life (Block II) ──
    domainsBlockHead: 'Your Four Areas of Life',
    domainsBlockSub: 'How you naturally are in work, money, love, and connection.',
    domainAlsoSee: 'See also',
    domainEmpty: 'This palace is empty; no reading yet.',
    DOMAIN_META: {
      career: { label: 'Career', en: 'Career', cover: 'Your innate way of working and what drives you.' },
      wealth: { label: 'Money', en: 'Wealth', cover: 'Your relationship with money — instincts and blind spots.' },
      love:   { label: 'Love', en: 'Love', cover: 'How you naturally are in relationships, and what draws you.' },
      social: { label: 'Connections', en: 'Connections', cover: 'Your social instincts and the people you resonate with.' },
    },

    secLeadLabel: 'The Lead',
    secStageLabel: 'Life Core', secStageSub: 'The Stage',
    secGiftLabel: 'Innate Gifts', secGiftSub: 'Innate Kit',
    secAllyLabel: 'Allies',
    secFeedLabel: 'Backing', secFeedSub: 'Foundation',
    legendStage: 'The line reads "on the stage of [Wealth], driven by [Self], unfolding in [Career]"; each phrase comes from that palace&#39;s main-star keywords<span class="sp">|</span>tap a palace for its full reading',
    legendAlly: 'Split by inner and outer palaces: ally stars in an <span class="tg">inner palace</span> = traits you carry; in an <span class="tg">outer palace</span> = help from others<span class="sp">|</span><span class="tg">ZuoFu / YouBi</span> integration &amp; support<span class="sp">|</span><span class="tg">TianKui / TianYue</span> mentorship &amp; grace<span class="sp">|</span><span class="tg">WenChang</span> learning<span class="sp">|</span><span class="tg">WenQu</span> talent &amp; eloquence',
    legendFeed: '<span class="tg">Lu</span> resources &amp; connection<span class="sp">|</span><span class="tg">Quan</span> initiative &amp; control<span class="sp">|</span><span class="tg">Ke</span> reputation &amp; grace<span class="sp">|</span>total = inflowing Lu + Quan + Ke (sorted by total)',

    leadThemePrefix: 'Core theme (innate transformation seated in the Life Palace): ',
    ovStarsLabel: 'Stars: ',
    ovLeadFullLink: 'Full reading of {p} →',
    leadLegendPrefix: 'Personality = the blend of your Life Palace main stars from the fixed lexicon',
    ovEmptyLife: 'The Life Palace is empty · no main star',
    stageWealthClause: 'on the stage of <b>{x}</b>',
    stageLifeClause: 'driven by <b>{x}</b>',
    stageCareerClause: 'unfolding in <b>{x}</b>',
    stageJoin: ', ', stageEnd: '.',
    ovStageEmpty: 'The Life trinity includes an empty palace; description omitted',
    allySelfHeader: 'Innate traits · inner palaces (you carry these)',
    allyExtHeader: 'Outer allies · outer palaces (others help you)',
    allyEmpty: 'No ally stars in this chart',
    feedLu: 'Lu', feedQuan: 'Quan', feedKe: 'Ke', feedSumLabel: 'Support', feedEmpty: 'No inflowing support',
  },
};
