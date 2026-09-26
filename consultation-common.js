// ============================================================
// FuSang Vision — Consultation Common（單獨問事共用層）
//
// 用法（每個問事頁面）：
//   <div id="site-header"></div>
//   <div id="consult-nav"></div>
//   <div class="fs-page"> ... </div>
//   <div id="site-footer"></div>
//   <script type="module">
//     import { initConsult, ... } from './consultation-common.js';
//     (async () => {
//       const session = await initConsult('form');   // 頁鍵：home|form|list|detail
//       if (!session) return;
//       // ... 頁面專屬邏輯 ...
//     })();
//   </script>
//
// 提供：共用常數 / 語言 / 標籤 / 狀態判定 / 資料查詢 / HTML 片段 /
//       錯誤對應 / 共用 CSS 注入 / 頁內導覽 / initConsult()
//
// 改共用邏輯或樣式 → 只改這個檔，四頁生效
// ============================================================

import { supabase, requireAuth, startCheckout } from './components.js';
export { supabase, requireAuth, startCheckout };

/* ── 常數 ── */
export const PRICE_LABEL = 'US$49.90';
export const FOLLOWUP_DAYS = 7;
export const AVATAR = 'https://fusang-vision.com/cdn/shop/files/ruei-syuan.jpg?v=1756331083&width=1500';
export const SIGNER = 'RS Chen';

