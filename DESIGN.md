# FuSang Vision — 設計系統 (DESIGN.md)

> 視覺方向：現代東方禪意 (Modern Oriental / Zen) + 療癒極簡
> 核心母題：扶桑晨曦 = 旭日晨光。淡青綠山水底蘊 + 一抹旭日暖光。
> 原則：換皮不動結構。保留現有版面與資訊架構，只更新視覺 + RWD。

## 1. 視覺母題
- 貫穿全站意象：晨霧中透出的微光 —— 淡青綠水彩底 + 柔和旭日暖光點綴。
- 呼應品牌名「晨曦」，傳達希望、療癒、東方底蘊、現代可信。
- 氛圍關鍵字：禪意、寧靜、療癒、通透、優雅、留白。

## 2. 色彩 Token
背景（避免死白，溫潤）
- --bg-primary: #faf7f1   /* 暖米白主背景 */
- --bg-card:    #ffffff   /* 卡片白 */
- --bg-soft:    #f4efe6   /* 柔米色區塊 */
- --bg-soft-2:  #f0ebe0   /* 次柔區塊 */
- --paper-texture: 可選細微紙張紋理（低透明度 overlay，非必要）

主色（療癒青綠 / 墨綠）
- --ink-darkest: #15363a  /* 最深墨綠，主文字/深色按鈕 */
- --accent-deep: #1d4a4f  /* 深青綠，強調 */
- --accent-soft: #3a6b70  /* 柔青綠，次強調/hover */
- --accent-pale: #cddad9  /* 淡青綠，邊框/淡背景 */
- --wash-teal:   #e8f0ee  /* 水彩暈染淡青綠底（CSS 漸層用） */

點綴（收斂，只兩個）
- --gold:    #b8945c   /* 主點綴金，常規精緻細節（延續品牌） */
- --dawn:    #e0a878   /* 晨曦旭日暖橘，僅用於溫暖時刻：歡迎/完成/慶祝 */

文字
- --ink-dark:  #2b3d3f
- --ink-mid:   #5e6f70
- --ink-light: #97a3a3
- --rule:      #e3dccf  /* 分隔線 */

語意
- --error: #a8453a

## 3. 字體 (沿用現有，已符合方向)
- 標題 Serif（優雅纖細）：'Cormorant Garamond'
- 中文 Serif：'Noto Serif TC'
- 內文 Sans（乾淨現代高可讀）：'Inter'
- 字級階層（建議基準）：
  - H1 頁面主標 32–42px / Serif / 字距 0.06–0.1em
  - H2 區塊標 22–28px / Serif
  - H3 小標 18–20px
  - Body 15–16px / Sans / line-height 1.7–2
  - Caption/label 11–13px / Sans / 字距 0.05em

## 4. 排版原則 (關鍵)
居中 vs 左對齊 —— 依內容性質，不可全站居中：
- **居中**：訴求型頁面/區塊（landing、intro、CTA、訂閱訴求、空狀態、載入）
- **左對齊**：閱讀型內容（報告內文 A/B/C/D、列表、表單、資料表、admin）
留白：大量負空間，區塊間距寬鬆（區塊 margin 48–80px），讓視覺有呼吸感。

## 5. 元件規範
按鈕
- 主按鈕：深墨綠底 (--ink-darkest) + 米白字，細圓角 (radius 2–4px)，字距寬 (0.15–0.28em)，hover 轉 --accent-deep
- 次按鈕/線框按鈕：透明底 + 細線邊框 (1px --rule 或 --accent-soft) + 圓角，禪意細線條風格
- 避免厚重陰影；hover 用輕微上移 + 極淡陰影

卡片
- 白底 + 1px --rule 邊框 + 細圓角，hover 邊框轉 --accent-soft + translateY(-2px) + 極淡陰影
- 可選：左側細金線 (--gold 漸層) 作精緻點綴（延續現有 intro-offer 風格）

輸入框
- 白底 + 1px --rule + 圓角，focus 邊框 --accent-soft，無粗描邊

分隔/裝飾
- 細線分隔 (--rule)
- 東方點綴：細飾線 + 圓點 ornament（現有 intro-ornament 風格可保留精緻化）

## 6. 水彩 / 暈染使用規則
- **克制原則**：水彩是點綴不是壁紙，不鋪滿全頁。
- **功能頁（login/dashboard/報告/表單）**：用 CSS 漸層模擬淡青綠晨曦暈染即可（--wash-teal → transparent 徑向/線性漸層），輕量、RWD 友善，不放圖。
- **訴求頁（landing/hero，未來）**：可放真水彩圖（WebP，晨曦青綠山水意象）。
- **疊字可讀性**：水彩/暈染上放文字時，須確保對比足夠——加半透明遮罩或限制暈染在非文字區。
- **RWD**：手機不載入桌機大圖；用裁切版或純漸層退化。

## 7. RWD 斷點 (手機 + 桌機為主)
- Mobile: max-width 640px
- Desktop: 641px+
- （平板落在 desktop 規則內自適應，不特別細做）
原則：
- 手機不橫向捲動、觸控目標 ≥ 44px、多欄 grid 在手機堆疊為單欄
- 字級手機略縮（H1 42→32、內文維持可讀）
- header 導航 + 語言切換：手機收合（漢堡或精簡）
- 資料表/命盤 grid：手機改卡片堆疊或可捲動
- 因多語言已上線，RWD 須對「最長語言版本（通常英文）」測不破版


- ## 8. 文字處理原則
- 本視覺改版【只重組版型、不動內文】。頁面現有文字/資訊沿用現狀，不加/刪/改字。
- 需要新增或移除文案時，停下來與 owner 討論，確認後由 owner 走 i18n 正規流程補三語。
- UI 改版不應動 i18n.js（除非 owner 明確同意）。
- 禁用戲劇隱喻詞（演/角色/劇本）—— 但既有文案已符合，此為新增文字時才需注意。
- 

## 9. 執行方式
- 逐頁執行，一頁定案再下一頁
- 起手範本頁：login → dashboard（定調後成為其他頁視覺範本）
- design tokens 集中在 components.js（全站生效）；單頁 layout 改該頁 style
