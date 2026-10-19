import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// CONSULT-ADJ-01（2026-10）：不限次數追問 + 客戶主導結案
//   · 新事件 followup_answered（admin 回覆追問；ticket 回到 answered、不結案）
//     → 客戶信「你的追問已回覆」，摘錄取 consultation_messages 最新一則命理師回覆。
//     授權同 answered：僅 service | admin。
//   · closed 事件依 close_type 選信：
//       advisor（客戶 14 天未回，命理師結案）→ 新的命理師結案信
//       舊制單有 followup_answer → 沿用「追問已回覆，本次完成」
//       其餘（客戶主動結案）→ 沿用感謝信
//   · 首覆信文案改為「可繼續追問，覺得清楚了由你結案」（移除「7 天內追問一次」）。
//   · 首覆／追問回覆信的 CTA 直接連到該則諮詢詳情頁。
//   · admin 追問通知改為「請回覆」（不再「再覆並結案」）。
//   · 不提退款（PM 裁示：退款為命理師個案判斷，不對外承諾）。
//
// JAKO-BE-01（日文 ja、韓文 ko）
//   · langOf / custLang 支援 ja、ko；未知值仍退回 zh-TW（行為不變）。
//   · SUBJ 的 ja、ko 逐字取自 portal consultation-common.js 的 JA／KO 對照表
//     （與 portal 頁面用字一致，勿在此自行改譯）。
//   · 日期 locale、編號標籤、摘錄標籤集中為 DATE_LOCALE / REF_LABEL / PREVIEW_LABEL。
//   · 信件底部免責聲明依語言顯示（DISCLAIMER，五語）。admin 信維持 zh-TW。
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  SERVICE_KEY,
);

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const SENDER = { name: 'FuSang Vision', email: 'info@fusang-vision.com' };
const ADMIN_EMAIL = 'support@fusang-vision.com';

// ─────────────────────────────────────────────────────────────────────────────
// ⑥ EF 常數收斂：PORTAL / AVATAR 改讀環境變數。
//   · PORTAL：所有信件 CTA 連結的來源（PORTAL_BASE_URL）。
//   · AVATAR：簽名頭像，由 PORTAL 衍生；EMAIL_AVATAR_URL 為選用覆寫。
//   · SENDER / ADMIN_EMAIL / SIGNER：與 web hosting 無關 → 刻意不收 env。
// ─────────────────────────────────────────────────────────────────────────────
const PORTAL = Deno.env.get('PORTAL_BASE_URL') ?? 'https://15789102.github.io/fusang-portal';
const AVATAR = Deno.env.get('EMAIL_AVATAR_URL') ?? `${PORTAL}/assets/rs-fusang.webp`;
const SIGNER = 'RS Chen';
const IDLE_CLOSE_DAYS = 14;   // 與 RPC auto_close_expired 一致

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Lang = 'zh-TW' | 'en' | 'zh-CN' | 'ja' | 'ko';

// 主題標籤（客戶信依語言；admin 信用 zh-TW）
// ja / ko：逐字取自 portal consultation-common.js，須與 portal 表單保持一致。
const SUBJ: Record<string, Record<string, string>> = {
  'zh-TW': { career:'事業與工作', relationship:'感情與關係', wealth:'財運與理財', family:'人際與家庭', self:'自我與方向', other:'其他／綜合' },
  'en':    { career:'Career & Work', relationship:'Love & Relationships', wealth:'Wealth & Finances', family:'People & Family', self:'Self & Direction', other:'Other / General' },
  'zh-CN': { career:'事业与工作', relationship:'感情与关系', wealth:'财运与理财', family:'人际与家庭', self:'自我与方向', other:'其他／综合' },
  'ja':    { career:'仕事・キャリア', relationship:'恋愛・人間関係', wealth:'金運・資産', family:'対人関係・家族', self:'自分自身・方向性', other:'その他・総合' },
  'ko':    { career:'일 · 커리어', relationship:'연애 · 관계', wealth:'재물운 · 자산 관리', family:'대인 관계 · 가족', self:'나 자신 · 방향', other:'기타 · 종합' },
};