/* ── 語言（沿用元件快取；只切換靜態標籤：中/英）── */
export const LANG = (() => {
  try { const L = window.FSI18N && window.FSI18N.getUILang && window.FSI18N.getUILang(); if (L) return L; } catch (_) {}
  try { const c = localStorage.getItem('fs_ui_lang'); if (c) return c; } catch (_) {}
  return 'zh-TW';
})();
export const isZh = LANG.startsWith('zh');
export const isCN = LANG === 'zh-CN';
// 動態讀取當前 uiLang（支援即時語言切換：切換後由各頁重繪即取到新值）
export function getLang() {
  try { const L = window.FSI18N && window.FSI18N.getUILang && window.FSI18N.getUILang(); if (L) return L; } catch (_) {}
  try { const c = localStorage.getItem('fs_ui_lang'); if (c) return c; } catch (_) {}
  return 'zh-TW';
}
// ── 日語（ja，2026-09 第四語言）對照表 ────────────────────────────
//   以 pick() 的第一個參數（繁中原文）為 key；pick 呼叫端不需改動。
//   ⚠ 修改任何 pick() 的繁中原文時，這裡的 key 必須同步修改，
//     否則 ja 會查不到而退回英文（console 會印 [i18n] 缺譯警告，不會靜默）。
//   術語（命盤/流年/紫微斗数…）沿用漢字（日本新字体）。韓語見下方 KO 表。
const JA = {
  '待付款': 'お支払い待ち',
  '已付款・等待回覆': 'お支払い済み・回答待ち',
  '已回覆': '回答済み',
  '追問中・等待回覆': '追加質問中・回答待ち',
  '已結案': '終了',
  '已關閉': '終了',
  '你已有一則進行中的諮詢，請先完成後再提交新問題。': '進行中の相談がすでにあります。完了してから、新しい質問を送信してください。',
  '找不到你的命盤，請先回儀表板生成。': '命盤が見つかりません。先にダッシュボードから作成してください。',
  '請選擇一個主題。': 'テーマを選んでください。',
  '請填寫你的問題內容。': 'ご質問の内容をお書きください。',
  '登入狀態已失效，請重新登入。': 'ログインの有効期限が切れました。もう一度ログインしてください。',
  '提交時發生問題，請稍後再試。': '送信中に問題が発生しました。しばらくしてから再度お試しください。',
  '這筆諮詢已付款或狀態已變更。': 'この相談はすでにお支払い済みか、状態が変更されています。',
  '找不到對應的諮詢，請重新提交。': '該当する相談が見つかりません。もう一度送信してください。',
  '提交資料不完整，請重試。': '送信内容が不完全です。もう一度お試しください。',
  '前往付款時發生問題，請稍後再試。': 'お支払いへの移動中に問題が発生しました。しばらくしてから再度お試しください。',
  '每則諮詢僅能追問一次。': '追加質問は、1件の相談につき1回までです。',
  '追問期限已過，諮詢已結案。': '追加質問の期限が過ぎたため、相談は終了しました。',
  '目前無法追問。': '現在、追加質問はできません。',
  '找不到這則諮詢。': 'この相談が見つかりません。',
  '請填寫追問內容。': '追加質問の内容をお書きください。',
  '送出追問時發生問題，請稍後再試。': '追加質問の送信中に問題が発生しました。しばらくしてから再度お試しください。',
  '目前無法結案。': '現在、相談を終了できません。',
  '結案時發生問題，請稍後再試。': '終了処理中に問題が発生しました。しばらくしてから再度お試しください。',
  '這則諮詢已回饋過。': 'この相談には、すでにフィードバックをいただいています。',
  '目前無法回饋。': '現在、フィードバックはできません。',
  '請選擇一個選項。': '選択肢を1つ選んでください。',
  '送出回饋時發生問題，請稍後再試。': 'フィードバックの送信中に問題が発生しました。しばらくしてから再度お試しください。',
  '提交問事': '個別相談を申し込む',
  '問事首頁': '個別相談トップ',
  '我的問事紀錄': '個別相談の履歴',
  '諮詢細節': '相談の詳細',
  '即將推出': '近日公開',
  '單獨問事即將推出': '個別相談は近日公開予定です',
  '單獨問事目前尚未開放，即將推出。': '個別相談はまだ受付を開始していません。近日公開予定です。',
  '單獨問事 - FuSang Vision': '個別相談 - FuSang Vision',
  '單獨問事': '個別相談',
  '一個真正重要的問題，由真人為你解盤。': '本当に大切なひとつの問いに、人があなたの命盤を読み解きます。',
  '當你有一個真正重要、想要被慎重對待的問題，單獨問事是為你一個人準備的一次解讀。': '本当に大切で、丁寧に向き合ってほしい問いがあるとき。個別相談は、あなたひとりのために用意する一度きりの解読です。',
  '服務特色': 'サービスの特長',
  '單次問事費用': '相談1回の料金',
  '由 R.S. Chen 親自解讀你的命盤': 'R.S. Chen があなたの命盤を直接読み解きます',
  '針對你的問題個別撰寫的書面回覆': 'ご質問に合わせて個別に書き下ろす書面回答',
  '收到回覆後 7 天內可追問一次': '回答の受け取りから7日以内に、追加質問が1回できます',
  '品牌故事': 'ブランドストーリー',
  '探索你的內在天賦': 'あなたの内なる才能を探る',
  '將東方智慧，帶入你真正嚮往的現代生活。': '東洋の知恵を、あなたが本当に望む現代の暮らしへ。',
  '問事者怎麼說': 'ご相談者の声',
  '以下是先前一對一解讀的真實回饋，依原文刊出。': '以下は、これまでの一対一の解読に寄せられた実際の感想です（中国語の原文を翻訳して掲載しています）。',
  '一對一解讀回饋': '一対一の解読への感想',
  '創辦人的話 — R.S. Chen（Ben）': '創業者より — R.S. Chen（Ben）',
  '我是 R.S. Chen，大家都叫我 Ben。我先以一對一的方式為人解讀命盤；之後推出線上的「命財官解析」，至今已有 300 多位使用者。': 'R.S. Chen です。みなさんには Ben と呼ばれています。はじめは一対一で命盤を読み解き、その後オンラインの「命財官解析」を公開して、これまでに300人以上の方にご利用いただいています。',
  '自我探索': '自己探求',
  '勇氣': '勇気',
  '清晰': '明晰',
  '如實': '誠実',
  '查看進行中的諮詢': '進行中の相談を見る',
  '提交新的問事': '新しい相談を申し込む',
  '你目前有一則進行中的諮詢。同一時間僅能進行一則。': '現在、進行中の相談が1件あります。同時に進められる相談は1件までです。',
  '提交問事 - FuSang Vision': '個別相談を申し込む - FuSang Vision',
  '尚無命盤': '命盤がまだありません',
  '單獨問事需先有你的命盤。請先回到儀表板生成命盤，完成後再回來提交問題。': '個別相談には、まずあなたの命盤が必要です。ダッシュボードで命盤を作成してから、戻って質問を送信してください。',
  '前往儀表板 →': 'ダッシュボードへ →',
  '你有一筆尚未完成付款的諮詢，已為你載入內容。完成付款後即進入回覆佇列。': 'お支払いが完了していない相談があります。内容を読み込みました。お支払いが完了すると、回答の順番待ちに入ります。',
  '選擇主題': 'テーマを選択',
  '描述你的處境': '状況をお書きください',
  '描述越完整，回覆越精準。盡量說明背景、目前的狀況，以及你最想釐清的點。': '詳しく書いていただくほど、回答の精度が上がります。背景、現在の状況、そしていちばんはっきりさせたい点を、できるだけお書きください。',
  '在這裡寫下你的問題與處境…': 'ここにご質問と状況をお書きください…',
  '我了解這是不可退款的數位服務，並同意以上各項。': '返金不可のデジタルサービスであることを理解し、上記のすべてに同意します。',
  '提交並付款': '送信してお支払いへ',
  '勾選同意聲明': '同意事項にチェック',
  '尚需：': '送信するには：',
  '、': '、',
  '我的問事紀錄 - FuSang Vision': '個別相談の履歴 - FuSang Vision',
  '可回饋': 'フィードバック可',
  '尚無紀錄': 'まだ履歴がありません',
  '你還沒有任何問事紀錄。': 'まだ相談の履歴はありません。',
  '提交第一則問事 →': '最初の相談を申し込む →',
  '諮詢細節 - FuSang Vision': '相談の詳細 - FuSang Vision',
  '找不到諮詢': '相談が見つかりません',
  '找不到這則諮詢，或它不屬於你的帳號。': 'この相談が見つからないか、あなたのアカウントのものではありません。',
  '返回我的問事紀錄 →': '個別相談の履歴に戻る →',
  '編號': '番号',
  '你的問題': 'あなたの質問',
  '提交於': '送信日',
  '已收到付款，你的問題已進入回覆佇列。我們會在付款後 <strong>7 天內</strong>以書面回覆，並寄送 Email 通知你。': 'お支払いを確認しました。ご質問は回答の順番待ちに入っています。お支払いから<strong>7日以内</strong>に書面でお答えし、メールでお知らせします。',
  '回覆': '回答',
  '回覆於': '回答日',
  '你的追問': 'あなたの追加質問',
  '已送出追問，等待再次回覆。回覆完成後本諮詢即結案。': '追加質問を受け付けました。再度の回答をお待ちください。回答が完了すると、この相談は終了します。',
  '再次回覆': '追加質問への回答',
  '追問一次': '追加質問（1回）',
  '寫下你的追問…': '追加質問をお書きください…',
  '送出追問': '追加質問を送信',
  '我沒有其他問題了，結束諮詢': 'ほかに質問はありません。相談を終了する',
  '諮詢已關閉': '相談は終了しました',
  '關閉於': '終了日',
  '你的回饋': 'あなたのフィードバック',
  '結案後將無法再追問，且此諮詢會結束。確定要結束嗎？': '終了すると追加質問はできなくなり、この相談は終わります。終了してもよろしいですか？',
  '確定結案': '終了する',
  '取消': 'キャンセル',
  '這次的回覆，對現在的你有幫助嗎？': '今回の回答は、今のあなたにとって役に立ちましたか？',
  '想補充的話（選填）': '補足（任意）',
  '我同意 FuSang Vision 匿名引用這則回饋（選填）': 'FuSang Vision がこのフィードバックを匿名で引用することに同意します（任意）',
  '送出回饋': 'フィードバックを送信',
  '請先選擇一個選項': '先に選択肢を選んでください',
  '感謝你的回饋。': 'フィードバックをありがとうございます。',
  '事業與工作': '仕事・キャリア',
  '感情與關係': '恋愛・人間関係',
  '財運與理財': '金運・資産',
  '人際與家庭': '対人関係・家族',
  '自我與方向': '自分自身・方向性',
  '其他／綜合': 'その他・総合',
  '有幫助': '役に立った',
  '還好': 'まあまあ',
  '沒有幫助': '役に立たなかった',
  '真人解盤': '人が読み解く',
  '由 R.S. Chen 親自解讀你的命盤，結合深厚的紫微斗數造詣與現代心理洞察，針對你的處境書面回覆。': 'R.S. Chen があなたの命盤を直接読み解き、紫微斗数への深い造詣と現代的な心理の洞察を合わせて、あなたの状況に書面でお答えします。',
  '為你個別撰寫': 'あなただけのために書く',
  '每一則諮詢都是針對你的問題單獨準備。我們拒絕罐頭答案，每一字一句皆是基於你的能量流動所寫下。': 'どの相談も、あなたの質問のためだけに用意します。定型文の回答はお送りしません。一語一句、あなたのエネルギーの流れにもとづいて書き下ろします。',
  '可追問一次': '追加質問1回',
  '收到回覆後，7 天內可再針對原議題追問一次。我們陪你把想釐清的地方問清楚，不留遺憾。': '回答の受け取りから7日以内に、同じテーマについて追加質問が1回できます。はっきりさせたい点を最後まで一緒に確かめ、心残りのないようにします。',
  '整體都很好！我喜歡會先說明整體狀態、個性，再回應到流年。語氣中也可以感覺得到正向和溫暖。有給予很多自己判斷的方向和可能性，也會建議最後回到自己去做決定！': '全体的にとても良かったです！まず全体の状態や性格を説明してから、流年の話に入ってくれるところが気に入りました。言葉づかいからも前向きさと温かさが感じられました。自分で判断するための方向性や可能性をたくさん示してくれて、最後は自分で決めるようにと勧めてくれました！',
  '一開始有點緊張（社恐）但不用露臉的方式加上Ben很親切😊讓整體感受下來很快的能放鬆，也謝謝您讓我問一些奇怪的問題🙏第一次給別人算命就有這麼好的體驗，感恩❤️': '最初は少し緊張していました（人見知りなので）が、顔を出さなくていい形式と、Ben さんのとても親しみやすい雰囲気😊のおかげで、すぐにリラックスできました。変わった質問にも付き合っていただき、ありがとうございました🙏 初めての占いでこんなに良い体験ができて、感謝しています❤️',
  '謝謝您舉辦這次活動。我跟您聊完覺得很有幫助，也蠻清楚找到了問題的答案或建議！': 'この企画をありがとうございました。お話ししてとても役に立ち、質問への答えやアドバイスがはっきり見つかりました！',
  '很感謝Ben提供這次的機會 真的學到很多也很充實的訪談 讓我可以好好審視自己各方面的狀態！Really appreciate that!! Thanks a lot!!': 'Ben さん、今回の機会を本当にありがとうございました。学びの多い、とても充実したセッションで、自分のさまざまな面をじっくり見つめ直すことができました！Really appreciate that!! Thanks a lot!!',
  '一對一解讀命盤': '一対一の命盤解読',
  '位使用者用過線上命財官解析': '人がオンラインの命財官解析を利用',
};
// ── 韓語（ko，2026-09 第五語言）對照表 ────────────────────────────
//   規則同 JA：以繁中原文為 key；修改 pick() 繁中原文時 KO 的 key 也要同步。
//   術語依 Ben 韓文術語清單（명반/유년/자미두수…，諺文，不用漢字）。
const KO = {
  '待付款': '결제 대기',
  '已付款・等待回覆': '결제 완료 · 답변 대기',
  '已回覆': '답변 완료',
  '追問中・等待回覆': '추가 질문 중 · 답변 대기',
  '已結案': '완료',
  '已關閉': '종료',
  '你已有一則進行中的諮詢，請先完成後再提交新問題。': '이미 진행 중인 상담이 있어요. 완료한 뒤에 새 질문을 제출해 주세요.',
  '找不到你的命盤，請先回儀表板生成。': '명반을 찾을 수 없어요. 먼저 대시보드에서 명반을 만들어 주세요.',
  '請選擇一個主題。': '주제를 하나 선택해 주세요.',
  '請填寫你的問題內容。': '질문 내용을 입력해 주세요.',
  '登入狀態已失效，請重新登入。': '로그인이 만료되었어요. 다시 로그인해 주세요.',
  '提交時發生問題，請稍後再試。': '제출 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
  '這筆諮詢已付款或狀態已變更。': '이미 결제되었거나 상태가 변경된 상담이에요.',
  '找不到對應的諮詢，請重新提交。': '해당 상담을 찾을 수 없어요. 다시 제출해 주세요.',
  '提交資料不完整，請重試。': '제출 정보가 완전하지 않아요. 다시 시도해 주세요.',
  '前往付款時發生問題，請稍後再試。': '결제 페이지로 이동하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
  '每則諮詢僅能追問一次。': '추가 질문은 상담 1건당 한 번만 할 수 있어요.',
  '追問期限已過，諮詢已結案。': '추가 질문 기한이 지나 상담이 완료되었어요.',
  '目前無法追問。': '지금은 추가 질문을 할 수 없어요.',
  '找不到這則諮詢。': '이 상담을 찾을 수 없어요.',
  '請填寫追問內容。': '추가 질문 내용을 입력해 주세요.',
  '送出追問時發生問題，請稍後再試。': '추가 질문을 보내는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
  '目前無法結案。': '지금은 상담을 종료할 수 없어요.',
  '結案時發生問題，請稍後再試。': '상담 종료 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
  '這則諮詢已回饋過。': '이 상담에는 이미 피드백을 남기셨어요.',
  '目前無法回饋。': '지금은 피드백을 남길 수 없어요.',
  '請選擇一個選項。': '옵션을 하나 선택해 주세요.',
  '送出回饋時發生問題，請稍後再試。': '피드백을 보내는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
  '提交問事': '상담 신청',
  '問事首頁': '1:1 상담 홈',
  '我的問事紀錄': '내 상담 기록',
  '諮詢細節': '상담 상세',
  '即將推出': '출시 예정',
  '單獨問事即將推出': '1:1 상담 출시 예정',
  '單獨問事目前尚未開放，即將推出。': '1:1 상담은 아직 오픈 전이에요. 곧 선보일 예정이에요.',
  '單獨問事 - FuSang Vision': '1:1 상담 - FuSang Vision',
  '單獨問事': '1:1 상담',
  '一個真正重要的問題，由真人為你解盤。': '정말 중요한 질문 하나, 사람이 직접 명반을 읽어 드려요.',
  '當你有一個真正重要、想要被慎重對待的問題，單獨問事是為你一個人準備的一次解讀。': '정말 중요하고 신중하게 다뤄지길 바라는 질문이 있을 때, 1:1 상담은 오직 당신만을 위해 준비하는 한 번의 해석이에요.',
  '服務特色': '서비스 특징',
  '單次問事費用': '상담 1회 비용',
  '由 R.S. Chen 親自解讀你的命盤': 'R.S. Chen이 직접 명반을 해석해 드려요',
  '針對你的問題個別撰寫的書面回覆': '질문에 맞춰 개별 작성하는 서면 답변',
  '收到回覆後 7 天內可追問一次': '답변을 받은 뒤 7일 안에 추가 질문 1회 가능',
  '品牌故事': '브랜드 스토리',
  '探索你的內在天賦': '내면의 재능 발견하기',
  '將東方智慧，帶入你真正嚮往的現代生活。': '동양의 지혜를, 당신이 진정 바라는 현대의 삶 속으로.',
  '問事者怎麼說': '상담자 후기',
  '以下是先前一對一解讀的真實回饋，依原文刊出。': '아래는 지금까지 진행한 1:1 해석에 대한 실제 후기예요. (중국어 원문을 번역해 실었어요.)',
  '一對一解讀回饋': '1:1 해석 후기',
  '創辦人的話 — R.S. Chen（Ben）': '창립자의 말 — R.S. Chen (Ben)',
  '我是 R.S. Chen，大家都叫我 Ben。我先以一對一的方式為人解讀命盤；之後推出線上的「命財官解析」，至今已有 300 多位使用者。': '저는 R.S. Chen이고, 다들 Ben이라고 불러요. 처음에는 1:1로 명반을 해석해 드렸고, 이후 온라인 ‘명재관 해석’을 선보여 지금까지 300명이 넘는 분들이 이용해 주셨어요.',
  '自我探索': '자기 탐색',
  '勇氣': '용기',
  '清晰': '명료함',
  '如實': '있는 그대로',
  '查看進行中的諮詢': '진행 중인 상담 보기',
  '提交新的問事': '새 상담 신청',
  '你目前有一則進行中的諮詢。同一時間僅能進行一則。': '현재 진행 중인 상담이 1건 있어요. 상담은 한 번에 1건만 진행할 수 있어요.',
  '提交問事 - FuSang Vision': '상담 신청 - FuSang Vision',
  '尚無命盤': '아직 명반이 없어요',
  '單獨問事需先有你的命盤。請先回到儀表板生成命盤，完成後再回來提交問題。': '1:1 상담을 신청하려면 먼저 명반이 필요해요. 대시보드에서 명반을 만든 뒤 다시 돌아와 질문을 제출해 주세요.',
  '前往儀表板 →': '대시보드로 이동 →',
  '你有一筆尚未完成付款的諮詢，已為你載入內容。完成付款後即進入回覆佇列。': '결제가 완료되지 않은 상담이 있어 내용을 불러왔어요. 결제를 마치면 바로 답변 대기열에 들어가요.',
  '選擇主題': '주제 선택',
  '描述你的處境': '상황 설명',
  '描述越完整，回覆越精準。盡量說明背景、目前的狀況，以及你最想釐清的點。': '자세히 적을수록 더 정확하게 답변할 수 있어요. 배경과 현재 상황, 그리고 가장 알고 싶은 점을 최대한 적어 주세요.',
  '在這裡寫下你的問題與處境…': '여기에 질문과 상황을 적어 주세요…',
  '我了解這是不可退款的數位服務，並同意以上各項。': '환불이 불가능한 디지털 서비스임을 이해하며, 위 내용에 모두 동의합니다.',
  '提交並付款': '제출하고 결제하기',
  '勾選同意聲明': '동의 항목 체크',
  '尚需：': '남은 항목: ',
  '、': ', ',
  '我的問事紀錄 - FuSang Vision': '내 상담 기록 - FuSang Vision',
  '可回饋': '피드백 가능',
  '尚無紀錄': '기록 없음',
  '你還沒有任何問事紀錄。': '아직 상담 기록이 없어요.',
  '提交第一則問事 →': '첫 상담 신청하기 →',
  '諮詢細節 - FuSang Vision': '상담 상세 - FuSang Vision',
  '找不到諮詢': '상담을 찾을 수 없어요',
  '找不到這則諮詢，或它不屬於你的帳號。': '이 상담을 찾을 수 없거나 내 계정의 상담이 아니에요.',
  '返回我的問事紀錄 →': '내 상담 기록으로 돌아가기 →',
  '編號': '번호',
  '你的問題': '내 질문',
  '提交於': '제출일',
  '已收到付款，你的問題已進入回覆佇列。我們會在付款後 <strong>7 天內</strong>以書面回覆，並寄送 Email 通知你。': '결제가 확인되어 질문이 답변 대기열에 들어갔어요. 결제 후 <strong>7일 이내</strong>에 서면으로 답변드리고 이메일로 알려 드릴게요.',
  '回覆': '답변',
  '回覆於': '답변일',
  '你的追問': '내 추가 질문',
  '已送出追問，等待再次回覆。回覆完成後本諮詢即結案。': '추가 질문이 접수되었어요. 답변을 기다려 주세요. 답변이 완료되면 이 상담은 종료돼요.',
  '再次回覆': '추가 질문 답변',
  '追問一次': '추가 질문 (1회)',
  '寫下你的追問…': '추가 질문을 적어 주세요…',
  '送出追問': '추가 질문 보내기',
  '我沒有其他問題了，結束諮詢': '더 궁금한 점이 없어요. 상담 종료하기',
  '諮詢已關閉': '상담이 종료되었어요',
  '關閉於': '종료일',
  '你的回饋': '내 피드백',
  '結案後將無法再追問，且此諮詢會結束。確定要結束嗎？': '종료하면 더 이상 추가 질문을 할 수 없고, 이 상담은 마무리돼요. 정말 종료할까요?',
  '確定結案': '종료하기',
  '取消': '취소',
  '這次的回覆，對現在的你有幫助嗎？': '이번 답변이 지금의 당신에게 도움이 되었나요?',
  '想補充的話（選填）': '더 하고 싶은 말 (선택)',
  '我同意 FuSang Vision 匿名引用這則回饋（選填）': 'FuSang Vision이 이 피드백을 익명으로 인용하는 데 동의합니다 (선택)',
  '送出回饋': '피드백 보내기',
  '請先選擇一個選項': '먼저 옵션을 하나 선택해 주세요',
  '感謝你的回饋。': '피드백 감사합니다.',
  '事業與工作': '일 · 커리어',
  '感情與關係': '연애 · 관계',
  '財運與理財': '재물운 · 자산 관리',
  '人際與家庭': '대인 관계 · 가족',
  '自我與方向': '나 자신 · 방향',
  '其他／綜合': '기타 · 종합',
  '有幫助': '도움이 됐어요',
  '還好': '보통이에요',
  '沒有幫助': '도움이 안 됐어요',
  '真人解盤': '사람이 직접 해석',
  '由 R.S. Chen 親自解讀你的命盤，結合深厚的紫微斗數造詣與現代心理洞察，針對你的處境書面回覆。': 'R.S. Chen이 직접 명반을 해석하고, 깊이 있는 자미두수 역량과 현대적인 심리 통찰을 더해 당신의 상황에 맞춰 서면으로 답변드려요.',
  '為你個別撰寫': '당신만을 위해 작성',
  '每一則諮詢都是針對你的問題單獨準備。我們拒絕罐頭答案，每一字一句皆是基於你的能量流動所寫下。': '모든 상담은 당신의 질문만을 위해 따로 준비해요. 틀에 박힌 답변은 드리지 않아요. 한 글자 한 문장, 당신의 에너지 흐름을 바탕으로 적어 내려가요.',
  '可追問一次': '추가 질문 1회',
  '收到回覆後，7 天內可再針對原議題追問一次。我們陪你把想釐清的地方問清楚，不留遺憾。': '답변을 받은 뒤 7일 안에 같은 주제로 한 번 더 추가 질문할 수 있어요. 궁금한 점이 남지 않도록 끝까지 함께 짚어 드려요.',
  '整體都很好！我喜歡會先說明整體狀態、個性，再回應到流年。語氣中也可以感覺得到正向和溫暖。有給予很多自己判斷的方向和可能性，也會建議最後回到自己去做決定！': '전체적으로 다 좋았어요! 먼저 전반적인 상태와 성격을 설명해 주시고 나서 유년 이야기로 넘어가는 점이 마음에 들었어요. 말투에서도 긍정적이고 따뜻한 느낌이 전해졌어요. 스스로 판단할 수 있는 방향과 가능성을 많이 제시해 주셨고, 결국 마지막 결정은 나 자신에게 돌아가서 하라고 권해 주셨어요!',
  '一開始有點緊張（社恐）但不用露臉的方式加上Ben很親切😊讓整體感受下來很快的能放鬆，也謝謝您讓我問一些奇怪的問題🙏第一次給別人算命就有這麼好的體驗，感恩❤️': '처음엔 좀 긴장했는데(낯을 많이 가려서) 얼굴을 안 보여도 되는 방식에다 Ben 님이 정말 친절하셔서😊 전체적으로 금방 편해질 수 있었어요. 이상한 질문도 하게 해 주셔서 감사해요🙏 처음으로 남에게 운세를 봤는데 이렇게 좋은 경험을 하다니, 감사합니다❤️',
  '謝謝您舉辦這次活動。我跟您聊完覺得很有幫助，也蠻清楚找到了問題的答案或建議！': '이번 행사를 열어 주셔서 감사해요. 이야기 나눠 보니 정말 도움이 됐고, 질문에 대한 답이나 조언도 꽤 명확하게 찾았어요!',
  '很感謝Ben提供這次的機會 真的學到很多也很充實的訪談 讓我可以好好審視自己各方面的狀態！Really appreciate that!! Thanks a lot!!': '이번 기회를 주신 Ben 님께 정말 감사드려요 정말 많이 배웠고 알찬 인터뷰였어요 제 여러 면의 상태를 차분히 돌아볼 수 있었어요! Really appreciate that!! Thanks a lot!!',
  '一對一解讀命盤': '1:1 명반 해석',
  '位使用者用過線上命財官解析': '명이 온라인 명재관 해석을 이용했어요',
};
// 五語挑選：繁中／简中／English／日本語／한국어（每次呼叫都讀當前 uiLang）
//   ja：第 4 參數（僅含動態插值的樣板字串使用）優先 → JA[繁中原文] → 缺譯時警告並退回英文。
//   ko：第 5 參數（同上）優先 → KO[繁中原文] → 缺譯時警告並退回英文。
export const pick = (tw, cn, en, ja, ko) => {
  const L = getLang();
  if (L === 'ja') {
    if (ja !== undefined) return ja;
    if (Object.prototype.hasOwnProperty.call(JA, tw)) return JA[tw];
    try { console.warn('[i18n] consultation 缺 ja 譯文，退回英文：', tw); } catch (_) {}
    return en;
  }
  if (L === 'ko') {
    if (ko !== undefined) return ko;
    if (Object.prototype.hasOwnProperty.call(KO, tw)) return KO[tw];
    try { console.warn('[i18n] consultation 缺 ko 譯文，退回英文：', tw); } catch (_) {}
    return en;
  }
  return L === 'en' ? en : (L === 'zh-CN' ? cn : tw);
};

