// ============================================================
// FuSang Vision Portal — i18n 核心 (classic script,掛 window.FSI18N)
//
// 載入方式(比照 config.js,classic,無 import/export):
//   <script src="config.js"></script>   ← 環境設定(先)
//   <script src="i18n.js"></script>      ← 本檔(次),同步設好 window.FSI18N
//   <script type="module" src="components.js"></script>  ← 或各頁 module(後)
//
// ── 雙軌語言(核心設計)──────────────────────────────────────
//   UI 語言 (uiLang)   : 介面 chrome。header 可即時切換,存 localStorage,免登入亦可切。
//                        → t(key) / applyI18n() / setUILang()
//   報告語言 (reportLang): 命盤術語與解讀內容。鎖定 = 註冊時 preferred_language。
//                        header 切換「絕不」動它、「絕不」重載 glossary。
//                        → td(dict,key) / palaceLabel/starLabel/transformLabel / getReportLang()
//
//   登入者 UI 預設取 preferred_language(seedUILangFromProfile),之後以使用者切換為準。
//   匿名者 UI 預設 en(英文優先)。舊快取 fs_lang 會一次性遷移到 fs_ui_lang。
//
// ── 各頁 UI 字串:共用進本檔、專屬跟各頁(策略 B)──────────────
//   共用 key(nav/footer/共用按鈕/共用錯誤)→ 留在本檔 UI 區,數量有上限、不隨頁面數膨脹。
//   各頁「專屬」key → 不進本檔;由該頁載入時以 window.FSI18N.addUI({...}) 併入。
//   → 本檔不會因頁面變多而爆大;翻譯分散、各頁自維護。
//
// ── 各頁專屬字典「位置索引」(遷一頁登記一筆,下一個人照這查)──────
//   ‣ 共用 UI 字串            → 本檔 UI 區(下方 var UI)
//   ‣ 報告術語(宮位/星曜/四化) → 本檔 RT 區(下方 var RT)
//   ‣ chart.html             → 用本檔共用 key,經該頁 applyStaticI18n(id→key)套用
//   ‣ consultation 四頁       → 字串目前在 consultation-common.js 的 pick(zh,en)
//                              (中/英二分,尚未三語化;待 consultation 專批改用 addUI)
//   ‣ login.html             → 頁內 addUI inline(login.html 的 <head> addUI script)
//   ‣ account-create.html    → 頁內 addUI inline(account-create.html 的 <head> addUI script)
//   ‣ submitted.html         → 頁內 addUI inline(submitted.html 的 <head> addUI script)
//   ── 新頁遷移後,請在此新增一行:<檔名> → <字典所在> ──
//
// ── 新增「頁面」的 i18n(策略 B 步驟)──────────────────────────
//   1) 該頁 <head> 載入 i18n.js 後,呼叫 window.FSI18N.addUI({ 'page.key':{ 'zh-TW':…,'zh-CN':…,'en':… } })。
//   2) DOM 標 data-i18n(textContent)/ data-i18n-html(innerHTML)/ data-i18n-placeholder / -title / -aria-label。
//   3) 字串很多的頁,可獨立成小檔 <page>.i18n.js 再 <script> 引入(內容一樣呼叫 addUI)。
//   4) 回到上方「位置索引」登記一行,讓後人找得到。
//   載入順序:config.js → i18n.js →(該頁 addUI)→ components.js/頁面 module。
//
// ── 新增「語言」──────────────────────────────────────────────
//   SUPPORTED_LANGS 加一項 + UI/RT 各加一個頂層 key + report_glossary 加一 row +
//   components.js header 語言選單加一顆。fallback 鏈自動涵蓋(→en→zh-TW→key)。
// ============================================================
(function () {
  'use strict';

  var SUPPORTED_LANGS   = ['zh-TW', 'zh-CN', 'en'];
  var DEFAULT_UI_LANG   = 'en';        // 匿名 UI 預設(英文優先)
  var DEFAULT_REPORT_LANG = 'zh-TW';   // report 尚未設定前的保底(報告頁一律 setReportLang 覆蓋)
  var UI_LANG_KEY       = 'fs_ui_lang';
  var LEGACY_LANG_KEY   = 'fs_lang';   // 舊單軌快取 → 遷移用

  // ── UI 字典(可切,依 uiLang)──────────────────────────────
  var UI = {
  "zh-TW": {
    "navDecade": "大限",
    "navConsultation": "單獨問事",
    "navChart": "本命盤",
    "navAnnual": "流年",
    "navMonthly": "流月",
    "navAccount": "帳戶",
    "navSignOut": "登出",
    "footerTagline": "不是預知命運，<br>而是穩健有意識地走向嚮往的生活",
    "footerPrivacy": "隱私政策",
    "footerDisclaimer": "免責聲明",
    "footerContact": "聯絡我們",
    "footerCopySuffix": "紫微斗數",
    "loadingSub": "正在為您展開本命十二宮…",
    "hubTitle": "本命十二宮",
    "hubSub": "點選一宮以閱讀完整內容",
    "ovToHub": "瀏覽全部十二宮 →",
    "palaceSubtitle": "本宮主星 · 輔星 · 四化",
    "sectionPalaceAnalysis": "宮位解析",
    "compHeavenlyStem": "天干",
    "compBranch": "地支",
    "compOpposite": "對宮",
    "compTrines": "三方",
    "emptyNoStar": "(無星)",
    "emptyNoMainStar": "(無主星)",
    "dirIn": "飛入",
    "dirOut": "飛出",
    "energyEmptyIn": "此宮無能量飛入",
    "energyEmptyOut": "此宮無能量飛出",
    "errJobFail": "無法取得您的命盤資料：",
    "errNotReady": "您的命盤尚未完成，請稍候幾分鐘後再回來查看。",
    "errNoPalace": "找不到您命盤的宮位內容。",
    "errLoad": "載入時發生錯誤。",
    "errReportsFail": "無法載入宮位內容：",
    "chipSourceLabel": "來源",
    "chipFlowLabel": "流向",
    "loadingTitle": "載入您的命盤",
    "palaceExplainerLabel": "關於這個宮位",
    "compositionLabel": "結構組成",
    "secInflowTitle": "能量飛入",
    "secOutflowTitle": "能量飛出",
    "secSuggestTitle": "我們的建議",
    "sectionInflowDesc": "<strong>能量飛入</strong>——其他宮位的星曜,以四化的形式流入本宮。代表您的這個領域,正被人生哪些方面<strong>滋養、推動或牽引</strong>。",
    "sectionOutflowDesc": "<strong>能量飛出</strong>——本宮的能量,以四化的形式飛入其他宮位。代表您的這個領域,正在<strong>影響、貢獻或牽引</strong>哪些人生方面。",
    "errTitle": "無法載入命盤",
    "btnBackDashboard": "返回儀表板",
    "ovEyebrow": "總覽",
    "ovTitle": "你的命盤總覽",
    "blockSub1": "你在自己故事裡，是什麼樣的主角。",
    "blockHead2": "我的資源",
    "blockSub2": "你手上有什麼牌——自帶的、與別人能給的。",
    "secLeadLabel": "主角",
    "secStageLabel": "生活核心",
    "secStageSub": "The Stage · 命三方",
    "secGiftLabel": "角色天賦線",
    "secGiftSub": "Innate Kit · 生年四化落點",
    "secAllyLabel": "貴人",
    "secFeedLabel": "後盾",
    "secFeedSub": "Foundation · 飛入助力",
    "legendStage": "句型固定為「以【財】為舞台，由【命】驅動，於【官】展開」，括號內短語取自各宮主星的固定句用詞<span class=\"sp\">|</span>點宮位進該宮完整內容",
    "legendAlly": "依六內六外分欄：貴人星落<span class=\"tg\">內部宮</span>＝自帶特質；落<span class=\"tg\">外部宮</span>＝別人助力<span class=\"sp\">|</span><span class=\"tg\">左輔右弼</span> 整合・左右逢源<span class=\"sp\">|</span><span class=\"tg\">天魁天鉞</span> 提攜・貴氣<span class=\"sp\">|</span><span class=\"tg\">文昌</span> 才學<span class=\"sp\">|</span><span class=\"tg\">文曲</span> 才藝・口才",
    "legendFeed": "<span class=\"tg\">祿</span> 資源・緣分<span class=\"sp\">|</span><span class=\"tg\">權</span> 主導・掌控<span class=\"sp\">|</span><span class=\"tg\">科</span> 名聲・貴氣<span class=\"sp\">|</span>助力合計＝祿＋權＋科 飛入數（依合計排序）",
    "leadThemePrefix": "核心命題（生年化坐命）：",
    "ovStarsLabel": "星曜：",
    "ovLeadFullLink": "{p}完整解析 →",
    "leadLegendPrefix": "個性＝命宮主星於固定詞庫的聚合",
    "ovEmptyLife": "命宮為空宮 · 無主星",
    "stageWealthClause": "以「<b>{x}</b>」為舞台",
    "stageLifeClause": "由「<b>{x}</b>」驅動",
    "stageCareerClause": "於「<b>{x}</b>」中展開",
    "stageJoin": "，",
    "stageEnd": "。",
    "ovStageEmpty": "命三方含空宮，敘述從略",
    "allySelfHeader": "自帶特質 · 內部宮（你本身具備）",
    "allyExtHeader": "外部貴人 · 外部宮（別人會幫你）",
    "allyEmpty": "此盤無貴人星",
    "feedLu": "祿",
    "feedQuan": "權",
    "feedKe": "科",
    "feedSumLabel": "助力",
    "feedEmpty": "無飛入助力"
  },
  "zh-CN": {
    "navDecade": "大限",
    "navConsultation": "单独问事",
    "navChart": "本命盘",
    "navAnnual": "流年",
    "navMonthly": "流月",
    "navAccount": "账户",
    "navSignOut": "登出",
    "footerTagline": "不是预知命运，<br>而是稳健有意识地走向向往的生活",
    "footerPrivacy": "隐私政策",
    "footerDisclaimer": "免责声明",
    "footerContact": "联系我们",
    "footerCopySuffix": "紫微斗数",
    "loadingSub": "正在为您展开本命十二宫…",
    "hubTitle": "本命十二宫",
    "hubSub": "点选一宫以阅读完整内容",
    "ovToHub": "浏览全部十二宫 →",
    "palaceSubtitle": "本宫主星 · 辅星 · 四化",
    "sectionPalaceAnalysis": "宫位解析",
    "compHeavenlyStem": "天干",
    "compBranch": "地支",
    "compOpposite": "对宫",
    "compTrines": "三方",
    "emptyNoStar": "(无星)",
    "emptyNoMainStar": "(无主星)",
    "dirIn": "飞入",
    "dirOut": "飞出",
    "energyEmptyIn": "此宫无能量飞入",
    "energyEmptyOut": "此宫无能量飞出",
    "errJobFail": "无法取得您的命盘资料：",
    "errNotReady": "您的命盘尚未完成，请稍候几分钟后再回来查看。",
    "errNoPalace": "找不到您命盘的宫位内容。",
    "errLoad": "载入时发生错误。",
    "errReportsFail": "无法载入宫位内容：",
    "chipSourceLabel": "来源",
    "chipFlowLabel": "流向",
    "loadingTitle": "载入您的命盘",
    "palaceExplainerLabel": "关于这个宫位",
    "compositionLabel": "结构组成",
    "secInflowTitle": "能量飞入",
    "secOutflowTitle": "能量飞出",
    "secSuggestTitle": "我们的建议",
    "sectionInflowDesc": "<strong>能量飞入</strong>——其他宫位的星曜,以四化的形式流入本宫。代表您的这个领域,正被人生哪些方面<strong>滋养、推动或牵引</strong>。",
    "sectionOutflowDesc": "<strong>能量飞出</strong>——本宫的能量,以四化的形式飞入其他宫位。代表您的这个领域,正在<strong>影响、贡献或牵引</strong>哪些人生方面。",
    "errTitle": "无法载入命盘",
    "btnBackDashboard": "返回仪表板",
    "ovEyebrow": "总览",
    "ovTitle": "你的命盘总览",
    "blockSub1": "你在自己故事里，是什么样的主角。",
    "blockHead2": "我的资源",
    "blockSub2": "你手上有什么牌——自带的、与别人能给的。",
    "secLeadLabel": "主角",
    "secStageLabel": "生活核心",
    "secStageSub": "The Stage · 命三方",
    "secGiftLabel": "角色天赋线",
    "secGiftSub": "Innate Kit · 生年四化落点",
    "secAllyLabel": "贵人",
    "secFeedLabel": "后盾",
    "secFeedSub": "Foundation · 飞入助力",
    "legendStage": "句型固定为「以【财】为舞台，由【命】驱动，于【官】展开」，括号内短语取自各宫主星的固定句用词<span class=\"sp\">|</span>点宫位进该宫完整内容",
    "legendAlly": "依六内六外分栏：贵人星落<span class=\"tg\">内部宫</span>＝自带特质；落<span class=\"tg\">外部宫</span>＝别人助力<span class=\"sp\">|</span><span class=\"tg\">左辅右弼</span> 整合・左右逢源<span class=\"sp\">|</span><span class=\"tg\">天魁天钺</span> 提携・贵气<span class=\"sp\">|</span><span class=\"tg\">文昌</span> 才学<span class=\"sp\">|</span><span class=\"tg\">文曲</span> 才艺・口才",
    "legendFeed": "<span class=\"tg\">禄</span> 资源・缘分<span class=\"sp\">|</span><span class=\"tg\">权</span> 主导・掌控<span class=\"sp\">|</span><span class=\"tg\">科</span> 名声・贵气<span class=\"sp\">|</span>助力合计＝禄＋权＋科 飞入数（依合计排序）",
    "leadThemePrefix": "核心命题（生年化坐命）：",
    "ovStarsLabel": "星曜：",
    "ovLeadFullLink": "{p}完整解析 →",
    "leadLegendPrefix": "个性＝命宫主星于固定词库的聚合",
    "ovEmptyLife": "命宫为空宫 · 无主星",
    "stageWealthClause": "以「<b>{x}</b>」为舞台",
    "stageLifeClause": "由「<b>{x}</b>」驱动",
    "stageCareerClause": "于「<b>{x}</b>」中展开",
    "stageJoin": "，",
    "stageEnd": "。",
    "ovStageEmpty": "命三方含空宫，叙述从略",
    "allySelfHeader": "自带特质 · 内部宫（你本身具备）",
    "allyExtHeader": "外部贵人 · 外部宫（别人会帮你）",
    "allyEmpty": "此盘无贵人星",
    "feedLu": "禄",
    "feedQuan": "权",
    "feedKe": "科",
    "feedSumLabel": "助力",
    "feedEmpty": "无飞入助力"
  },
  "en": {
    "navDecade": "Decade",
    "navConsultation": "Consultation",
    "navChart": "Natal",
    "navAnnual": "Annual",
    "navMonthly": "Monthly",
    "navAccount": "Account",
    "navSignOut": "Sign out",
    "footerTagline": "Not foreseeing fate, but moving<br>steadily and consciously toward the life you long for.",
    "footerPrivacy": "Privacy",
    "footerDisclaimer": "Disclaimer",
    "footerContact": "Contact",
    "footerCopySuffix": "Zi Wei Dou Shu",
    "loadingSub": "Opening your twelve natal palaces…",
    "hubTitle": "The Twelve Palaces",
    "hubSub": "Tap a palace to read its full reading",
    "ovToHub": "Browse all twelve palaces →",
    "palaceSubtitle": "Main stars · Support stars · Transformations",
    "sectionPalaceAnalysis": "Palace Reading",
    "compHeavenlyStem": "Heavenly Stem",
    "compBranch": "Earthly Branch",
    "compOpposite": "Opposite Palace",
    "compTrines": "Trines",
    "emptyNoStar": "(no stars)",
    "emptyNoMainStar": "(no main star)",
    "dirIn": "Incoming",
    "dirOut": "Outgoing",
    "energyEmptyIn": "No energy flows into this palace",
    "energyEmptyOut": "No energy flows out of this palace",
    "errJobFail": "Could not load your chart data: ",
    "errNotReady": "Your chart is not ready yet. Please check back in a few minutes.",
    "errNoPalace": "Could not find the palace content for your chart.",
    "errLoad": "Something went wrong while loading.",
    "errReportsFail": "Could not load palace content: ",
    "chipSourceLabel": "From",
    "chipFlowLabel": "To",
    "loadingTitle": "Loading your chart",
    "palaceExplainerLabel": "About this Palace",
    "compositionLabel": "Composition",
    "secInflowTitle": "Inflowing Currents",
    "secOutflowTitle": "Outflowing Currents",
    "secSuggestTitle": "Our Suggestions",
    "sectionInflowDesc": "<strong>Inflowing energy</strong> — stars from other palaces flow into this one through the four transformations, showing which areas of life are <strong>nourishing, driving, or drawing on</strong> this part of you.",
    "sectionOutflowDesc": "<strong>Outflowing energy</strong> — the energy of this palace flows out into others through the four transformations, showing which areas of life this part of you is <strong>shaping, supporting, or drawing toward it</strong>.",
    "errTitle": "Unable to load your chart",
    "btnBackDashboard": "Back to dashboard",
    "ovEyebrow": "Overview",
    "ovTitle": "Your Chart Overview",
    "blockSub1": "What kind of lead are you, in your own story?",
    "blockHead2": "What You Hold",
    "blockSub2": "What cards you hold — your own, and what others can offer.",
    "secLeadLabel": "The Lead",
    "secStageLabel": "Life Core",
    "secStageSub": "The Stage",
    "secGiftLabel": "Innate Gifts",
    "secGiftSub": "Innate Kit",
    "secAllyLabel": "Allies",
    "secFeedLabel": "Backing",
    "secFeedSub": "Foundation",
    "legendStage": "The line reads \"on the stage of [Wealth], driven by [Self], unfolding in [Career]\"; each phrase comes from that palace&#39;s main-star keywords<span class=\"sp\">|</span>tap a palace for its full reading",
    "legendAlly": "Split by inner and outer palaces: ally stars in an <span class=\"tg\">inner palace</span> = traits you carry; in an <span class=\"tg\">outer palace</span> = help from others<span class=\"sp\">|</span><span class=\"tg\">ZuoFu / YouBi</span> integration &amp; support<span class=\"sp\">|</span><span class=\"tg\">TianKui / TianYue</span> mentorship &amp; grace<span class=\"sp\">|</span><span class=\"tg\">WenChang</span> learning<span class=\"sp\">|</span><span class=\"tg\">WenQu</span> talent &amp; eloquence",
    "legendFeed": "<span class=\"tg\">Lu</span> resources &amp; connection<span class=\"sp\">|</span><span class=\"tg\">Quan</span> initiative &amp; control<span class=\"sp\">|</span><span class=\"tg\">Ke</span> reputation &amp; grace<span class=\"sp\">|</span>total = inflowing Lu + Quan + Ke (sorted by total)",
    "leadThemePrefix": "Core theme (innate transformation seated in the Life Palace): ",
    "ovStarsLabel": "Stars: ",
    "ovLeadFullLink": "Full reading of {p} →",
    "leadLegendPrefix": "Personality = the blend of your Life Palace main stars from the fixed lexicon",
    "ovEmptyLife": "The Life Palace is empty · no main star",
    "stageWealthClause": "on the stage of <b>{x}</b>",
    "stageLifeClause": "driven by <b>{x}</b>",
    "stageCareerClause": "unfolding in <b>{x}</b>",
    "stageJoin": ", ",
    "stageEnd": ".",
    "ovStageEmpty": "The Life trinity includes an empty palace; description omitted",
    "allySelfHeader": "Innate traits · inner palaces (you carry these)",
    "allyExtHeader": "Outer allies · outer palaces (others help you)",
    "allyEmpty": "No ally stars in this chart",
    "feedLu": "Lu",
    "feedQuan": "Quan",
    "feedKe": "Ke",
    "feedSumLabel": "Support",
    "feedEmpty": "No inflowing support"
  }
};

  // ── RT 報告術語字典(鎖定,依 reportLang)────────────────────
  var RT = {
  "zh-TW": {
    "TRANSFORM_NAME": {
      "化祿": "化祿",
      "化權": "化權",
      "化科": "化科",
      "化忌": "化忌"
    },
    "PALACE_TAGLINE": {
      "命宮": "本性與內在",
      "兄弟宮": "至親與同輩",
      "夫妻宮": "伴侶與情感",
      "子女宮": "創造與後輩",
      "財帛宮": "財富與資源",
      "疾厄宮": "身體與感受",
      "遷移宮": "外境與機運",
      "交友宮": "朋友與人脈",
      "官祿宮": "事業與舞台",
      "田宅宮": "家庭與基地",
      "福德宮": "心靈與享受",
      "父母宮": "長輩與權威"
    },
    "PALACE_EXPLAINER": {
      "命宮": "命宮代表您的<span class=\"domain-keyword\">核心人格、行事風格與根本姿態</span>——您看待自己與世界的最底層方式。這是您一生的「主舞台」,所有其他宮位的能量,最終都會在這裡匯流、被您詮釋、被您演繹。",
      "兄弟宮": "兄弟宮代表您與<span class=\"domain-keyword\">手足、同輩、母親與密切夥伴</span>的關係,也反映您在團隊、同儕系統中的相處模式與資源往來。",
      "夫妻宮": "夫妻宮代表您的<span class=\"domain-keyword\">親密關係、伴侶互動與情感模式</span>——您如何愛人、如何被愛,以及您在一對一深度關係中的姿態。",
      "子女宮": "子女宮代表您的<span class=\"domain-keyword\">子女、後輩、創造力與性</span>——廣義上是您「孕育出來的事物」,包含作品、學生、晚輩與一切親手栽培之物。",
      "財帛宮": "財帛宮代表您的<span class=\"domain-keyword\">財富、現金流與價值觀</span>——您如何賺取、運用與看待金錢,以及您對「擁有」這件事的態度。",
      "疾厄宮": "疾厄宮代表您的<span class=\"domain-keyword\">身體、健康與情緒體質</span>——您的先天體質傾向、身心的感受方式,以及壓力在身體上的展現。",
      "遷移宮": "遷移宮代表您的<span class=\"domain-keyword\">外在世界、際遇與社會形象</span>——您離開熟悉環境後的際遇、在外的機運,以及他人眼中的您。它是命宮的對宮,映照您的另一面。",
      "交友宮": "交友宮代表您的<span class=\"domain-keyword\">朋友、人脈、下屬與社交網絡</span>——您與廣泛人際的互動方式,以及您從社群中獲得或付出的能量。",
      "官祿宮": "官祿宮代表您的<span class=\"domain-keyword\">事業、志向與社會成就</span>——您的工作舞台、專業表現,以及您一生想要建立的功業與位置。",
      "田宅宮": "田宅宮代表您的<span class=\"domain-keyword\">家庭、不動產與安身之所</span>——您的居家環境、家族基地,以及您內心對「歸屬」與「根」的感受。",
      "福德宮": "福德宮代表您的<span class=\"domain-keyword\">精神世界、興趣與享受</span>——您的內在快樂來源、價值信念,以及您靈魂層面的滿足與安頓。",
      "父母宮": "父母宮代表您與<span class=\"domain-keyword\">父母、長輩、權威與庇蔭</span>的關係,也反映您的學養根基、與上位者的相處,以及您所承接的家世背景。"
    },
    "TRANSFORM_TOOLTIP": {
      "化祿": {
        "title": "化祿 · Resource (Lu)",
        "body": "喜悅與緣分增加。能量帶來資源、人脈、順流感與成就的喜悅,是您天生有福、容易順利展開的領域。"
      },
      "化權": {
        "title": "化權 · Anchor (Quan)",
        "body": "權力與掌控。能量賦予您主導感、決策力與影響力,是您天生想要「說了算」、想要為事情負責的領域。"
      },
      "化科": {
        "title": "化科 · Stage (Ke)",
        "body": "名望與被看見。能量讓您在這個領域容易獲得聲譽、肯定與優雅形象,是您天生發光、會被欣賞的舞台。"
      },
      "化忌": {
        "title": "化忌 · Direction (Ji)",
        "body": "不滿足與執著。能量讓您在這個領域反覆投入、深耕、永不饜足。這不是缺憾,而是您一生關注的「核心命題」與成長方向。"
      }
    },
    "SAN_FANG_ROLE": {
      "命宮": "自我",
      "財帛宮": "財",
      "官祿宮": "事業"
    },
    "STAR_LEXICON": {
      "紫微": {
        "kw": [
          "領導",
          "主導",
          "尊貴"
        ],
        "phrase": "領導開拓"
      },
      "天機": {
        "kw": [
          "機巧",
          "善謀",
          "多變"
        ],
        "phrase": "謀略應變"
      },
      "太陽": {
        "kw": [
          "博愛",
          "熱忱",
          "外放"
        ],
        "phrase": "熱忱付出"
      },
      "武曲": {
        "kw": [
          "務實",
          "決斷",
          "重效率"
        ],
        "phrase": "務實果決"
      },
      "天同": {
        "kw": [
          "溫和",
          "享受",
          "隨和"
        ],
        "phrase": "隨和享受"
      },
      "廉貞": {
        "kw": [
          "公關",
          "變通",
          "重情"
        ],
        "phrase": "公關變通"
      },
      "天府": {
        "kw": [
          "穩健",
          "保守",
          "善理財"
        ],
        "phrase": "穩健守成"
      },
      "太陰": {
        "kw": [
          "細膩",
          "內斂",
          "重感受"
        ],
        "phrase": "細膩經營"
      },
      "貪狼": {
        "kw": [
          "多元慾望",
          "好奇",
          "交際"
        ],
        "phrase": "多元慾望"
      },
      "巨門": {
        "kw": [
          "口才",
          "思辨",
          "深究"
        ],
        "phrase": "思辨深究"
      },
      "天相": {
        "kw": [
          "協調",
          "重信",
          "穩重"
        ],
        "phrase": "協調穩重"
      },
      "天梁": {
        "kw": [
          "庇蔭",
          "原則",
          "長者風"
        ],
        "phrase": "庇蔭擔當"
      },
      "七殺": {
        "kw": [
          "衝鋒",
          "獨立",
          "開拓"
        ],
        "phrase": "衝鋒開拓"
      },
      "破軍": {
        "kw": [
          "開創",
          "破舊立新",
          "變動"
        ],
        "phrase": "開創"
      }
    },
    "ALLY_LEXICON": {
      "左輔": {
        "self": "整合資源、左右逢源",
        "ext": "平輩貴人並肩相助"
      },
      "右弼": {
        "self": "整合資源、左右逢源",
        "ext": "平輩貴人並肩相助"
      },
      "天魁": {
        "self": "自帶貴氣與格調",
        "ext": "長輩貴人提攜"
      },
      "天鉞": {
        "self": "易被看見、被提攜的氣場",
        "ext": "長輩貴人提攜"
      },
      "文昌": {
        "self": "才學與條理",
        "ext": "才學文書型助力"
      },
      "文曲": {
        "self": "才藝、口才與感性",
        "ext": "才藝口才型助力"
      }
    },
    "SELF_TRANSFORM_NOTE": {
      "化祿": "天生的順流與福分在「自我」展現。",
      "化權": "天生的主導性落在「自我」。",
      "化科": "天生的名聲與優雅落在「自我」。",
      "化忌": "對「想要更多、想體驗更多」的深耕——自我的核心命題、一生反覆投注的方向。"
    },
    "BIRTH_MEANING": {
      "化祿": "天生福分落點",
      "化權": "天生掌控與課題",
      "化科": "天生名聲落點",
      "化忌": "天生命題・深耕方向"
    }
  },
  "zh-CN": {
    "TRANSFORM_NAME": {
      "化祿": "化禄",
      "化權": "化权",
      "化科": "化科",
      "化忌": "化忌"
    },
    "PALACE_TAGLINE": {
      "命宮": "本性与内在",
      "兄弟宮": "至亲与同辈",
      "夫妻宮": "伴侣与情感",
      "子女宮": "创造与后辈",
      "財帛宮": "财富与资源",
      "疾厄宮": "身体与感受",
      "遷移宮": "外境与机运",
      "交友宮": "朋友与人脉",
      "官祿宮": "事业与舞台",
      "田宅宮": "家庭与基地",
      "福德宮": "心灵与享受",
      "父母宮": "长辈与权威"
    },
    "PALACE_EXPLAINER": {
      "命宮": "命宫代表您的<span class=\"domain-keyword\">核心人格、行事风格与根本姿态</span>——您看待自己与世界的最底层方式。这是您一生的「主舞台」,所有其他宫位的能量,最终都会在这里汇流、被您诠释、被您演绎。",
      "兄弟宮": "兄弟宫代表您与<span class=\"domain-keyword\">手足、同辈、母亲与密切伙伴</span>的关系,也反映您在团队、同侪系统中的相处模式与资源往来。",
      "夫妻宮": "夫妻宫代表您的<span class=\"domain-keyword\">亲密关系、伴侣互动与情感模式</span>——您如何爱人、如何被爱,以及您在一对一深度关系中的姿态。",
      "子女宮": "子女宫代表您的<span class=\"domain-keyword\">子女、后辈、创造力与性</span>——广义上是您「孕育出来的事物」,包含作品、学生、晚辈与一切亲手栽培之物。",
      "財帛宮": "财帛宫代表您的<span class=\"domain-keyword\">财富、现金流与价值观</span>——您如何赚取、运用与看待金钱,以及您对「拥有」这件事的态度。",
      "疾厄宮": "疾厄宫代表您的<span class=\"domain-keyword\">身体、健康与情绪体质</span>——您的先天体质倾向、身心的感受方式,以及压力在身体上的展现。",
      "遷移宮": "迁移宫代表您的<span class=\"domain-keyword\">外在世界、际遇与社会形象</span>——您离开熟悉环境后的际遇、在外的机运,以及他人眼中的您。它是命宫的对宫,映照您的另一面。",
      "交友宮": "交友宫代表您的<span class=\"domain-keyword\">朋友、人脉、下属与社交网络</span>——您与广泛人际的互动方式,以及您从社群中获得或付出的能量。",
      "官祿宮": "官禄宫代表您的<span class=\"domain-keyword\">事业、志向与社会成就</span>——您的工作舞台、专业表现,以及您一生想要建立的功业与位置。",
      "田宅宮": "田宅宫代表您的<span class=\"domain-keyword\">家庭、不动产与安身之所</span>——您的居家环境、家族基地,以及您内心对「归属」与「根」的感受。",
      "福德宮": "福德宫代表您的<span class=\"domain-keyword\">精神世界、兴趣与享受</span>——您的内在快乐来源、价值信念,以及您灵魂层面的满足与安顿。",
      "父母宮": "父母宫代表您与<span class=\"domain-keyword\">父母、长辈、权威与庇荫</span>的关系,也反映您的学养根基、与上位者的相处,以及您所承接的家世背景。"
    },
    "TRANSFORM_TOOLTIP": {
      "化祿": {
        "title": "化禄 · Resource (Lu)",
        "body": "喜悦与缘分增加。能量带来资源、人脉、顺流感与成就的喜悦,是您天生有福、容易顺利展开的领域。"
      },
      "化權": {
        "title": "化权 · Anchor (Quan)",
        "body": "权力与掌控。能量赋予您主导感、决策力与影响力,是您天生想要「说了算」、想要为事情负责的领域。"
      },
      "化科": {
        "title": "化科 · Stage (Ke)",
        "body": "名望与被看见。能量让您在这个领域容易获得声誉、肯定与优雅形象,是您天生发光、会被欣赏的舞台。"
      },
      "化忌": {
        "title": "化忌 · Direction (Ji)",
        "body": "不满足与执着。能量让您在这个领域反复投入、深耕、永不餍足。这不是缺憾,而是您一生关注的「核心命题」与成长方向。"
      }
    },
    "SAN_FANG_ROLE": {
      "命宮": "自我",
      "財帛宮": "财",
      "官祿宮": "事业"
    },
    "STAR_LEXICON": {
      "紫微": {
        "kw": [
          "领导",
          "主导",
          "尊贵"
        ],
        "phrase": "领导开拓"
      },
      "天機": {
        "kw": [
          "机巧",
          "善谋",
          "多变"
        ],
        "phrase": "谋略应变"
      },
      "太陽": {
        "kw": [
          "博爱",
          "热忱",
          "外放"
        ],
        "phrase": "热忱付出"
      },
      "武曲": {
        "kw": [
          "务实",
          "决断",
          "重效率"
        ],
        "phrase": "务实果决"
      },
      "天同": {
        "kw": [
          "温和",
          "享受",
          "随和"
        ],
        "phrase": "随和享受"
      },
      "廉貞": {
        "kw": [
          "公关",
          "变通",
          "重情"
        ],
        "phrase": "公关变通"
      },
      "天府": {
        "kw": [
          "稳健",
          "保守",
          "善理财"
        ],
        "phrase": "稳健守成"
      },
      "太陰": {
        "kw": [
          "细腻",
          "内敛",
          "重感受"
        ],
        "phrase": "细腻经营"
      },
      "貪狼": {
        "kw": [
          "多元欲望",
          "好奇",
          "交际"
        ],
        "phrase": "多元欲望"
      },
      "巨門": {
        "kw": [
          "口才",
          "思辨",
          "深究"
        ],
        "phrase": "思辨深究"
      },
      "天相": {
        "kw": [
          "协调",
          "重信",
          "稳重"
        ],
        "phrase": "协调稳重"
      },
      "天梁": {
        "kw": [
          "庇荫",
          "原则",
          "长者风"
        ],
        "phrase": "庇荫担当"
      },
      "七殺": {
        "kw": [
          "冲锋",
          "独立",
          "开拓"
        ],
        "phrase": "冲锋开拓"
      },
      "破軍": {
        "kw": [
          "开创",
          "破旧立新",
          "变动"
        ],
        "phrase": "开创"
      }
    },
    "ALLY_LEXICON": {
      "左輔": {
        "self": "整合资源、左右逢源",
        "ext": "平辈贵人并肩相助"
      },
      "右弼": {
        "self": "整合资源、左右逢源",
        "ext": "平辈贵人并肩相助"
      },
      "天魁": {
        "self": "自带贵气与格调",
        "ext": "长辈贵人提携"
      },
      "天鉞": {
        "self": "易被看见、被提携的气场",
        "ext": "长辈贵人提携"
      },
      "文昌": {
        "self": "才学与条理",
        "ext": "才学文书型助力"
      },
      "文曲": {
        "self": "才艺、口才与感性",
        "ext": "才艺口才型助力"
      }
    },
    "SELF_TRANSFORM_NOTE": {
      "化祿": "天生的顺流与福分在「自我」展现。",
      "化權": "天生的主导性落在「自我」。",
      "化科": "天生的名声与优雅落在「自我」。",
      "化忌": "对「想要更多、想体验更多」的深耕——自我的核心命题、一生反复投注的方向。"
    },
    "BIRTH_MEANING": {
      "化祿": "天生福分落点",
      "化權": "天生掌控与课题",
      "化科": "天生名声落点",
      "化忌": "天生命题・深耕方向"
    }
  },
  "en": {
    "TRANSFORM_NAME": {
      "化祿": "Lu",
      "化權": "Quan",
      "化科": "Ke",
      "化忌": "Ji"
    },
    "PALACE_TAGLINE": {
      "命宮": "your innate nature",
      "兄弟宮": "siblings & peers",
      "夫妻宮": "partner & love",
      "子女宮": "creation & legacy",
      "財帛宮": "wealth & resources",
      "疾厄宮": "body & feeling",
      "遷移宮": "outer world",
      "交友宮": "friends & network",
      "官祿宮": "career & stage",
      "田宅宮": "home & ground",
      "福德宮": "spirit & joy",
      "父母宮": "parents & authority"
    },
    "PALACE_EXPLAINER": {
      "命宮": "This palace represents your <span class=\"domain-keyword\">core personality, way of acting, and fundamental stance</span> — the deepest way you see yourself and the world. It is the main stage of your life, where the energy of every other palace ultimately converges, to be interpreted and performed by you.",
      "兄弟宮": "This palace represents your relationships with <span class=\"domain-keyword\">siblings, peers, your mother, and close companions</span>, and reflects how you relate and share resources within teams and peer groups.",
      "夫妻宮": "This palace represents your <span class=\"domain-keyword\">intimate relationships, partner dynamics, and emotional patterns</span> — how you love and are loved, and how you carry yourself in close one-to-one bonds.",
      "子女宮": "This palace represents your <span class=\"domain-keyword\">children, juniors, creativity, and sexuality</span> — broadly, all that you bring into being: your work, students, those you mentor, and everything you nurture by hand.",
      "財帛宮": "This palace represents your <span class=\"domain-keyword\">wealth, cash flow, and values</span> — how you earn, use, and regard money, and your attitude toward having and owning.",
      "疾厄宮": "This palace represents your <span class=\"domain-keyword\">body, health, and emotional constitution</span> — your innate physical tendencies, how you sense in body and mind, and how stress shows up physically.",
      "遷移宮": "This palace represents your <span class=\"domain-keyword\">outer world, encounters, and social image</span> — what you meet beyond familiar ground, your fortune away from home, and how others see you. As the palace opposite the Life Palace, it mirrors your other side.",
      "交友宮": "This palace represents your <span class=\"domain-keyword\">friends, network, subordinates, and social circles</span> — how you engage across wider relationships, and the energy you draw from and give to your communities.",
      "官祿宮": "This palace represents your <span class=\"domain-keyword\">career, ambition, and social achievement</span> — your working stage, professional expression, and the body of work and standing you wish to build over a lifetime.",
      "田宅宮": "This palace represents your <span class=\"domain-keyword\">family, property, and place of belonging</span> — your living environment, your family base, and your inner sense of roots and belonging.",
      "福德宮": "This palace represents your <span class=\"domain-keyword\">inner world, interests, and enjoyment</span> — the sources of your inner joy, your beliefs and values, and the contentment you find at the level of the soul.",
      "父母宮": "This palace represents your relationship with <span class=\"domain-keyword\">parents, elders, authority, and protection</span>, and reflects your foundation of learning, how you relate to those above you, and the family background you inherit."
    },
    "TRANSFORM_TOOLTIP": {
      "化祿": {
        "title": "Resource (Lu)",
        "body": "Joy and connection increase. This energy brings resources, people, flow, and the pleasure of achievement — an area where you are naturally fortunate and things tend to open up with ease."
      },
      "化權": {
        "title": "Anchor (Quan)",
        "body": "Power and control. This energy gives you leadership, decisiveness, and influence — an area where you naturally want the final say and to take responsibility."
      },
      "化科": {
        "title": "Stage (Ke)",
        "body": "Reputation and being seen. This energy helps you gain recognition, esteem, and a graceful presence here — a stage where you naturally shine and are appreciated."
      },
      "化忌": {
        "title": "Direction (Ji)",
        "body": "Yearning and devotion. This energy draws you to return to this area again and again, deepening, never quite satisfied. Not a flaw, but the core theme and direction of growth you attend to all your life."
      }
    },
    "SAN_FANG_ROLE": {
      "命宮": "Self",
      "財帛宮": "Wealth",
      "官祿宮": "Career"
    },
    "STAR_LEXICON": {
      "紫微": {
        "kw": [
          "Leadership",
          "Authority",
          "Nobility"
        ],
        "phrase": "leadership & initiative"
      },
      "天機": {
        "kw": [
          "Ingenuity",
          "Strategy",
          "Versatility"
        ],
        "phrase": "strategy & adaptation"
      },
      "太陽": {
        "kw": [
          "Generosity",
          "Warmth",
          "Outward energy"
        ],
        "phrase": "warm devotion"
      },
      "武曲": {
        "kw": [
          "Pragmatism",
          "Decisiveness",
          "Efficiency"
        ],
        "phrase": "pragmatic resolve"
      },
      "天同": {
        "kw": [
          "Gentleness",
          "Enjoyment",
          "Ease"
        ],
        "phrase": "easygoing enjoyment"
      },
      "廉貞": {
        "kw": [
          "Charisma",
          "Adaptability",
          "Feeling"
        ],
        "phrase": "charm & adaptability"
      },
      "天府": {
        "kw": [
          "Steadiness",
          "Prudence",
          "Stewardship"
        ],
        "phrase": "steady stewardship"
      },
      "太陰": {
        "kw": [
          "Sensitivity",
          "Reserve",
          "Feeling"
        ],
        "phrase": "careful cultivation"
      },
      "貪狼": {
        "kw": [
          "Many desires",
          "Curiosity",
          "Sociability"
        ],
        "phrase": "wide-ranging desire"
      },
      "巨門": {
        "kw": [
          "Eloquence",
          "Reasoning",
          "Depth"
        ],
        "phrase": "probing analysis"
      },
      "天相": {
        "kw": [
          "Coordination",
          "Trust",
          "Composure"
        ],
        "phrase": "steady coordination"
      },
      "天梁": {
        "kw": [
          "Protection",
          "Principle",
          "Elder presence"
        ],
        "phrase": "protective duty"
      },
      "七殺": {
        "kw": [
          "Drive",
          "Independence",
          "Pioneering"
        ],
        "phrase": "charging ahead"
      },
      "破軍": {
        "kw": [
          "Innovation",
          "Renewal",
          "Change"
        ],
        "phrase": "breaking new ground"
      }
    },
    "ALLY_LEXICON": {
      "左輔": {
        "self": "integrating resources, support all around",
        "ext": "peers who help shoulder to shoulder"
      },
      "右弼": {
        "self": "integrating resources, support all around",
        "ext": "peers who help shoulder to shoulder"
      },
      "天魁": {
        "self": "innate distinction and grace",
        "ext": "mentorship from elders"
      },
      "天鉞": {
        "self": "a presence that gets noticed and lifted up",
        "ext": "mentorship from elders"
      },
      "文昌": {
        "self": "learning and structure",
        "ext": "help through scholarship and paperwork"
      },
      "文曲": {
        "self": "artistry, eloquence, and feeling",
        "ext": "help through talent and eloquence"
      }
    },
    "SELF_TRANSFORM_NOTE": {
      "化祿": "Innate flow and fortune express through the self.",
      "化權": "Innate authority settles on the self.",
      "化科": "Innate reputation and grace settle on the self.",
      "化忌": "A deep pull toward wanting and experiencing more — the core theme of the self, the direction you return to throughout life."
    },
    "BIRTH_MEANING": {
      "化祿": "where innate fortune lands",
      "化權": "innate control & challenge",
      "化科": "where innate reputation lands",
      "化忌": "innate theme · direction of depth"
    }
  }
};

  // ── 狀態 ────────────────────────────────────────────────────
  var _uiLang     = DEFAULT_UI_LANG;
  var _reportLang = DEFAULT_REPORT_LANG;
  var _glossary   = null;   // { palaces:{}, stars:{}, transforms:{} } 由報告頁注入
  var _uiExplicit = false;  // 使用者是否已明確選過 UI 語言(localStorage 有值)

  // ── 小工具 ──────────────────────────────────────────────────
  function isValid(l) { return SUPPORTED_LANGS.indexOf(l) !== -1; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (_) {} }
  function setDocLang(l) { try { document.documentElement.lang = l; } catch (_) {} }
  function fire() {
    try {
      window.dispatchEvent(new CustomEvent('i18n:changed', {
        detail: { uiLang: _uiLang, reportLang: _reportLang }
      }));
    } catch (_) {}
  }

  // ── UI 語言解析(同步,無 DB):?lang= > fs_ui_lang > 遷移 fs_lang > 預設 ──
  function resolveInitialUILang() {
    try {
      var u = new URLSearchParams(location.search).get('lang');   // QA 覆寫(只動 UI)
      if (u && isValid(u)) { lsSet(UI_LANG_KEY, u); _uiExplicit = true; return u; }
    } catch (_) {}
    var cur = lsGet(UI_LANG_KEY);
    if (cur && isValid(cur)) { _uiExplicit = true; return cur; }
    var legacy = lsGet(LEGACY_LANG_KEY);                          // 一次性遷移
    if (legacy && isValid(legacy)) { lsSet(UI_LANG_KEY, legacy); lsDel(LEGACY_LANG_KEY); _uiExplicit = true; return legacy; }
    _uiExplicit = false;                                          // 未明選 → 可被 profile 採用
    return DEFAULT_UI_LANG;
  }

  // ── 字串存取 ────────────────────────────────────────────────
  // UI:uiLang → en → zh-TW → key(缺 key 回傳 key 本身,明顯可見)
  function t(key) {
    var chain = [_uiLang, 'en', 'zh-TW'];
    for (var i = 0; i < chain.length; i++) {
      var d = UI[chain[i]];
      if (d && d[key] !== undefined) return d[key];
    }
    return key;
  }
  // RT 巢狀:reportLang → en → zh-TW(缺回 '',交由呼叫端 fallback)
  function td(dict, key) {
    var chain = [_reportLang, 'en', 'zh-TW'];
    for (var i = 0; i < chain.length; i++) {
      var d = RT[chain[i]] && RT[chain[i]][dict];
      if (d && d[key] !== undefined) return d[key];
    }
    return '';
  }

  // ── 報告 glossary(星曜/宮位名 DB 對照,由 components.loadReportGlossary 注入)──
  function setGlossary(g) { _glossary = g || null; }
  function palaceLabel(zh) { return (_glossary && _glossary.palaces && _glossary.palaces[zh]) || zh; }
  function starLabel(zh)   { return (_glossary && _glossary.stars   && _glossary.stars[zh])   || zh; }
  function transformLabel(zh) {
    var localized = td('TRANSFORM_NAME', zh);
    if (localized) return localized;
    var code = _glossary && _glossary.transforms && _glossary.transforms[zh] && _glossary.transforms[zh].code;
    return code || zh;
  }

  // ── DOM 掃描套用(只動 UI 字串;報告內容由各頁 JS 自行 render,不經此)──
  function applyI18n(root) {
    root = root || document;
    var nodes = root.querySelectorAll(
      '[data-i18n],[data-i18n-html],[data-i18n-placeholder],[data-i18n-title],[data-i18n-aria-label]'
    );
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], k;
      if ((k = el.getAttribute('data-i18n')) !== null && k !== '')             el.textContent = t(k);
      if ((k = el.getAttribute('data-i18n-html')) !== null && k !== '')        el.innerHTML   = t(k);
      if ((k = el.getAttribute('data-i18n-placeholder')) !== null && k !== '') el.setAttribute('placeholder', t(k));
      if ((k = el.getAttribute('data-i18n-title')) !== null && k !== '')       el.setAttribute('title', t(k));
      if ((k = el.getAttribute('data-i18n-aria-label')) !== null && k !== '')  el.setAttribute('aria-label', t(k));
    }
  }

  // ── 語言 getter / setter ────────────────────────────────────
  function getUILang()     { return _uiLang; }
  function getReportLang() { return _reportLang; }

  // header 切換 UI:寫快取 → 重掃 DOM → 派事件(絕不碰 report / glossary)
  function setUILang(lang) {
    if (!isValid(lang)) return;
    _uiLang = lang;
    _uiExplicit = true;
    lsSet(UI_LANG_KEY, lang);
    setDocLang(lang);
    applyI18n(document);
    fire();
  }

  // 報告頁設定鎖定語言(來自 preferred_language)
  function setReportLang(lang) {
    if (!isValid(lang)) return;
    _reportLang = lang;
    setDocLang(lang);
  }

  // 登入者:若使用者「未曾明選」UI 語言 → 採用 profile 語言(不寫快取,維持 profile 驅動)
  function seedUILangFromProfile(lang) {
    if (_uiExplicit) return;
    if (!isValid(lang) || lang === _uiLang) return;
    _uiLang = lang;
    setDocLang(lang);
    applyI18n(document);
    fire();
  }

  // ── 各頁專屬 UI 字典併入(策略 B)────────────────────────────
  //   dict = { 'page.key': { 'zh-TW':…, 'zh-CN':…, 'en':… }, … }
  //   純合併進記憶體 UI 字典(同 key 後者覆蓋);不自動套 DOM。
  //   標準用法:頁面 <head> 載入 i18n.js 後直接呼叫 → 首次渲染由 DOMContentLoaded 的
  //   applyI18n 負責;切換語言由 setUILang 重掃。若在 DOM 已渲染後才 addUI,請自行再
  //   呼叫 window.FSI18N.applyI18n() 套用。
  function addUI(dict) {
    if (!dict) return;
    for (var key in dict) {
      if (!Object.prototype.hasOwnProperty.call(dict, key)) continue;
      var per = dict[key];
      if (!per) continue;
      for (var i = 0; i < SUPPORTED_LANGS.length; i++) {
        var L = SUPPORTED_LANGS[i];
        if (per[L] !== undefined) {
          if (!UI[L]) UI[L] = {};
          UI[L][key] = per[L];
        }
      }
    }
  }

  // ── 初始化(同步設好 uiLang;DOM ready 後首次套用)──────────────
  _uiLang = resolveInitialUILang();
  setDocLang(_uiLang);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { applyI18n(document); });
  } else {
    applyI18n(document);
  }

  // ── 對外 API ────────────────────────────────────────────────
  window.FSI18N = {
    SUPPORTED_LANGS: SUPPORTED_LANGS,
    t: t,
    td: td,
    getUILang: getUILang,
    setUILang: setUILang,
    getReportLang: getReportLang,
    setReportLang: setReportLang,
    getLang: getReportLang,               // 別名:chart.html 報告內容分隔符判斷用
    addUI: addUI,                         // 各頁專屬 UI 字典併入(策略 B)
    seedUILangFromProfile: seedUILangFromProfile,
    setGlossary: setGlossary,
    palaceLabel: palaceLabel,
    starLabel: starLabel,
    transformLabel: transformLabel,
    applyI18n: applyI18n
  };
})();
