// ============================================================
// y27-i18n.js：2027 年報專區字典（key 前綴 y27.）
//   來源：PT-006 核准版文案表（2026-10-17）；step* 為 A 版新增（2026-10-17）；
//   ready* / feedback / coupon* 為 PT-007 線上交付（Ben 2026-10-19 核准；couponCopied 為 UI 回饋字）。
//   ja / ko 待語言專家審。
//   載入順序：i18n.js 之後。annual-2027.html 與 dashboard.html（橫幅）共用。
//   y27.step2 的說明沿用 y27.how。
//   代入值：doneBody {email}、doneDate {date}、readyBody {date}、feedback {mail}。
// ============================================================
(function () {
  if (!window.FSI18N || !window.FSI18N.addUI) {
    throw new Error('[y27-i18n] window.FSI18N 未載入，請把 i18n.js 排在本檔之前。');
  }
  window.FSI18N.addUI({
    "y27.docTitle": {
      "zh-TW": "2027 年報 - FuSang Vision",
      "zh-CN": "2027 年报 - FuSang Vision",
      "en": "Your 2027 Report - FuSang Vision",
      "ja": "2027年 年報 - FuSang Vision",
      "ko": "2027 연간 리포트 - FuSang Vision"
    },
    "y27.eyebrow": {
      "zh-TW": "2027 年報",
      "zh-CN": "2027 年报",
      "en": "2027 Report",
      "ja": "2027年 年報",
      "ko": "2027 연간 리포트"
    },
    "y27.title": {
      "zh-TW": "你的 2027 年報",
      "zh-CN": "你的 2027 年报",
      "en": "Your 2027 Report",
      "ja": "あなたの2027年 年報",
      "ko": "나의 2027 연간 리포트"
    },
    "y27.sub": {
      "zh-TW": "依你的命盤，看見 2027 這一年的重心。",
      "zh-CN": "依你的命盘，看见 2027 这一年的重心。",
      "en": "See where 2027 is centered for you, based on your own chart.",
      "ja": "あなたの命盤から、2027年という一年の重心を見ていきます。",
      "ko": "나의 명반을 바탕으로 2027년 한 해의 중심을 살펴봐요."
    },
    "y27.intro1": {
      "zh-TW": "2027 年報以你的本命、大限與 2027 流年三層命盤為依據，依紫微斗數的規則逐項判讀：今年哪些宮位被引動、四化落在哪裡、吉星與煞星怎麼分布。",
      "zh-CN": "2027 年报以你的本命、大限与 2027 流年三层命盘为依据，依紫微斗数的规则逐项判读：今年哪些宫位被引动、四化落在哪里、吉星与煞星怎么分布。",
      "en": "Your 2027 report draws on three layers of your chart: your Natal chart, your current Major Limit, and the 2027 Annual chart. It reads them point by point under the rules of Zi Wei Dou Shu: which palaces are activated this year, where the four transformations fall, and how the auspicious and challenging stars are placed.",
      "ja": "2027年 年報は、本命・大限・2027年流年の三層の命盤をもとに、紫微斗数のルールに沿って一つずつ読み解きます。今年どの宮が動き出すのか、四化がどこに入るのか、吉星と煞星がどのように配置されているのかを確認します。",
      "ko": "2027 연간 리포트는 선천·대한·2027 유년 세 층의 명반을 바탕으로, 자미두수의 규칙에 따라 하나씩 해석해요. 올해 어떤 궁이 움직이는지, 사화가 어디에 들어오는지, 길성과 살성이 어떻게 놓여 있는지를 살펴봐요."
    },
    "y27.intro2": {
      "zh-TW": "它不預言會發生什麼，而是讓你提早看見這一年的情形，知道哪裡可以多使力、哪裡適合放慢。",
      "zh-CN": "它不预言会发生什么，而是让你提早看见这一年的情形，知道哪里可以多使力、哪里适合放慢。",
      "en": "It does not predict what will happen. Instead, it shows you the shape of the year ahead of time, so you know where to put in more effort and where to slow down.",
      "ja": "何が起こるかを予言するものではありません。一年の様子を前もって知り、どこに力を注ぎ、どこで歩みをゆるめるとよいかを見つけるためのものです。",
      "ko": "무슨 일이 일어날지 예언하지 않아요. 한 해의 흐름을 미리 살펴보고, 어디에 더 힘을 쏟고 어디에서 속도를 늦추면 좋을지 알려 드려요."
    },
    "y27.whatTitle": {
      "zh-TW": "年報會告訴你",
      "zh-CN": "年报会告诉你",
      "en": "What your report covers",
      "ja": "年報でわかること",
      "ko": "리포트에 담기는 내용"
    },
    "y27.what1": {
      "zh-TW": "<b>年度主題</b>用一句話說明 2027 對你來說的重心。",
      "zh-CN": "<b>年度主题</b>用一句话说明 2027 对你来说的重心。",
      "en": "<b>Theme of the year</b>One sentence on where 2027 is centered for you.",
      "ja": "<b>年間のテーマ</b>2027年のあなたにとっての重心を一言でお伝えします。",
      "ko": "<b>올해의 주제</b>2027년 나에게 중심이 되는 흐름을 한 문장으로 알려 드려요."
    },
    "y27.what2": {
      "zh-TW": "<b>值得把握的 3 件事</b>例如貴人、人際或財庫，看見今年哪些地方特別順。",
      "zh-CN": "<b>值得把握的 3 件事</b>例如贵人、人际或财库，看见今年哪些地方特别顺。",
      "en": "<b>Three things to make the most of</b>Such as helpful people, relationships, or savings, and where things run smoothly this year.",
      "ja": "<b>活かしたい3つのこと</b>支えてくれる人、人間関係、蓄えなど、今年とくに順調な分野がわかります。",
      "ko": "<b>잘 살리면 좋은 3가지</b>도움을 주는 사람, 인간관계, 재물 등 올해 특히 순조로운 부분을 살펴봐요."
    },
    "y27.what3": {
      "zh-TW": "<b>需要留意的 3 件事</b>今年最需要照顧的領域，以及容易讓你猶豫的選擇。",
      "zh-CN": "<b>需要留意的 3 件事</b>今年最需要照顾的领域，以及容易让你犹豫的选择。",
      "en": "<b>Three things to watch</b>The area that needs the most care this year, and the choices where you may hesitate.",
      "ja": "<b>気をつけたい3つのこと</b>今年いちばん大切にしたい分野と、迷いやすい選択についてお伝えします。",
      "ko": "<b>주의하면 좋은 3가지</b>올해 가장 돌봐야 할 영역과 망설이기 쉬운 선택을 알려 드려요."
    },
    "y27.what4": {
      "zh-TW": "每一點都附上「為什麼這樣看」與「可以怎麼做」，讓你知道判讀從哪裡來，也知道能怎麼調整。",
      "zh-CN": "每一点都附上「为什么这样看」与「可以怎么做」，让你知道判读从哪里来，也知道能怎么调整。",
      "en": "Each point comes with why it reads this way and what you can do, so you can see where the reading comes from and how to adjust.",
      "ja": "どの項目にも「なぜそう読むのか」と「どうすればよいか」を添えて、読み解きの根拠と向き合い方がわかるようにしています。",
      "ko": "항목마다 ‘왜 이렇게 보는지’와 ‘어떻게 하면 좋은지’를 함께 담아, 해석의 근거와 대처 방법을 알 수 있어요."
    },
    "y27.howTitle": {
      "zh-TW": "怎麼做出來的",
      "zh-CN": "怎么做出来的",
      "en": "How it is made",
      "ja": "年報のつくり方",
      "ko": "리포트는 이렇게 만들어져요"
    },
    "y27.how": {
      "zh-TW": "年報依 R.S. Chen 整理的紫微斗數判讀規則，對照你的三層命盤逐項檢查後撰寫，並由 R.S. Chen 確認後寄出。",
      "zh-CN": "年报依 R.S. Chen 整理的紫微斗数判读规则，对照你的三层命盘逐项检查后撰写，并由 R.S. Chen 确认后寄出。",
      "en": "Your report is written by checking your three chart layers point by point against the Zi Wei Dou Shu reading rules compiled by R.S. Chen, and R.S. Chen reviews it before it is sent.",
      "ja": "年報は、R.S. Chen がまとめた紫微斗数の読み解きルールに照らして三層の命盤を一つずつ確認したうえで作成し、R.S. Chen が確認してからお送りします。",
      "ko": "리포트는 R.S. Chen이 정리한 자미두수 해석 규칙에 따라 세 층의 명반을 하나씩 확인해 작성하고, R.S. Chen이 직접 확인한 뒤 보내 드려요."
    },
    "y27.btn": {
      "zh-TW": "免費索取我的 2027 年報",
      "zh-CN": "免费索取我的 2027 年报",
      "en": "Request my free 2027 report",
      "ja": "2027年 年報を無料で受け取る",
      "ko": "2027 연간 리포트 무료로 받기"
    },
    "y27.note": {
      "zh-TW": "年報會在索取後 2–3 天內寄到你註冊的信箱，並以你目前使用的語言撰寫；需要其他語言，請先切換語言再索取。內容僅供自我了解，不提供醫療、法律、投資等專業意見。",
      "zh-CN": "年报会在索取后 2–3 天内寄到你注册的邮箱，并以你目前使用的语言撰写；需要其他语言，请先切换语言再索取。内容仅供自我了解，不提供医疗、法律、投资等专业意见。",
      "en": "Your report will be sent to your registered email within 2 to 3 days, written in the language you are using now. For another language, switch the language before requesting. It is for self-understanding only and does not provide medical, legal, investment, or other professional advice.",
      "ja": "年報はお申し込みから2〜3日以内に、ご登録のメールアドレスへお送りします。いまお使いの言語で作成しますので、別の言語をご希望の場合は、言語を切り替えてからお申し込みください。内容は自己理解のためのもので、医療・法律・投資などの専門的な助言は提供しておりません。",
      "ko": "리포트는 신청 후 2~3일 이내에 가입하신 이메일로 보내 드려요. 지금 사용 중인 언어로 작성되니, 다른 언어를 원하시면 언어를 바꾼 뒤 신청해 주세요. 내용은 자기 이해를 위한 것이며, 의료·법률·투자 등 전문적인 조언은 제공하지 않습니다."
    },
    "y27.doneTitle": {
      "zh-TW": "已收到你的索取",
      "zh-CN": "已收到你的索取",
      "en": "We have received your request",
      "ja": "お申し込みを受け付けました",
      "ko": "신청이 접수되었어요"
    },
    "y27.doneBody": {
      "zh-TW": "你的 2027 年報會在 2–3 天內寄到 {email}。",
      "zh-CN": "你的 2027 年报会在 2–3 天内寄到 {email}。",
      "en": "Your 2027 report will be sent to {email} within 2 to 3 days.",
      "ja": "2027年 年報は2〜3日以内に {email} へお送りします。",
      "ko": "2027 연간 리포트는 2~3일 이내에 {email}(으)로 보내 드려요."
    },
    "y27.doneDate": {
      "zh-TW": "索取時間 {date}",
      "zh-CN": "索取时间 {date}",
      "en": "Requested on {date}",
      "ja": "お申し込み日 {date}",
      "ko": "신청일 {date}"
    },
    "y27.err": {
      "zh-TW": "暫時無法送出，請稍後再試。",
      "zh-CN": "暂时无法送出，请稍后再试。",
      "en": "We could not send your request. Please try again shortly.",
      "ja": "ただいま送信できませんでした。しばらくしてからもう一度お試しください。",
      "ko": "지금은 신청을 보낼 수 없어요. 잠시 후 다시 시도해 주세요."
    },
    "y27.bannerTitle": {
      "zh-TW": "你的 2027 年報",
      "zh-CN": "你的 2027 年报",
      "en": "Your 2027 Report",
      "ja": "あなたの2027年 年報",
      "ko": "나의 2027 연간 리포트"
    },
    "y27.bannerSub": {
      "zh-TW": "依你的三層命盤整理，免費索取。",
      "zh-CN": "依你的三层命盘整理，免费索取。",
      "en": "Prepared from your three chart layers. Free to request.",
      "ja": "三層の命盤をもとにまとめた年報を、無料でお届けします。",
      "ko": "세 층의 명반을 바탕으로 정리한 리포트를 무료로 받아 보세요."
    },
    "y27.bannerCta": {
      "zh-TW": "前往 2027 專區",
      "zh-CN": "前往 2027 专区",
      "en": "Go to the 2027 page",
      "ja": "2027年 特集へ",
      "ko": "2027 페이지로 가기"
    },
    "y27.step1": {
      "zh-TW": "索取",
      "zh-CN": "索取",
      "en": "Request",
      "ja": "お申し込み",
      "ko": "신청"
    },
    "y27.step1d": {
      "zh-TW": "在這一頁按下索取，不需要再填資料。",
      "zh-CN": "在这一页按下索取，不需要再填资料。",
      "en": "Tap the request button on this page. No extra forms to fill in.",
      "ja": "このページでお申し込みボタンを押すだけで、追加の入力はいりません。",
      "ko": "이 페이지에서 신청 버튼만 누르면 돼요. 따로 입력할 내용은 없어요."
    },
    "y27.step2": {
      "zh-TW": "判讀與確認",
      "zh-CN": "判读与确认",
      "en": "Reading and review",
      "ja": "読み解きと確認",
      "ko": "해석과 확인"
    },
    "y27.step3": {
      "zh-TW": "寄到你的信箱",
      "zh-CN": "寄到你的邮箱",
      "en": "Sent to your inbox",
      "ja": "メールでお届け",
      "ko": "이메일로 발송"
    },
    "y27.step3d": {
      "zh-TW": "索取後 2–3 天內寄到你註冊的信箱。",
      "zh-CN": "索取后 2–3 天内寄到你注册的邮箱。",
      "en": "Sent to your registered email within 2 to 3 days.",
      "ja": "お申し込みから2〜3日以内に、ご登録のメールアドレスへお送りします。",
      "ko": "신청 후 2~3일 이내에 가입하신 이메일로 보내 드려요."
    },
    "y27.readyTitle": {
      "zh-TW": "你的 2027 年報已完成",
      "zh-CN": "你的 2027 年报已完成",
      "en": "Your 2027 report is ready",
      "ja": "2027年 年報が完成しました",
      "ko": "2027 연간 리포트가 완성되었어요"
    },
    "y27.readyBody": {
      "zh-TW": "完成時間 {date}。可以隨時回到這一頁閱讀，或存成 PDF 留存。",
      "zh-CN": "完成时间 {date}。可以随时回到这一页阅读，或存成 PDF 留存。",
      "en": "Completed on {date}. Come back to this page anytime, or save it as a PDF.",
      "ja": "完成日 {date}。いつでもこのページで読み返したり、PDF として保存したりできます。",
      "ko": "완성일 {date}. 언제든 이 페이지에서 다시 읽거나 PDF로 저장할 수 있어요."
    },
    "y27.readBtn": {
      "zh-TW": "閱讀我的 2027 年報",
      "zh-CN": "阅读我的 2027 年报",
      "en": "Read my 2027 report",
      "ja": "2027年 年報を読む",
      "ko": "2027 연간 리포트 읽기"
    },
    "y27.printBtn": {
      "zh-TW": "列印／存成 PDF",
      "zh-CN": "打印／存成 PDF",
      "en": "Print or save as PDF",
      "ja": "印刷・PDF で保存",
      "ko": "인쇄 · PDF로 저장"
    },
    "y27.feedback": {
      "zh-TW": "讀完之後，如果有任何感受或想法，歡迎寫信到 {mail} 告訴我。",
      "zh-CN": "读完之后，如果有任何感受或想法，欢迎写信到 {mail} 告诉我。",
      "en": "After reading, if anything stays with you or you have thoughts to share, write to me at {mail}.",
      "ja": "読み終えて感じたことやご意見があれば、{mail} までお聞かせください。",
      "ko": "읽어 보시고 느낀 점이나 생각이 있다면 {mail}으로 들려주세요."
    },
    "y27.couponTitle": {
      "zh-TW": "想問得更深嗎？",
      "zh-CN": "想问得更深吗？",
      "en": "Want to look deeper?",
      "ja": "もっと深く知りたいときは",
      "ko": "더 깊이 알고 싶다면"
    },
    "y27.couponBody": {
      "zh-TW": "單獨問事由 R.S. Chen 針對你的問題，對照命盤以書面回覆。原價 $49.9，體驗價 $20。",
      "zh-CN": "单独问事由 R.S. Chen 针对你的问题，对照命盘以书面回复。原价 $49.9，体验价 $20。",
      "en": "In a Consultation, R.S. Chen answers your question in writing, based on your chart. Regular price $49.9, trial price $20.",
      "ja": "個別相談では、R.S. Chen があなたの質問に命盤をもとに書面でお答えします。通常価格 $49.9、体験価格 $20。",
      "ko": "1:1 맞춤 질문에서는 R.S. Chen이 명반을 바탕으로 질문에 서면으로 답변드려요. 정가 $49.9, 체험가 $20."
    },
    "y27.couponLabel": {
      "zh-TW": "體驗碼",
      "zh-CN": "体验码",
      "en": "Code",
      "ja": "体験コード",
      "ko": "체험 코드"
    },
    "y27.couponHint": {
      "zh-TW": "在付款頁輸入即可折抵",
      "zh-CN": "在付款页输入即可抵扣",
      "en": "Enter it at checkout",
      "ja": "お支払いページで入力してください",
      "ko": "결제 페이지에서 입력해 주세요"
    },
    "y27.couponCopy": {
      "zh-TW": "複製",
      "zh-CN": "复制",
      "en": "Copy",
      "ja": "コピー",
      "ko": "복사"
    },
    "y27.couponCopied": {
      "zh-TW": "已複製",
      "zh-CN": "已复制",
      "en": "Copied",
      "ja": "コピーしました",
      "ko": "복사했어요"
    },
    "y27.couponCta": {
      "zh-TW": "前往單獨問事",
      "zh-CN": "前往单独问事",
      "en": "Go to Consultation",
      "ja": "個別相談へ",
      "ko": "1:1 맞춤 질문으로 가기"
    }
  });
})();