/* ── 標籤 ── */
export const SUBJECTS = [
  { code: 'career',       zh: '事業與工作', cn: '事业与工作', en: 'Career & Work' },
  { code: 'relationship', zh: '感情與關係', cn: '感情与关系', en: 'Love & Relationships' },
  { code: 'wealth',       zh: '財運與理財', cn: '财运与理财', en: 'Wealth & Finances' },
  { code: 'family',       zh: '人際與家庭', cn: '人际与家庭', en: 'People & Family' },
  { code: 'self',         zh: '自我與方向', cn: '自我与方向', en: 'Self & Direction' },
  { code: 'other',        zh: '其他／綜合', cn: '其他／综合', en: 'Other / General' },
];
export const subjLabel = (code) => {
  const s = SUBJECTS.find((x) => x.code === code);
  return s ? pick(s.zh, s.cn, s.en) : code;
};

export const RATINGS = [
  { code: 'helpful',     zh: '有幫助',   cn: '有帮助',   en: 'Helpful' },
  { code: 'somewhat',    zh: '還好',     cn: '还好',     en: 'Somewhat' },
  { code: 'not_helpful', zh: '沒有幫助', cn: '没有帮助', en: 'Not really' },
];
export const ratingLabel = (code) => {
  const r = RATINGS.find((x) => x.code === code);
  return r ? pick(r.zh, r.cn, r.en) : code;
};