// 宣傳語 + 祝福（五語）
const BLESSING: Record<string, { quote: string; wish: string }> = {
  'zh-TW': { quote: '你能給世界最大的禮物，就是你的快樂。', wish: '無論後續如何，都祝福你一切順心。' },
  'zh-CN': { quote: '你能给世界最大的礼物，就是你的快乐。', wish: '无论后续如何，都祝福你一切顺心。' },
  'en':    { quote: 'The greatest gift you can give the world is your own happiness.', wish: 'Whatever comes next, I wish you well.' },
  'ja':    { quote: 'あなたが世界に贈ることのできるいちばん大きな贈り物は、あなた自身の幸せです。', wish: 'この先がどうであれ、すべてが心穏やかに進むよう願っています。' },
  'ko':    { quote: '당신이 세상에 줄 수 있는 가장 큰 선물은 당신의 행복입니다.', wish: '앞으로 어떻게 되든, 모든 일이 순조롭기를 바랍니다.' },
};

// 日期 locale、編號與摘錄標籤
const DATE_LOCALE: Record<Lang, string> = { 'zh-TW':'zh-TW', 'zh-CN':'zh-CN', 'en':'en-US', 'ja':'ja-JP', 'ko':'ko-KR' };
const REF_LABEL: Record<Lang, string> = { 'zh-TW':'諮詢編號', 'zh-CN':'諮詢編號', 'en':'Ref', 'ja':'相談番号', 'ko':'질문 번호' };
const PREVIEW_LABEL: Record<Lang, string> = { 'zh-TW':'摘錄', 'zh-CN':'摘录', 'en':'Preview', 'ja':'抜粋', 'ko':'발췌' };

// 信件底部免責聲明（與 submit_birth_data 同一組句子；zh-TW 為原句）
const DISCLAIMER: Record<Lang, string> = {
  'zh-TW': '本服務為紫微斗數命理諮詢，不提供醫療、法律、投資等專業意見。',
  'zh-CN': '本服务为紫微斗数命理咨询，不提供医疗、法律、投资等专业意见。',
  'en': 'This service offers Zi Wei Dou Shu readings and does not provide medical, legal, investment, or other professional advice.',
  'ja': '本サービスは紫微斗数による命理の相談であり、医療・法律・投資などの専門的な助言は提供しておりません。',
  'ko': '본 서비스는 자미두수 해석 상담이며, 의료·법률·투자 등 전문적인 조언은 제공하지 않습니다.',
};

function langOf(raw: string | null): Lang {
  if (raw === 'en' || raw === 'zh-CN' || raw === 'ja' || raw === 'ko') return raw;
  return 'zh-TW';
}

// 取前 120 字當預覽
function preview(text: string | null): string {
  if (!text) return '';
  const t = String(text).trim().replace(/\s+/g, ' ');
  return t.length > 120 ? t.slice(0, 120) + '…' : t;
}