export function statusLabelMap() {
  return {
    pending:  pick('待付款', '待付款', 'Awaiting payment'),
    paid:     pick('已付款・等待回覆', '已付款・等待回复', 'Paid · awaiting reply'),
    answered: pick('已回覆', '已回复', 'Answered'),
    followup: pick('追問中・等待回覆', '追问中・等待回复', 'Follow-up · awaiting reply'),
    closed:   pick('已結案', '已结案', 'Closed'),
  };
}
// Proxy：讓既有的 STATUS_LABEL[status] 取用維持動態(切換語言即時反映)
export const STATUS_LABEL = new Proxy({}, { get: (_, k) => statusLabelMap()[k] });

export const fmtDate = (iso) => {
  if (!iso) return '';
  try { const L = getLang(); return new Date(iso).toLocaleDateString(L === 'en' ? 'en-US' : (L === 'zh-CN' ? 'zh-CN' : (L === 'ja' ? 'ja-JP' : (L === 'ko' ? 'ko-KR' : 'zh-TW'))), { year:'numeric', month:'short', day:'numeric' }); }
  catch (_) { return iso; }
};

export const refCode = (id) => String(id || '').slice(0, 8);

/* ── 狀態判定 ── */
export const isActive = (t) => {
  if (t.status === 'paid' || t.status === 'followup') return true;
  if (t.status === 'answered' && t.answered_at) {
    return new Date(t.answered_at).getTime() + FOLLOWUP_DAYS * 864e5 > Date.now();
  }
  return false;
};
export const isPendingDraft = (t) => t.status === 'pending' && t.payment_status === 'pending';
export const inFollowupWindow = (t) =>
  t.status === 'answered' && t.answered_at &&
  new Date(t.answered_at).getTime() + FOLLOWUP_DAYS * 864e5 > Date.now();
export const needsFeedback = (t) => t.status === 'closed' && !t.rating && !t.closed_by_admin;
export const isAdminClosed = (t) => t.status === 'closed' && t.closed_by_admin === true;
// 顯示用狀態文字：admin 關閉 → 已關閉；其餘照 STATUS_LABEL
export const statusText = (t) => isAdminClosed(t) ? pick('已關閉', '已关闭', 'Closed') : (STATUS_LABEL[t.status] || t.status);

export const findActive = (tickets) => tickets.find(isActive) || null;
export const findPendingDraft = (tickets) => tickets.find(isPendingDraft) || null;
export const findFeedbackTarget = (tickets) => tickets.find(needsFeedback) || null;