// 該則諮詢的詳情頁（首覆／追問回覆信直接帶客戶到對話）
const detailLink = (t: any) => `${PORTAL}/consultation-detail.html?id=${encodeURIComponent(String(t.id))}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('notify-ticket: missing auth header');
      return json({ error: 'no_auth' }, 401);
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const isServiceCall = token === SERVICE_KEY;

    const { event, ticket_id } = await req.json();
    if (!event || !ticket_id) {
      console.error('notify-ticket: bad_request', { event, ticket_id });
      return json({ error: 'bad_request' }, 400);
    }

    const { data: t, error: tErr } = await supabase
      .from('consultation_tickets')
      .select('*')
      .eq('id', ticket_id)
      .single();
    if (tErr || !t) {
      console.error('notify-ticket: ticket_not_found', ticket_id, tErr?.message);
      return json({ error: 'ticket_not_found' }, 404);
    }

    // ── 依事件授權 ──
    if (event === 'paid') {
      if (!isServiceCall) {
        console.error('notify-ticket: forbidden paid (not service call)');
        return json({ error: 'forbidden' }, 403);
      }
    } else if (event === 'answered' || event === 'followup_answered') {
      // admin 動作 → 只允許 service | admin，不允許 owner（避免客戶自打寄信給自己）
      const ok = isServiceCall || await callerIsAdmin(token);
      if (!ok) {
        console.error(`notify-ticket: forbidden ${event} (admin action)`);
        return json({ error: 'forbidden' }, 403);
      }
    } else if (event === 'closed') {
      // 客戶可主動結案、admin 可命理師結案 → service | admin | owner
      const ok = isServiceCall || await callerIsAdmin(token) || await callerIsOwner(token, t.user_email);
      if (!ok) {
        console.error('notify-ticket: forbidden closed');
        return json({ error: 'forbidden' }, 403);
      }
    } else if (event === 'followup_submitted') {
      if (!isServiceCall) {
        const email = await callerEmail(token);
        if (email !== t.user_email) {
          console.error('notify-ticket: forbidden followup (email mismatch)');
          return json({ error: 'forbidden' }, 403);
        }
      }
    } else if (event === 'cancelled') {
      // 僅 admin（或 server）可觸發關閉通知
      const ok = isServiceCall || await callerIsAdmin(token);
      if (!ok) {
        console.error('notify-ticket: forbidden cancelled');
        return json({ error: 'forbidden' }, 403);
      }
    } else {
      console.error('notify-ticket: bad_event', event);
      return json({ error: 'bad_event' }, 400);
    }

    // ── 派送 ──
    if (event === 'paid') {
      // 兩封各自 try/catch、獨立失敗、獨立 log。客戶信先寄、admin 信後寄。
      try {
        await sendPaidCustomerMail(t);
      } catch (e) {
        console.error('notify-ticket: customer mail (paid) failed:', String((e as any)?.message ?? e));
      }
      try {
        await sendAdminMail(event, t);
      } catch (e) {
        console.error('notify-ticket: admin mail (paid) failed:', String((e as any)?.message ?? e));
      }
    } else if (event === 'followup_submitted') {
      await sendAdminMail(event, t);
    } else if (event === 'answered') {
      await sendAnsweredMail(t);
    } else if (event === 'followup_answered') {
      await sendFollowupAnsweredMail(t);
    } else if (event === 'cancelled') {
      await sendCancelledMail(t);             // admin 關閉通知（含原因）
    } else { // closed
      await sendClosedMail(t);
    }

    console.log('notify-ticket: sent', event, ticket_id);
    return json({ ok: true }, 200);

  } catch (err) {
    console.error('notify-ticket error:', String((err as any)?.message ?? err));
    return json({ error: String((err as any)?.message ?? err) }, 500);
  }
});

// ─── 授權 helper ───
async function callerIsAdmin(token: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return false;
    const { data: prof } = await supabase
      .from('user_profiles').select('is_admin').eq('id', user.id).single();
    return prof?.is_admin === true;
  } catch (_) { return false; }
}
async function callerIsOwner(token: string, email: string): Promise<boolean> {
  const e = await callerEmail(token);
  return !!e && e === email;
}
async function callerEmail(token: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.email ?? null;
  } catch (_) { return null; }
}

async function custLang(email: string): Promise<Lang> {
  const { data: prof } = await supabase
    .from('user_profiles').select('preferred_language').eq('email', email).single();
  return langOf(prof?.preferred_language ?? null);
}

// 最新一則命理師回覆（追問回覆信的摘錄）
async function latestAdvisorReply(ticketId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('consultation_messages')
    .select('body')
    .eq('ticket_id', ticketId)
    .eq('role', 'advisor')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('notify-ticket: latest advisor reply read failed:', error.message);
    return null;
  }
  return data?.body ?? null;
}

// ─── 客戶信：admin 關閉（含關閉原因）───
async function sendCancelledMail(t: any) {
  const lang = await custLang(t.user_email);
  const label = SUBJ[lang][t.subject] ?? t.subject;
  const link = `${PORTAL}/consultation-list.html`;
  const ref = String(t.id).slice(0, 8);
  const reason = t.close_reason || '';

  let subject = '', heading = '', bodyLine = '', reasonLabel = '', cta = '';
  if (lang === 'en') {
    subject = 'An update on your consultation';
    heading = 'Your consultation has been closed';
    bodyLine = `We\'re writing about your consultation on “${label}”. It has been closed by our team, with the note below.`;
    reasonLabel = 'Note from us';
    cta = 'View my consultations';
  } else if (lang === 'ja') {
    subject = '個別相談についてのお知らせ';
    heading = '個別相談を終了しました';
    bodyLine = `「${label}」についての個別相談は、こちらで終了させていただきました。説明は以下のとおりです。`;
    reasonLabel = '私たちからの説明';
    cta = '個別相談の履歴を見る';
  } else if (lang === 'ko') {
    subject = '1:1 맞춤 질문 안내';
    heading = '1:1 맞춤 질문이 종료되었습니다';
    bodyLine = `‘${label}’에 관한 1:1 맞춤 질문을 저희가 종료했습니다. 안내는 아래와 같습니다.`;
    reasonLabel = '저희의 안내';
    cta = '내 질문 기록 보기';
  } else if (lang === 'zh-CN') {
    subject = '关于你的单独问事';
    heading = '你的单独问事已关闭';
    bodyLine = `关于你「${label}」的单独问事，我们已将其关闭，说明如下。`;
    reasonLabel = '我们的说明';
    cta = '查看我的问事纪录';
  } else {
    subject = '關於你的單獨問事';
    heading = '你的單獨問事已關閉';
    bodyLine = `關於你「${label}」的單獨問事，我們已將其關閉，說明如下。`;
    reasonLabel = '我們的說明';
    cta = '查看我的問事紀錄';
  }

  const html = mailHtml({
    heading, body: bodyLine, link, cta, lang, refCode: ref,
    reasonBox: { label: reasonLabel, text: reason },
    withSignature: true,
  });
  const text = `${heading}\n${REF_LABEL[lang]} · ${ref}\n\n${bodyLine}\n\n${reasonLabel}：${reason}\n\n${cta}: ${link}\n\n— ${SIGNER}, FuSang Vision`;
  await brevoSend(t.user_email, subject, html, text);
}

// ─── 客戶信：付款確認（已收到、預計回覆日）───
async function sendPaidCustomerMail(t: any) {
  const lang = await custLang(t.user_email);
  const label = SUBJ[lang][t.subject] ?? t.subject;
  const link = `${PORTAL}/consultation-list.html`;
  const ref = String(t.id).slice(0, 8);

  // 預計回覆日 = 現在 + 7 天（付款後即時觸發）
  const due = new Date(Date.now() + 7 * 864e5);
  const dueStr = due.toLocaleDateString(
    DATE_LOCALE[lang],
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  let subject = '', heading = '', bodyLine = '', cta = '';
  if (lang === 'en') {
    subject = 'We\'ve received your consultation';
    heading = 'Your consultation is in the queue';
    bodyLine = `Thank you — we\'ve received your consultation on “${label}”. You\'ll receive a written reply by ${dueStr}. We\'ll email you the moment it\'s ready.`;
    cta = 'View my consultations';
  } else if (lang === 'ja') {
    subject = '個別相談を受け付けました';
    heading = '個別相談は回答の順番待ちに入りました';
    bodyLine = `ありがとうございます。「${label}」についての個別相談を受け付けました。${dueStr}までに書面でご回答します。回答が完成しましたら、すぐにメールでお知らせします。`;
    cta = '個別相談の履歴を見る';
  } else if (lang === 'ko') {
    subject = '1:1 맞춤 질문이 접수되었습니다';
    heading = '1:1 맞춤 질문이 답변 대기열에 들어갔습니다';
    bodyLine = `감사합니다. ‘${label}’에 관한 1:1 맞춤 질문을 받았습니다. ${dueStr}까지 서면으로 답변드립니다. 답변이 완료되면 바로 이메일로 알려 드립니다.`;
    cta = '내 질문 기록 보기';
  } else if (lang === 'zh-CN') {
    subject = '我们已收到你的单独问事';
    heading = '你的单独问事已进入回复队列';
    bodyLine = `感谢你——我们已收到你关于「${label}」的单独问事，将于 ${dueStr} 前以书面回复。回复完成后会立即以 Email 通知你。`;
    cta = '查看我的问事纪录';
  } else {
    subject = '我們已收到你的單獨問事';
    heading = '你的單獨問事已進入回覆佇列';
    bodyLine = `感謝你——我們已收到你關於「${label}」的單獨問事，將於 ${dueStr} 前以書面回覆。回覆完成後會立即以 Email 通知你。`;
    cta = '查看我的問事紀錄';
  }

  const html = mailHtml({ heading, body: bodyLine, link, cta, lang, refCode: ref, withSignature: true });
  const text = `${heading}\n${REF_LABEL[lang]} · ${ref}\n\n${bodyLine}\n\n${cta}: ${link}\n\n— ${SIGNER}, FuSang Vision`;
  await brevoSend(t.user_email, subject, html, text);
}

// ─── 客戶信：首覆 ───
async function sendAnsweredMail(t: any) {
  const lang = await custLang(t.user_email);
  const label = SUBJ[lang][t.subject] ?? t.subject;
  const link = detailLink(t);
  const pv = preview(t.answer);

  let subject = '', heading = '', bodyLine = '', cta = '';
  if (lang === 'en') {
    subject = 'Your consultation has a reply';
    heading = 'Your consultation has been answered';
    bodyLine = `Your consultation on “${label}” has a written reply. If anything is still unclear, you can keep following up on the consultation page. When it feels clear, you close it.`;
    cta = 'View the full reply';
  } else if (lang === 'ja') {
    subject = '個別相談に回答が届きました';
    heading = '個別相談に回答しました';
    bodyLine = `「${label}」についての個別相談に書面での回答が届きました。まだはっきりしない点があれば、相談ページから追加質問を続けられます。はっきりしたら、ご自身で相談を終了してください。`;
    cta = '回答をすべて読む';
  } else if (lang === 'ko') {
    subject = '1:1 맞춤 질문에 답변이 도착했습니다';
    heading = '1:1 맞춤 질문에 답변드렸습니다';
    bodyLine = `‘${label}’에 관한 1:1 맞춤 질문에 답변이 도착했습니다. 아직 명확하지 않은 부분이 있다면 질문 페이지에서 계속 추가 질문하실 수 있습니다. 충분히 명확해지면 직접 질문을 종료해 주세요.`;
    cta = '전체 답변 보기';
  } else if (lang === 'zh-CN') {
    subject = '你的单独问事已回复';
    heading = '你的单独问事已回复';
    bodyLine = `你关于「${label}」的单独问事已收到回复。如果还有不清楚的地方，可以在问事页面继续追问；觉得清楚了，就由你结案。`;
    cta = '查看完整回复';
  } else {
    subject = '你的單獨問事已回覆';
    heading = '你的單獨問事已回覆';
    bodyLine = `你關於「${label}」的單獨問事已收到回覆。如果還有不清楚的地方，可以在問事頁面繼續追問；覺得清楚了，就由你結案。`;
    cta = '查看完整回覆';
  }

  const ref = String(t.id).slice(0, 8);
  const html = mailHtml({ heading, body: bodyLine, previewText: pv, link, cta, lang, withSignature: true, refCode: ref });
  const text = `${heading}\n${REF_LABEL[lang]} · ${ref}\n\n${bodyLine}\n\n${pv ? pv + '\n\n' : ''}${cta}: ${link}\n\n— ${SIGNER}, FuSang Vision`;
  await brevoSend(t.user_email, subject, html, text);
}

// ─── 客戶信：追問已回覆（CONSULT-ADJ-01，不結案）───
async function sendFollowupAnsweredMail(t: any) {
  const lang = await custLang(t.user_email);
  const label = SUBJ[lang][t.subject] ?? t.subject;
  const link = detailLink(t);
  const pv = preview(await latestAdvisorReply(String(t.id)));

  let subject = '', heading = '', bodyLine = '', cta = '';
  if (lang === 'en') {
    subject = 'Your follow-up has a reply';
    heading = 'Your follow-up has been answered';
    bodyLine = `Your follow-up on “${label}” has a reply. If there is more you want to check, you can keep following up. When it feels clear, you close the consultation.`;
    cta = 'View the full reply';
  } else if (lang === 'ja') {
    subject = '追加質問に回答が届きました';
    heading = '追加質問に回答しました';
    bodyLine = `「${label}」についての追加質問に回答が届きました。ほかに確かめたいことがあれば、追加質問を続けられます。はっきりしたら、ご自身で相談を終了してください。`;
    cta = '回答をすべて読む';
  } else if (lang === 'ko') {
    subject = '추가 질문에 답변이 도착했습니다';
    heading = '추가 질문에 답변드렸습니다';
    bodyLine = `‘${label}’에 관한 추가 질문에 답변이 도착했습니다. 더 확인하고 싶은 점이 있다면 계속 추가 질문하실 수 있습니다. 충분히 명확해지면 직접 질문을 종료해 주세요.`;
    cta = '전체 답변 보기';
  } else if (lang === 'zh-CN') {
    subject = '你的追问已回复';
    heading = '你的追问已回复';
    bodyLine = `你关于「${label}」的追问已收到回复。还有想确认的地方可以继续追问；觉得清楚了，就由你结案。`;
    cta = '查看完整回复';
  } else {
    subject = '你的追問已回覆';
    heading = '你的追問已回覆';
    bodyLine = `你關於「${label}」的追問已收到回覆。還有想確認的地方可以繼續追問；覺得清楚了，就由你結案。`;
    cta = '查看完整回覆';
  }

  const ref = String(t.id).slice(0, 8);
  const html = mailHtml({ heading, body: bodyLine, previewText: pv, link, cta, lang, withSignature: true, refCode: ref });
  const text = `${heading}\n${REF_LABEL[lang]} · ${ref}\n\n${bodyLine}\n\n${pv ? pv + '\n\n' : ''}${cta}: ${link}\n\n— ${SIGNER}, FuSang Vision`;
  await brevoSend(t.user_email, subject, html, text);
}

// ─── 客戶信：結案（命理師結案／舊制再覆結案／客戶主動結案）───
async function sendClosedMail(t: any) {
  const lang = await custLang(t.user_email);
  const label = SUBJ[lang][t.subject] ?? t.subject;
  const link = detailLink(t);
  const bl = BLESSING[lang];
  const advisorClosed = t.close_type === 'advisor' && !t.followup_answer;  // 客戶 14 天未回
  const hasReply = !advisorClosed && !!t.followup_answer;                  // 舊制：再覆即結案
  const pv = hasReply ? preview(t.followup_answer) : '';

  let subject = '', heading = '', bodyLine = '', reviewNote = '', cta = '';
  if (lang === 'en') {
    subject = 'Your consultation is now closed';
    heading = advisorClosed ? 'Your consultation has been closed' : (hasReply ? 'Your follow-up has been answered' : 'Thank you');
    bodyLine = advisorClosed
      ? `Your consultation on “${label}” has been closed by us, as there has been no new follow-up for ${IDLE_CLOSE_DAYS} days. You can still read the full replies anytime. For a new question, you are welcome to submit a new consultation.`
      : hasReply
        ? `Your follow-up on “${label}” has been answered, and this consultation is now complete.`
        : `Thank you for trusting FuSang Vision with your question on “${label}”. This consultation is now closed.`;
    reviewNote = 'If you haven’t read the full reply yet, you can view it here anytime.';
    cta = 'View the full reply';
  } else if (lang === 'ja') {
    subject = advisorClosed ? '個別相談が終了しました' : '個別相談が完了しました';
    heading = advisorClosed ? '個別相談を終了しました' : (hasReply ? '追加のご質問に回答しました' : 'ご信頼いただき、ありがとうございます');
    bodyLine = advisorClosed
      ? `「${label}」についての個別相談は、${IDLE_CLOSE_DAYS}日間新しい追加質問がなかったため、こちらで終了しました。回答はいつでもご覧いただけます。新しい質問がある場合は、改めて相談をお申し込みください。`
      : hasReply
        ? `「${label}」についての追加のご質問に回答し、今回の個別相談は完了しました。`
        : `「${label}」について FuSang Vision にご質問いただき、ありがとうございました。今回の個別相談はこれで終了となります。`;
    reviewNote = 'まだ回答をすべてお読みでない場合は、下のリンクからいつでもご覧いただけます。';
    cta = '回答をすべて読む';
  } else if (lang === 'ko') {
    subject = advisorClosed ? '1:1 맞춤 질문이 종료되었습니다' : '1:1 맞춤 질문이 완료되었습니다';
    heading = advisorClosed ? '1:1 맞춤 질문이 종료되었습니다' : (hasReply ? '추가 질문에 답변드렸습니다' : '믿고 맡겨 주셔서 감사합니다');
    bodyLine = advisorClosed
      ? `‘${label}’에 관한 1:1 맞춤 질문은 ${IDLE_CLOSE_DAYS}일 동안 새 추가 질문이 없어 저희가 종료했습니다. 전체 답변은 언제든 다시 보실 수 있습니다. 새로운 질문이 생기면 질문을 따로 제출해 주세요.`
      : hasReply
        ? `‘${label}’에 관한 추가 질문에 답변드렸으며, 이번 1:1 맞춤 질문은 완료되었습니다.`
        : `‘${label}’에 대해 FuSang Vision에 질문해 주셔서 감사합니다. 이번 1:1 맞춤 질문은 완료되었습니다.`;
    reviewNote = '아직 전체 답변을 읽지 않으셨다면 아래 링크에서 언제든 보실 수 있습니다.';
    cta = '전체 답변 보기';
  } else if (lang === 'zh-CN') {
    subject = '你的单独问事已结案';
    heading = advisorClosed ? '你的单独问事已结案' : (hasReply ? '你的追问已回复' : '感谢你的信任');
    bodyLine = advisorClosed
      ? `你关于「${label}」的单独问事，因 ${IDLE_CLOSE_DAYS} 天没有新的追问，已由命理师结案。完整回复仍可随时查看；若之后有新的问题，欢迎另外提交一则问事。`
      : hasReply
        ? `你关于「${label}」的追问已回复，本次单独问事已完成。`
        : `感谢你选择 FuSang Vision，就「${label}」向我们提问。本次单独问事已结案。`;
    reviewNote = '若你还没看完整回复，可随时点击下方连结参阅。';
    cta = '查看完整回复';
  } else {
    subject = '你的單獨問事已結案';
    heading = advisorClosed ? '你的單獨問事已結案' : (hasReply ? '你的追問已回覆' : '感謝你的信任');
    bodyLine = advisorClosed
      ? `你關於「${label}」的單獨問事，因 ${IDLE_CLOSE_DAYS} 天沒有新的追問，已由命理師結案。完整回覆仍可隨時查看；若之後有新的問題，歡迎另外提交一則問事。`
      : hasReply
        ? `你關於「${label}」的追問已回覆，本次單獨問事已完成。`
        : `感謝你選擇 FuSang Vision，就「${label}」向我們提問。本次單獨問事已結案。`;
    reviewNote = '若你還沒看完整回覆，可隨時點擊下方連結參閱。';
    cta = '查看完整回覆';
  }

  const ref = String(t.id).slice(0, 8);
  const html = mailHtml({
    heading, body: bodyLine, previewText: pv, link, cta, lang,
    withSignature: true, reviewNote, blessing: bl, refCode: ref,
  });
  const text = `${heading}\n${REF_LABEL[lang]} · ${ref}\n\n${bodyLine}\n\n${pv ? pv + '\n\n' : ''}${reviewNote}\n${cta}: ${link}\n\n「${bl.quote}」\n${bl.wish}\n\n— ${SIGNER}, FuSang Vision`;
  await brevoSend(t.user_email, subject, html, text);
}

// ─── admin 信 ───
async function sendAdminMail(event: string, t: any) {
  const label = SUBJ['zh-TW'][t.subject] ?? t.subject;
  const link = `${PORTAL}/admin-tickets.html`;
  let subject = '', heading = '', bodyLine = '';

  if (event === 'paid') {
    subject = '[新工單] 有一筆已付款的單獨問事待回覆';
    heading = '新的單獨問事';
    bodyLine = `客戶 ${t.user_email} 的「${label}」已付款，請於 7 天內回覆。`;
  } else {
    subject = '[追問] 客戶已追問，待回覆';
    heading = '客戶提出追問';
    bodyLine = `客戶 ${t.user_email} 對「${label}」提出追問，請回覆。`;
  }

  const ref = String(t.id).slice(0, 8);
  const html = mailHtml({ heading, body: bodyLine, link, cta: '前往後台', lang: 'zh-TW', refCode: ref });
  const text = `${heading}\n諮詢編號 · ${ref}\n\n${bodyLine}\n\n前往後台: ${link}`;
  await brevoSend(ADMIN_EMAIL, subject, html, text);
}

// ─── 信件模板 ───
function mailHtml(o: {
  heading: string; body: string; link: string; cta: string; lang: string;
  refCode?: string;
  previewText?: string; withSignature?: boolean; reviewNote?: string;
  reasonBox?: { label: string; text: string };
  blessing?: { quote: string; wish: string };
}): string {
  const previewLabel = PREVIEW_LABEL[o.lang as Lang] ?? PREVIEW_LABEL['zh-TW'];
  const refLabel = REF_LABEL[o.lang as Lang] ?? REF_LABEL['zh-TW'];
  const disclaimer = DISCLAIMER[o.lang as Lang] ?? DISCLAIMER['zh-TW'];

  const refBlock = o.refCode
    ? `<div style="font-size:12px;color:#8fa2a4;margin:0 0 20px;letter-spacing:.02em;">${refLabel} · <span style="font-family:monospace;color:#5a7174;">${escapeHtml(o.refCode)}</span></div>`
    : '';

  const reasonBlock = o.reasonBox
    ? `<div style="margin:0 0 24px;padding:16px 18px;background:#f0e3e6;border-left:3px solid #7a3d4a;border-radius:0 4px 4px 0;">
         <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7a3d4a;margin-bottom:8px;">${escapeHtml(o.reasonBox.label)}</div>
         <div style="font-size:14px;line-height:1.85;color:#2d4a4d;white-space:pre-wrap;">${escapeHtml(o.reasonBox.text)}</div>
       </div>`
    : '';

  const previewBlock = o.previewText
    ? `<div style="margin:0 0 24px;padding:16px 18px;background:#f4efe6;border-left:3px solid #b8945c;border-radius:0 4px 4px 0;">
         <div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#b8945c;margin-bottom:8px;">${previewLabel}</div>
         <div style="font-size:14px;line-height:1.85;color:#2d4a4d;">${escapeHtml(o.previewText)}</div>
       </div>`
    : '';

  const reviewBlock = o.reviewNote
    ? `<p style="font-size:13px;line-height:1.7;color:#5a7174;margin:0 0 20px;">${escapeHtml(o.reviewNote)}</p>`
    : '';

  const blessingBlock = o.blessing
    ? `<div style="margin:28px 0 4px;padding-top:24px;border-top:1px solid #e0dbcf;">
         <p style="font-family:Georgia,serif;font-style:italic;font-size:15px;line-height:1.7;color:#15363a;margin:0 0 10px;">“${escapeHtml(o.blessing.quote)}”</p>
         <p style="font-size:14px;line-height:1.7;color:#5a7174;margin:0;">${escapeHtml(o.blessing.wish)}</p>
       </div>`
    : '';

  const signatureBlock = o.withSignature
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;border-collapse:collapse;">
         <tr>
           <td style="padding-right:14px;vertical-align:middle;">
             <img src="${AVATAR}" width="56" height="56" alt="${SIGNER}"
                  style="display:block;width:56px;height:56px;border-radius:10px;object-fit:cover;object-position:center top;" />
           </td>
           <td style="vertical-align:middle;">
             <div style="font-size:15px;font-weight:500;color:#15363a;">${SIGNER}</div>
             <div style="font-size:12px;color:#8fa2a4;letter-spacing:.04em;">FuSang Vision</div>
           </td>
         </tr>
       </table>`
    : '';

  return `<div style="font-family:'Noto Serif TC',Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#15363a;">
    <div style="font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#b8945c;margin-bottom:16px;">FuSang Vision</div>
    <h2 style="font-weight:500;font-size:22px;margin:0 0 12px;">${escapeHtml(o.heading)}</h2>
    ${refBlock}
    <p style="font-size:15px;line-height:1.8;color:#2d4a4d;margin:0 0 24px;">${escapeHtml(o.body)}</p>
    ${reasonBlock}
    ${previewBlock}
    ${reviewBlock}
    <a href="${o.link}" style="display:inline-block;background:#15363a;color:#faf7f1;text-decoration:none;font-size:15px;padding:13px 26px;border-radius:3px;">${escapeHtml(o.cta)}</a>
    ${blessingBlock}
    ${signatureBlock}
    <p style="font-size:12px;color:#8fa2a4;margin:32px 0 0;line-height:1.7;">${escapeHtml(disclaimer)}</p>
  </div>`;
}

async function brevoSend(to: string, subject: string, htmlContent: string, textContent: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: to }],
      subject,
      htmlContent,
      textContent,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error('Brevo send failed:', res.status, detail);
    throw new Error(`brevo_${res.status}`);
  }
  console.log('Brevo sent to', to);
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string));
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