/* ── 資料查詢 ── */
export async function getMyChartSession() {
  try {
    const { data } = await supabase.rpc('get_my_chart_session');
    return data || null;
  } catch (_) { return null; }
}
export async function getMyTickets() {
  try {
    const { data } = await supabase
      .from('consultation_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  } catch (_) { return []; }
}
export async function getTicketById(id) {
  try {
    const { data } = await supabase
      .from('consultation_tickets')
      .select('*')
      .eq('id', id)
      .maybeSingle();      // RLS 保證只讀得到本人的；非本人回 null
    return data || null;
  } catch (_) { return null; }
}

/* ── HTML 片段 ── */
export function signatureHtml() {
  return `<div class="sig">` +
    `<img src="${AVATAR}" alt="${esc(SIGNER)}" />` +
    `<div><div class="sig-name">${esc(SIGNER)}</div><div class="sig-org">FuSang Vision</div></div>` +
  `</div>`;
}

export function disclaimerHtml() {
  const L = getLang();
  if (L === 'zh-CN') {
    return `<div class="disclaim"><div class="disclaim-h">提交前请确认</div><ul>` +
      `<li>这是由真人解盘的个人化紫微斗数咨询。提供的背景越完整，回复越精准。</li>` +
      `<li>回复将以你设定的报告语言（繁体中文／简体中文／English）为主，与你的报告内容一致。</li>` +
      `<li><strong>同一时间仅能进行一则咨询。</strong>须待目前咨询结案后，才能再提交新的问题。</li>` +
      `<li>付款后 <strong>7 天内</strong>你会收到书面回复。回复后可于 <strong>7 天内追问一次</strong>；逾时咨询即结案。</li>` +
      `<li>本服务仅提供紫微斗数命理解读，<strong>不</strong>提供医疗、法律、财务或投资意见。</li>` +
      `<li><strong>数字服务，提交后恕不退款。</strong>每则咨询皆为你个别撰写，付款送出后不予退费。</li>` +
      `</ul></div>`;
  }
  if (L === 'ja') {
    return `<div class="disclaim"><div class="disclaim-h">送信前にご確認ください</div><ul>` +
      `<li>人が読み解く、あなた個人のための紫微斗数相談です。背景を詳しくお書きいただくほど、回答の精度が上がります。</li>` +
      `<li>回答は、あなたが設定したレポート言語（繁體中文／简体中文／English／日本語）で、レポートの内容に合わせてお書きします。</li>` +
      `<li><strong>同時に進められる相談は1件までです。</strong>現在の相談が終了してから、新しい質問を送信できます。</li>` +
      `<li>お支払い後 <strong>7日以内</strong>に書面で回答が届きます。回答後 <strong>7日以内に1回</strong>追加質問ができ、期限を過ぎると相談は終了します。</li>` +
      `<li>本サービスは紫微斗数による命理の解読のみを提供し、医療・法律・財務・投資に関する助言は<strong>提供しません</strong>。</li>` +
      `<li><strong>デジタルサービスのため、送信後の返金はできません。</strong>各相談はあなたのために個別に作成するため、お支払い後の返金はお受けしておりません。</li>` +
      `</ul></div>`;
  }
  if (L === 'ko') {
    return `<div class="disclaim"><div class="disclaim-h">제출 전에 확인해 주세요</div><ul>` +
      `<li>사람이 직접 명반을 풀어 드리는 개인 맞춤 자미두수 상담이에요. 배경을 자세히 적어 주실수록 답변이 더 정확해져요.</li>` +
      `<li>답변은 설정하신 리포트 언어(繁體中文／简体中文／English／日本語／한국어)로, 리포트 내용에 맞춰 작성해 드려요.</li>` +
      `<li><strong>상담은 한 번에 1건만 진행할 수 있어요.</strong> 현재 상담이 종료된 뒤에 새 질문을 제출할 수 있어요.</li>` +
      `<li>결제 후 <strong>7일 이내</strong>에 서면 답변을 받아요. 답변 후 <strong>7일 이내에 추가 질문 1회</strong>가 가능하며, 기한이 지나면 상담이 종료돼요.</li>` +
      `<li>본 서비스는 자미두수 명리 해석만 제공하며, 의료·법률·재무·투자에 관한 조언은 <strong>제공하지 않아요</strong>.</li>` +
      `<li><strong>디지털 서비스이므로 제출 후에는 환불되지 않아요.</strong> 모든 상담은 회원님을 위해 개별로 작성되므로, 결제 후에는 환불해 드리지 않아요.</li>` +
      `</ul></div>`;
  }
  if (L.startsWith('zh')) {
    return `<div class="disclaim"><div class="disclaim-h">提交前請確認</div><ul>` +
      `<li>這是由真人解盤的個人化紫微斗數諮詢。提供的背景越完整，回覆越精準。</li>` +
      `<li>回覆將以你設定的報告語言（繁體中文／简体中文／English）為主，與你的報告內容一致。</li>` +
      `<li><strong>同一時間僅能進行一則諮詢。</strong>須待目前諮詢結案後，才能再提交新的問題。</li>` +
      `<li>付款後 <strong>7 天內</strong>你會收到書面回覆。回覆後可於 <strong>7 天內追問一次</strong>；逾時諮詢即結案。</li>` +
      `<li>本服務僅提供紫微斗數命理解讀，<strong>不</strong>提供醫療、法律、財務或投資意見。</li>` +
      `<li><strong>數位服務，提交後恕不退款。</strong>每則諮詢皆為你個別撰寫，付款送出後不予退費。</li>` +
      `</ul></div>`;
  }
  return `<div class="disclaim"><div class="disclaim-h">Before you submit</div><ul>` +
    `<li>This is a personal Zi Wei Dou Shu consultation, answered by a human. The more context you give, the more precise the reading.</li>` +
    `<li>Your reply will be written in your registered report language (繁體中文 / 简体中文 / English), matching your report.</li>` +
    `<li><strong>One open consultation at a time.</strong> You can start a new one only after your current consultation is resolved.</li>` +
    `<li>You will receive a written reply within <strong>7 days</strong> of payment. After the reply, you may ask <strong>one follow-up within 7 days</strong>; after that the consultation closes.</li>` +
    `<li>This service provides Zi Wei Dou Shu interpretation only. It is <strong>not</strong> medical, legal, financial, or investment advice.</li>` +
    `<li><strong>Digital service. All sales are final.</strong> Each consultation is prepared individually for you, so payment is non-refundable once submitted.</li>` +
    `</ul></div>`;
}

/* ── 錯誤對應 ── */
export function mapCreateErr(m) {
  if (m.includes('ticket_in_progress')) return pick('你已有一則進行中的諮詢，請先完成後再提交新問題。', '你已有一则进行中的咨询，请先完成后再提交新问题。', 'You already have an open consultation. Finish it first.');
  if (m.includes('chart_not_found'))   return pick('找不到你的命盤，請先回儀表板生成。', '找不到你的命盘，请先回仪表板生成。', 'Your chart was not found. Please generate it from the dashboard first.');
  if (m.includes('invalid_subject'))   return pick('請選擇一個主題。', '请选择一个主题。', 'Please choose a topic.');
  if (m.includes('empty_content'))     return pick('請填寫你的問題內容。', '请填写你的问题内容。', 'Please describe your question.');
  if (m.includes('not_authenticated')) return pick('登入狀態已失效，請重新登入。', '登入状态已失效，请重新登入。', 'Your session expired. Please sign in again.');
  return pick('提交時發生問題，請稍後再試。', '提交时发生问题，请稍后再试。', 'Something went wrong. Please try again.');
}
export function mapCheckoutErr(code) {
  if (code === 'ticket_not_payable') return pick('這筆諮詢已付款或狀態已變更。', '这笔咨询已付款或状态已变更。', 'This consultation is already paid or changed.');
  if (code === 'ticket_not_found')   return pick('找不到對應的諮詢，請重新提交。', '找不到对应的咨询，请重新提交。', 'Consultation not found. Please submit again.');
  if (code === 'missing_ticket_id')  return pick('提交資料不完整，請重試。', '提交资料不完整，请重试。', 'Incomplete request. Please try again.');
  if (code === 'not_authenticated')  return pick('登入狀態已失效，請重新登入。', '登入状态已失效，请重新登入。', 'Your session expired. Please sign in again.');
  return pick('前往付款時發生問題，請稍後再試。', '前往付款时发生问题，请稍后再试。', 'Could not reach checkout. Please try again.');
}
export function mapFollowupErr(m) {
  if (m.includes('followup_exists'))        return pick('每則諮詢僅能追問一次。', '每则咨询仅能追问一次。', 'Only one follow-up per consultation.');
  if (m.includes('followup_window_closed')) return pick('追問期限已過，諮詢已結案。', '追问期限已过，咨询已结案。', 'The follow-up window has closed.');
  if (m.includes('not_answerable'))         return pick('目前無法追問。', '目前无法追问。', 'Follow-up is not available right now.');
  if (m.includes('ticket_not_found'))       return pick('找不到這則諮詢。', '找不到这则咨询。', 'Consultation not found.');
  if (m.includes('empty_content'))          return pick('請填寫追問內容。', '请填写追问内容。', 'Please write your follow-up.');
  return pick('送出追問時發生問題，請稍後再試。', '送出追问时发生问题，请稍后再试。', 'Something went wrong. Please try again.');
}
export function mapCloseErr(m) {
  if (m.includes('not_closable'))     return pick('目前無法結案。', '目前无法结案。', 'This consultation cannot be closed right now.');
  if (m.includes('ticket_not_found')) return pick('找不到這則諮詢。', '找不到这则咨询。', 'Consultation not found.');
  if (m.includes('not_authenticated')) return pick('登入狀態已失效，請重新登入。', '登入状态已失效，请重新登入。', 'Your session expired. Please sign in again.');
  return pick('結案時發生問題，請稍後再試。', '结案时发生问题，请稍后再试。', 'Something went wrong. Please try again.');
}
export function mapFeedbackErr(m) {
  if (m.includes('feedback_exists'))   return pick('這則諮詢已回饋過。', '这则咨询已反馈过。', 'You have already given feedback for this consultation.');
  if (m.includes('not_feedbackable'))  return pick('目前無法回饋。', '目前无法反馈。', 'Feedback is not available for this consultation.');
  if (m.includes('invalid_rating'))    return pick('請選擇一個選項。', '请选择一个选项。', 'Please choose an option.');
  if (m.includes('ticket_not_found'))  return pick('找不到這則諮詢。', '找不到这则咨询。', 'Consultation not found.');
  return pick('送出回饋時發生問題，請稍後再試。', '送出反馈时发生问题，请稍后再试。', 'Something went wrong. Please try again.');
}

/* ── DOM utils ── */
export function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export function showMsg(node, kind, text) { node.className = 'msg show ' + kind; node.innerHTML = text; }
export function reloadSoon(ms = 2200) { setTimeout(() => window.location.reload(), ms); return ''; }

/* ── 頁內導覽 ── */
// activePage: 'home' | 'form' | 'list' | 'detail'
function navConfig() {
  return {
    form:   { label: pick('提交問事', '提交问事', 'New consultation'),   back: 'consultation.html',       backLabel: pick('問事首頁', '问事首页', 'Consultation') },
    list:   { label: pick('我的問事紀錄', '我的问事纪录', 'My consultations'), back: 'consultation.html',       backLabel: pick('問事首頁', '问事首页', 'Consultation') },
    detail: { label: pick('諮詢細節', '咨询细节', 'Consultation'),        back: 'consultation-list.html',  backLabel: pick('我的問事紀錄', '我的问事纪录', 'My consultations') },
  };
}

let _consultActivePage = null;
function injectConsultNav(activePage) {
  _consultActivePage = activePage;
  const host = document.getElementById('consult-nav');
  const NAV = navConfig();
  if (!host || activePage === 'home' || !NAV[activePage]) return;
  const n = NAV[activePage];
  host.innerHTML =
    `<div class="consult-nav">` +
      `<a class="consult-back" data-href="${n.back}">← ${esc(n.backLabel)}</a>` +
      `<span class="sep">›</span>` +
      `<span class="cur">${esc(n.label)}</span>` +
    `</div>`;
  const back = host.querySelector('.consult-back');
  if (back) back.addEventListener('click', () => { window.location.href = back.getAttribute('data-href'); });
}

/* ── 共用 CSS ── */
const CONSULT_CSS = `
  /* 冷藍改版：consultation 內容範圍覆寫 shared token（header/footer 在此範圍外，維持全站色）*/
  .cons-wrap, .consult-nav, .cons-loading {
    --ink-darkest: #001b3c; --ink-dark: #16323f; --ink-mid: #41484d; --ink-light: #8a97a5; --ink-faint: #b6c2cd;
    --accent-deep: #1d4e63; --accent-soft: #296283; --accent-pale: #c7e7ff;
    --rule: #dbe2ea; --rule-soft-2: #e6ecf2; --bg-primary: #f8f9fa; --bg-soft: #eef3f9; --bg-soft-2: #e9eff7; --bg-card: #ffffff;
    --gold: #b8945c; --gold-soft: #c9ab7d;
  }

  .cons-wrap { max-width: 760px; margin: 0 auto; padding: 40px 32px 80px; }
  @media (max-width: 720px) { .cons-wrap { padding: 28px 22px 64px; } }

  /* ── 頁內導覽 ── */
  .consult-nav {
    max-width: 760px; margin: 0 auto; padding: 24px 32px 0;
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-sans); font-size: 12.5px;
  }
  @media (max-width: 720px) { .consult-nav { padding: 18px 22px 0; } }
  .consult-nav a { color: var(--ink-light); border-bottom: 1px solid transparent; cursor: pointer; transition: color 0.2s; }
  .consult-nav a:hover { color: var(--accent-deep); border-color: var(--accent-pale); }
  .consult-nav .sep { color: var(--ink-faint); }
  .consult-nav .cur { color: var(--ink-mid); }

  /* ── Hero ── */
  .cons-hero { margin-bottom: 40px; opacity: 0; animation: fsRise 0.7s cubic-bezier(0.2,0.7,0.2,1) forwards; }
  .cons-eyebrow { font-family: var(--font-sans); font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold); margin-bottom: 14px; }
  .cons-title { font-family: var(--font-serif-zh); font-weight: 500; font-size: clamp(28px, 5vw, 40px); line-height: 1.25; color: var(--ink-darkest); letter-spacing: 0.01em; }
  .cons-sub { margin-top: 12px; font-family: var(--font-serif-en); font-style: italic; font-size: 16px; color: var(--ink-light); }
  .cons-rule { margin-top: 24px; width: 64px; height: 1px; background: var(--gold); opacity: 0.6; }

  /* ── Card ── */
  .cons-card { position: relative; background: var(--bg-card); border: 1px solid var(--rule); border-radius: 4px; padding: 30px 30px 28px; margin-bottom: 22px; overflow: hidden; opacity: 0; animation: fsRise 0.7s cubic-bezier(0.2,0.7,0.2,1) forwards; }
  .cons-card::before { content: ''; position: absolute; top: 0; right: 0; width: 38px; height: 38px; border-top: 1px solid var(--gold); border-right: 1px solid var(--gold); opacity: 0.4; border-top-right-radius: 4px; }
  .cons-card.soft { background: var(--bg-soft-2); }
  .card-kicker { font-family: var(--font-sans); font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--ink-light); margin-bottom: 14px; }
  .card-h { font-family: var(--font-serif-zh); font-weight: 500; font-size: 22px; color: var(--ink-darkest); letter-spacing: 0.02em; margin-bottom: 16px; }

  /* ── Subject picker ── */
  .subj-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
  @media (max-width: 480px) { .subj-grid { grid-template-columns: 1fr; } }
  .subj-opt { font-family: var(--font-serif-zh); font-size: 15px; color: var(--ink-dark); background: var(--bg-primary); border: 1px solid var(--rule); border-radius: 3px; padding: 14px 16px; cursor: pointer; transition: border-color 0.2s, background 0.2s; text-align: left; }
  .subj-opt:hover { border-color: var(--gold-soft); }
  .subj-opt.sel { border-color: var(--accent-soft); background: var(--accent-pale); color: var(--ink-darkest); }
  .subj-opt .en { display: block; font-family: var(--font-serif-en); font-style: italic; font-size: 12.5px; color: var(--ink-light); margin-top: 3px; }

  /* ── Textarea ── */
  .field-label { font-family: var(--font-serif-zh); font-size: 15px; color: var(--ink-dark); margin-bottom: 8px; }
  .field-hint { font-family: var(--font-sans); font-size: 12.5px; line-height: 1.7; color: var(--ink-light); margin-bottom: 12px; }
  textarea.cons-input { width: 100%; min-height: 150px; font-family: var(--font-serif-zh); font-size: 15px; line-height: 1.8; color: var(--ink-darkest); background: var(--bg-primary); border: 1px solid var(--rule); border-radius: 3px; padding: 14px 16px; resize: vertical; transition: border-color 0.2s; }
  textarea.cons-input:focus { outline: none; border-color: var(--accent-soft); }
  .char-count { text-align: right; font-family: var(--font-sans); font-size: 11px; color: var(--ink-faint); margin-top: 6px; }

  /* ── Disclaimer ── */
  .disclaim { background: var(--bg-soft-2); border: 1px solid var(--rule-soft-2); border-radius: 3px; padding: 18px 20px; margin: 24px 0 20px; }
  .disclaim-h { font-family: var(--font-sans); font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 12px; }
  .disclaim ul { list-style: none; }
  .disclaim li { position: relative; font-family: var(--font-serif-zh); font-size: 13.5px; line-height: 1.75; color: var(--ink-mid); padding-left: 16px; margin-bottom: 9px; }
  .disclaim li::before { content: '·'; position: absolute; left: 4px; color: var(--gold); }
  .disclaim li strong { color: var(--ink-dark); font-weight: 600; }

  /* ── Consent ── */
  .consent { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 22px; cursor: pointer; }
  .consent input { margin-top: 3px; width: 16px; height: 16px; accent-color: var(--accent-deep); cursor: pointer; }
  .consent span { font-family: var(--font-serif-zh); font-size: 13.5px; line-height: 1.6; color: var(--ink-dark); }

  /* ── Buttons ── */
  .cons-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; width: 100%; font-family: var(--font-serif-zh); font-size: 16px; letter-spacing: 0.04em; color: var(--bg-card); background: var(--accent-deep); padding: 15px 24px; border-radius: 3px; cursor: pointer; transition: background 0.25s, transform 0.25s, opacity 0.25s; border: none; }
  .cons-btn:hover:not([disabled]) { background: #143a4a; transform: translateY(-1px); }
  .cons-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
  .cons-btn.ghost { color: var(--accent-deep); background: var(--bg-card); border: 1px solid var(--gold-soft); }
  .cons-btn.ghost:hover:not([disabled]) { background: var(--accent-pale); }

  /* ── Status / answer ── */
  .status-pill { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--accent-pale); color: var(--accent-deep); background: var(--bg-primary); }
  .status-pill .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-soft); }
  .status-pill.wait .dot { animation: fsPulse 1.6s ease-in-out infinite; }
  .status-pill.done .dot { background: var(--t-lu); }

  .qa-block { margin-top: 22px; }
  .qa-label { font-family: var(--font-sans); font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-light); margin-bottom: 8px; }
  .qa-text { font-family: var(--font-serif-zh); font-size: 15px; line-height: 1.85; color: var(--ink-darkest); white-space: pre-wrap; }
  .qa-meta { font-family: var(--font-sans); font-size: 11.5px; color: var(--ink-light); margin-top: 6px; }
  .qa-divider { height: 1px; background: var(--rule); margin: 22px 0; }
  .answer-box { background: var(--t-lu-bg); border: 1px solid #cfe0d5; border-radius: 3px; padding: 18px 20px; }
  .followup-note { font-family: var(--font-sans); font-size: 12.5px; line-height: 1.7; color: var(--ink-mid); margin: 16px 0 12px; }
  .followup-note strong { color: var(--ink-dark); }

  /* ── History ── */
  .hist-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 18px; border: 1px solid var(--rule); border-radius: 4px; margin-bottom: 10px; cursor: pointer; background: var(--bg-card); transition: border-color 0.2s, transform 0.2s; }
  .hist-item:hover { border-color: var(--gold-soft); transform: translateY(-1px); }
  .hist-subj { font-family: var(--font-serif-zh); font-size: 15px; color: var(--ink-dark); }
  .hist-date { font-family: var(--font-sans); font-size: 11.5px; color: var(--ink-light); }

  /* ── Banner ── */
  .banner { background: var(--bg-soft-2); border: 1px solid var(--gold-soft); border-radius: 3px; padding: 14px 18px; margin-bottom: 22px; font-family: var(--font-serif-zh); font-size: 14px; line-height: 1.6; color: var(--ink-dark); }

  /* ── Inline message ── */
  .msg { font-family: var(--font-sans); font-size: 13px; line-height: 1.6; margin-top: 14px; padding: 12px 14px; border-radius: 3px; display: none; }
  .msg.show { display: block; }
  .msg.err { background: var(--t-ji-bg); color: var(--t-ji); border: 1px solid #e4ccd1; }
  .msg.ok  { background: var(--t-lu-bg); color: var(--t-lu); border: 1px solid #cfe0d5; }

  .form-gate { font-family: var(--font-sans); font-size: 12px; line-height: 1.6; color: var(--ink-light); text-align: center; margin-top: 10px; min-height: 18px; transition: opacity 0.2s; }
  .cons-loading { text-align: center; padding: 90px 20px; font-family: var(--font-serif-zh); color: var(--ink-light); font-size: 15px; letter-spacing: 0.08em; }
  .empty-note { font-family: var(--font-serif-zh); font-size: 15px; line-height: 1.9; color: var(--ink-mid); }
  .link-inline { color: var(--accent-soft); border-bottom: 1px solid var(--accent-pale); cursor: pointer; }
  .link-inline:hover { color: var(--accent-deep); }

  /* ── 署名 ── */
  .sig { display: flex; align-items: center; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--rule); }
  .sig img { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; object-position: center top; display: block; flex: 0 0 auto; }
  .sig-name { font-family: var(--font-serif-zh); font-size: 15px; color: var(--ink-darkest); font-weight: 500; }
  .sig-org { font-family: var(--font-sans); font-size: 11.5px; color: var(--ink-light); letter-spacing: 0.04em; }

  /* ── 結案 / 確認 ── */
  .close-row { margin-top: 18px; }
  .close-link { font-family: var(--font-sans); font-size: 12.5px; color: var(--ink-light); cursor: pointer; border-bottom: 1px solid var(--rule); padding-bottom: 1px; }
  .close-link:hover { color: var(--ink-mid); }
  .confirm-box { margin-top: 14px; background: var(--bg-soft-2); border: 1px solid var(--gold-soft); border-radius: 3px; padding: 16px 18px; }
  .confirm-text { font-family: var(--font-serif-zh); font-size: 14px; line-height: 1.7; color: var(--ink-dark); margin-bottom: 14px; }
  .confirm-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .btn-sm { font-family: var(--font-serif-zh); font-size: 14px; padding: 9px 18px; border-radius: 3px; cursor: pointer; transition: background 0.2s, transform 0.2s; border: none; }
  .btn-sm.confirm { color: var(--bg-card); background: var(--accent-deep); }
  .btn-sm.confirm:hover { background: #143a4a; }
  .btn-sm.cancel { color: var(--ink-mid); background: var(--bg-card); border: 1px solid var(--rule); }
  .btn-sm.cancel:hover { border-color: var(--ink-light); }

  /* ── 回饋 ── */
  .fb-q { font-family: var(--font-serif-zh); font-size: 17px; color: var(--ink-darkest); line-height: 1.6; margin-bottom: 18px; }
  .fb-opts { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .fb-opt { flex: 1 1 0; min-width: 92px; font-family: var(--font-serif-zh); font-size: 15px; color: var(--ink-dark); background: var(--bg-primary); border: 1px solid var(--rule); border-radius: 3px; padding: 14px 10px; cursor: pointer; text-align: center; transition: border-color 0.2s, background 0.2s; }
  .fb-opt:hover { border-color: var(--gold-soft); }
  .fb-opt.sel { border-color: var(--accent-soft); background: var(--accent-pale); color: var(--ink-darkest); }
  .fb-consent { display: flex; align-items: flex-start; gap: 10px; margin: 16px 0 20px; cursor: pointer; }
  .fb-consent input { margin-top: 3px; width: 16px; height: 16px; accent-color: var(--accent-deep); cursor: pointer; }
  .fb-consent span { font-family: var(--font-sans); font-size: 12.5px; line-height: 1.6; color: var(--ink-mid); }
  .fb-thanks { font-family: var(--font-serif-zh); font-size: 15px; line-height: 1.8; color: var(--ink-mid); }

  @keyframes fsRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fsPulse { 0%,100% { opacity: 0.4; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.1); } }
  @media (prefers-reduced-motion: reduce) {
    .cons-hero, .cons-card { animation: none; opacity: 1; }
    .status-pill .dot { animation: none; }
  }

  /* ════════════════════════════════════════════════════════════════
     ▼ v2 視覺層（設計師 v1.0 語彙）— 限定 body.fs-v2，疊在上方冷藍樣式之上
       四頁共用：頁首橫幅 / 平面卡片 / 設計師按鈕 / form 語彙 / 狀態標籤
     ════════════════════════════════════════════════════════════════ */
  .fs-v2 .cons-wrap, .fs-v2 .consult-nav, .fs-v2 .cons-loading {
    --ink-darkest: var(--v2-ink); --ink-dark: var(--v2-ink); --ink-mid: var(--v2-muted); --ink-light: var(--v2-faint); --ink-faint: #c4c4c4;
    --accent-deep: var(--v2-ink); --accent-soft: var(--v2-blue); --accent-pale: var(--v2-blue-line);
    --rule: var(--v2-line); --rule-soft-2: var(--v2-line-soft); --bg-primary: #ffffff; --bg-soft: var(--v2-tint-soft); --bg-soft-2: var(--v2-tint-soft); --bg-card: #ffffff;
    --gold: var(--v2-blue); --gold-soft: var(--v2-blue-line);
  }
  .fs-v2 .cons-wrap { width: calc(100% - 2 * var(--v2-gutter)); max-width: var(--v2-max); margin: 0 auto; padding: 16px 0 96px; }
  .fs-v2 .fs-page .cons-wrap { max-width: var(--v2-max); }

  /* 頁內導覽（麵包屑）*/
  .fs-v2 .consult-nav { width: calc(100% - 2 * var(--v2-gutter)); max-width: var(--v2-max); min-height: 48px; margin: 16px auto 0; padding: 0; font-family: var(--v2-font-cjk); font-size: 14px; line-height: 24px; }
  .fs-v2 .consult-nav a { color: var(--v2-muted); border-bottom: 0; }
  .fs-v2 .consult-nav a:hover { color: var(--v2-blue); }
  .fs-v2 .consult-nav .sep { color: var(--v2-faint); }
  .fs-v2 .consult-nav .cur { color: var(--v2-ink); }

  /* 頁首橫幅 */
  .fs-v2 .cons-hero {
    position: relative; min-height: 179px; margin: 0 0 40px; padding: 32px; overflow: hidden; opacity: 1; animation: none;
    background: #ffffff url('assets/v2/banner.webp') center / cover no-repeat;
  }
  .fs-v2 .cons-eyebrow { margin: 0 0 8px; font-family: var(--v2-font-latin); font-size: 12px; line-height: 20px; letter-spacing: 0; text-transform: uppercase; color: var(--v2-muted); }
  .fs-v2 .cons-title { margin: 0 0 8px; font-family: var(--v2-font-cjk); font-size: 36px; line-height: 50px; font-weight: 500; letter-spacing: 0; color: var(--v2-ink); }
  .fs-v2 .cons-sub { margin: 0; font-family: var(--v2-font-cjk); font-style: normal; font-size: 16px; line-height: 29px; color: var(--v2-muted); }
  .fs-v2 .cons-rule { display: none; }

  /* 卡片：平面、細框、直角 */
  .fs-v2 .cons-card { padding: 32px; margin: 0 0 24px; background: #ffffff; border: 1px solid var(--v2-line); border-radius: 0; opacity: 1; animation: none; }
  .fs-v2 .cons-card::before { content: none; }
  .fs-v2 .cons-card.soft { background: var(--v2-tint-soft); }
  .fs-v2 .card-kicker { margin: 0 0 8px; font-family: var(--v2-font-latin); font-size: 12px; line-height: 20px; letter-spacing: 0; text-transform: uppercase; color: var(--v2-muted); }
  .fs-v2 .card-h { font-family: var(--v2-font-cjk); font-size: 24px; line-height: 36px; font-weight: 500; letter-spacing: 0; color: var(--v2-ink); }
  .fs-v2 .empty-note { font-family: var(--v2-font-cjk); font-size: 15px; line-height: 28px; color: var(--v2-muted); }
  .fs-v2 .link-inline { color: var(--v2-ink); font-weight: 600; border-bottom: 1px solid var(--v2-ink); }
  .fs-v2 .link-inline:hover { color: var(--v2-blue); border-bottom-color: var(--v2-blue); }

  /* 主題選擇（方格）*/
  .fs-v2 .subj-opt { border-radius: 0; background: #ffffff; border: 1px solid var(--v2-line); color: var(--v2-ink); font-family: var(--v2-font-cjk); transition: border-color .15s, background .15s; }
  .fs-v2 .subj-opt:hover { border-color: var(--v2-blue); background: var(--v2-tint-soft); }
  .fs-v2 .subj-opt.sel { border-color: var(--v2-blue); background: var(--v2-tint); box-shadow: inset 0 0 0 1px var(--v2-blue); }
  .fs-v2 .subj-opt .en { font-family: var(--v2-font-latin); font-style: normal; font-size: 12px; color: var(--v2-faint); }
  .fs-v2 .subj-opt:focus-visible { outline: 2px solid var(--v2-blue); outline-offset: 2px; }

  /* 文字框（設計師 form 語彙）*/
  .fs-v2 .field-label { font-family: var(--v2-font-cjk); font-size: 14px; color: var(--v2-ink); }
  .fs-v2 .field-hint { font-family: var(--v2-font-cjk); font-size: 13px; line-height: 22px; color: var(--v2-muted); }
  .fs-v2 textarea.cons-input { padding: 12px 14px; background: #ffffff; border: 1px solid var(--v2-line); border-radius: 0; font-family: var(--v2-font-cjk); font-size: 15px; line-height: 26px; color: var(--v2-ink); }
  .fs-v2 textarea.cons-input:focus { outline: none; border-color: var(--v2-blue); box-shadow: 0 0 0 3px var(--v2-tint); }
  .fs-v2 .char-count { font-family: var(--v2-font-latin); font-size: 12px; color: var(--v2-faint); }

  /* 提交前確認（藍色左線）*/
  .fs-v2 .disclaim { padding: 20px 24px; background: var(--v2-tint-soft); border: 1px solid var(--v2-line); border-left: 3px solid var(--v2-blue); border-radius: 0; }
  .fs-v2 .disclaim-h { font-family: var(--v2-font-cjk); font-size: 15px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--v2-ink); }
  .fs-v2 .disclaim li { font-family: var(--v2-font-cjk); font-size: 13px; line-height: 22px; color: var(--v2-muted); }
  .fs-v2 .disclaim li::before { color: var(--v2-blue); }
  .fs-v2 .disclaim li strong { color: var(--v2-ink); }
  .fs-v2 .consent input,
  .fs-v2 .fb-consent input { accent-color: var(--v2-blue); }
  .fs-v2 .consent span { font-family: var(--v2-font-cjk); font-size: 14px; line-height: 22px; color: var(--v2-ink); }
  .fs-v2 .fb-consent span { font-family: var(--v2-font-cjk); font-size: 13px; color: var(--v2-muted); }

  /* 按鈕 → 設計師按鈕 */
  .fs-v2 .cons-btn {
    min-height: 48px; padding: 12px 28px; border-radius: 0; transform: none;
    background: var(--v2-ink); color: #ffffff; border: 1px solid var(--v2-ink);
    font-family: var(--v2-font-cjk); font-size: 14px; font-weight: 600; line-height: 22px; letter-spacing: 0;
  }
  .fs-v2 .cons-btn:hover:not([disabled]) { background: var(--v2-ink-hover); border-color: var(--v2-ink-hover); transform: none; }
  .fs-v2 .cons-btn.ghost { background: #ffffff; color: var(--v2-ink); border: 1px solid var(--v2-ink); }
  .fs-v2 .cons-btn.ghost:hover:not([disabled]) { background: var(--v2-tint); border-color: var(--v2-blue); color: var(--v2-blue); }
  .fs-v2 .cons-btn[disabled] { opacity: 1; background: #f7f7f7; color: var(--v2-muted); border-color: #f7f7f7; }
  .fs-v2 .cons-btn:focus-visible,
  .fs-v2 .btn-sm:focus-visible,
  .fs-v2 .fb-opt:focus-visible { outline: 2px solid var(--v2-blue); outline-offset: 2px; }
  .fs-v2 .btn-sm { min-height: 40px; padding: 8px 20px; border-radius: 0; font-family: var(--v2-font-cjk); font-size: 14px; font-weight: 600; }
  .fs-v2 .btn-sm.confirm { background: var(--v2-ink); color: #ffffff; border: 1px solid var(--v2-ink); }
  .fs-v2 .btn-sm.confirm:hover { background: var(--v2-ink-hover); }
  .fs-v2 .btn-sm.cancel { background: #ffffff; color: var(--v2-ink); border: 1px solid var(--v2-ink); }
  .fs-v2 .btn-sm.cancel:hover { background: var(--v2-tint); border-color: var(--v2-blue); color: var(--v2-blue); }

  /* 狀態標籤 */
  .fs-v2 .status-pill { padding: 2px 10px; border-radius: 0; font-family: var(--v2-font-cjk); font-size: 13px; line-height: 22px; font-weight: 600; letter-spacing: 0; text-transform: none; }
  .fs-v2 .status-pill.wait { color: var(--v2-blue); background: var(--v2-tint); border: 1px solid var(--v2-blue-line); }
  .fs-v2 .status-pill.wait .dot { background: var(--v2-blue); }
  .fs-v2 .status-pill.done { color: var(--v2-muted); background: #f7f7f7; border: 1px solid var(--v2-line); }
  .fs-v2 .status-pill.done .dot { background: var(--v2-faint); }

  /* 問答內容 */
  .fs-v2 .qa-label { font-family: var(--v2-font-cjk); font-size: 13px; line-height: 22px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--v2-muted); }
  .fs-v2 .qa-text { font-family: var(--v2-font-cjk); font-size: 16px; line-height: 30px; color: var(--v2-ink); }
  .fs-v2 .qa-meta { font-family: var(--v2-font-cjk); font-size: 12px; line-height: 20px; color: var(--v2-faint); }
  .fs-v2 .answer-box { padding: 20px 24px; background: var(--v2-tint-soft); border: 1px solid var(--v2-line); border-left: 3px solid var(--v2-blue); border-radius: 0; }
  .fs-v2 .followup-note { font-family: var(--v2-font-cjk); font-size: 14px; line-height: 24px; color: var(--v2-muted); }
  .fs-v2 .followup-note strong { color: var(--v2-ink); }

  /* 提示條 / 訊息 */
  .fs-v2 .banner { padding: 14px 20px; background: var(--v2-tint); border: 1px solid var(--v2-blue-line); border-radius: 0; font-family: var(--v2-font-cjk); font-size: 14px; line-height: 24px; color: var(--v2-ink); }
  .fs-v2 .msg { border-radius: 0; font-family: var(--v2-font-cjk); font-size: 13px; line-height: 22px; }
  .fs-v2 .msg.err { background: #fdf5f6; color: #a8505c; border: 1px solid #e7c2c7; }
  .fs-v2 .msg.ok { background: var(--v2-tint); color: var(--v2-ink); border: 1px solid var(--v2-blue-line); }
  .fs-v2 .form-gate { font-family: var(--v2-font-cjk); font-size: 12px; color: var(--v2-faint); }
  .fs-v2 .cons-loading { padding: 120px 0; font-family: var(--v2-font-cjk); font-size: 14px; letter-spacing: 0; color: var(--v2-muted); }

  /* 署名 */
  .fs-v2 .sig { border-top-color: var(--v2-line); }
  .fs-v2 .sig img { border-radius: 50%; }
  .fs-v2 .sig-name { font-family: var(--v2-font-latin); font-size: 15px; color: var(--v2-ink); }
  .fs-v2 .sig-org { font-family: var(--v2-font-latin); font-size: 12px; color: var(--v2-faint); }

  /* 結案 / 回饋 */
  .fs-v2 .close-link { font-family: var(--v2-font-cjk); font-size: 13px; color: var(--v2-muted); border-bottom-color: var(--v2-line); }
  .fs-v2 .close-link:hover { color: #a8505c; border-bottom-color: #a8505c; }
  .fs-v2 .confirm-box { padding: 16px 20px; background: #fdf5f6; border: 1px solid #e7c2c7; border-radius: 0; }
  .fs-v2 .confirm-text { font-family: var(--v2-font-cjk); font-size: 14px; line-height: 24px; color: var(--v2-ink); }
  .fs-v2 .fb-q { font-family: var(--v2-font-cjk); font-size: 17px; line-height: 28px; font-weight: 500; color: var(--v2-ink); }
  .fs-v2 .fb-opt { border-radius: 0; background: #ffffff; border: 1px solid var(--v2-line); font-family: var(--v2-font-cjk); font-size: 14px; color: var(--v2-ink); }
  .fs-v2 .fb-opt:hover { border-color: var(--v2-blue); background: var(--v2-tint-soft); }
  .fs-v2 .fb-opt.sel { border-color: var(--v2-blue); background: var(--v2-tint); box-shadow: inset 0 0 0 1px var(--v2-blue); }
  .fs-v2 .fb-thanks { font-family: var(--v2-font-cjk); font-size: 15px; color: var(--v2-muted); }

  @media (max-width: 799px) {
    .fs-v2 .cons-hero { padding: 24px; min-height: 169px; background-position: 60% center; }
    .fs-v2 .cons-title { font-size: 28px; line-height: 42px; }
    .fs-v2 .cons-sub { font-size: 14px; line-height: 24px; }
    .fs-v2 .cons-card { padding: 24px 20px; }
  }
`;

function injectConsultCss() {
  if (document.getElementById('fs-consult-css')) return;
  const s = document.createElement('style');
  s.id = 'fs-consult-css';
  s.textContent = CONSULT_CSS;
  document.head.appendChild(s);
}

/* ── init ── */

// ── 單獨問事開關守衛(SoT:config.js 的 window.CFG.CONSULT_ENABLED)──────
//   明確等於 true 才算開啟;config.js 載入失敗時視同關閉(fail-closed)。
function consultEnabled() {
  return !!(window.CFG && window.CFG.CONSULT_ENABLED === true);
}
//   受守衛的功能頁(提交/紀錄/細節)。'home'(landing)不在內 ——
//   landing 自行呈現 coming soon,不可導回自己(會無限迴圈)。
const CONSULT_GUARDED = new Set(['form', 'list', 'detail']);

// 回傳 session（未登入 → components.requireAuth 已導走，回 null）
export async function initConsult(activePage = null) {
  // 關閉期間:三個功能頁一律導回 landing(該頁已有 coming soon 訊息,語意一致)。
  //   用 replace() 而非 assign():不留歷史紀錄,避免使用者按上一頁又被彈回,形成來回跳。
  //   回傳 null → 三頁既有的 `if (!session) return;` 即中止頁面邏輯,三頁本身無需改動。
  if (!consultEnabled() && CONSULT_GUARDED.has(activePage)) {
    window.location.replace('consultation.html');
    return null;
  }
  injectConsultCss();
  const session = await requireAuth();
  if (!session) return null;
  injectConsultNav(activePage);
  window.addEventListener('i18n:changed', () => injectConsultNav(_consultActivePage));
  return session;
}
