import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// PT-006 notify-annual-request
//   用戶索取 2027 年報後寄出兩封信：
//     ① 管理者通知（繁中）→ support@ + ben880153@gmail.com
//     ② 用戶索取確認信（v2，2026-10-19）→ 用戶本人，語言依索取當下的 ui_lang（五語）
//   · 呼叫：前端在 request_annual_report 回傳 created=true 後呼叫，body { request_id }。
//   · 授權：呼叫者必須是該筆索取的擁有者（auth.getUser(token).id === user_id）。
//   · 防重複：以 notified_at 原子性佔位（只在 notified_at 為 null 時寄），同一筆最多寄一次。
//   · 兩封各自 try/catch：一封失敗不影響另一封；兩封都失敗才把 notified_at 還原為 null，
//     方便日後重送（只成功一封時不還原，避免重送造成另一封重複）。
//   · 寄信失敗不影響索取本身（索取已在 RPC 完成）。
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const SENDER = { name: 'FuSang Vision', email: 'info@fusang-vision.com' };
const ADMIN_RECIPIENTS = ['support@fusang-vision.com', 'ben880153@gmail.com'];
const PORTAL = Deno.env.get('PORTAL_BASE_URL') ?? 'https://15789102.github.io/fusang-portal';
const AVATAR = Deno.env.get('EMAIL_AVATAR_URL') ?? `${PORTAL}/assets/rs-fusang.webp`;
const SIGNER = 'R.S. Chen';

type Lang = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko';
function langOf(raw: string | null): Lang {
  if (raw === 'zh-CN' || raw === 'en' || raw === 'ja' || raw === 'ko') return raw;
  return 'zh-TW';
}

const LANG_LABEL: Record<string, string> = {
  'zh-TW': '繁體中文（zh-TW）',
  'zh-CN': '簡體中文（zh-CN）',
  'en': '英文（en）',
  'ja': '日文（ja）',
  'ko': '韓文（ko）',
};

// 用戶確認信文案（Ben 2026-10-19 核准；ja / ko 待語言專家審）
const USER_MAIL: Record<Lang, { subject: string; heading: string; body: string; tip: string; cta: string }> = {
  'zh-TW': {
    subject: '已收到你的 2027 年報索取',
    heading: '已收到你的索取',
    body: '你的 2027 年報會在 2–3 天內寄到這個信箱，並以你索取時使用的語言撰寫。年報由 R.S. Chen 依紫微斗數判讀規則，對照你的三層命盤撰寫，確認後寄出。',
    tip: '為了確保收得到，可以把 info@fusang-vision.com 加入聯絡人。',
    cta: '前往 2027 專區',
  },
  'zh-CN': {
    subject: '已收到你的 2027 年报索取',
    heading: '已收到你的索取',
    body: '你的 2027 年报会在 2–3 天内寄到这个邮箱，并以你索取时使用的语言撰写。年报由 R.S. Chen 依紫微斗数判读规则，对照你的三层命盘撰写，确认后寄出。',
    tip: '为了确保收得到，可以把 info@fusang-vision.com 加入联系人。',
    cta: '前往 2027 专区',
  },
  'en': {
    subject: 'We have received your 2027 report request',
    heading: 'We have received your request',
    body: 'Your 2027 report will be sent to this email within 2 to 3 days, written in the language you used when requesting. R.S. Chen writes it by checking your three chart layers against the Zi Wei Dou Shu reading rules, and reviews it before it is sent.',
    tip: 'To make sure it reaches you, add info@fusang-vision.com to your contacts.',
    cta: 'Go to the 2027 page',
  },
  'ja': {
    subject: '2027年 年報のお申し込みを受け付けました',
    heading: 'お申し込みを受け付けました',
    body: '2027年 年報は2〜3日以内に、このメールアドレスへお送りします。お申し込み時にお使いの言語で作成します。年報は R.S. Chen が紫微斗数の読み解きルールに照らして三層の命盤を確認しながら作成し、確認してからお送りします。',
    tip: '確実に届くよう、info@fusang-vision.com を連絡先に追加しておいてください。',
    cta: '2027年 特集へ',
  },
  'ko': {
    subject: '2027 연간 리포트 신청이 접수되었어요',
    heading: '신청이 접수되었어요',
    body: '2027 연간 리포트는 2~3일 이내에 이 이메일로 보내 드려요. 신청할 때 사용하신 언어로 작성돼요. 리포트는 R.S. Chen이 자미두수 해석 규칙에 따라 세 층의 명반을 확인하며 작성하고, 직접 확인한 뒤 보내 드려요.',
    tip: '메일을 확실히 받으실 수 있도록 info@fusang-vision.com을 연락처에 추가해 주세요.',
    cta: '2027 페이지로 가기',
  },
};

// 信件底部免責聲明（與 notify-ticket / submit_birth_data 同一組句子）
const DISCLAIMER: Record<Lang, string> = {
  'zh-TW': '本服務為紫微斗數命理諮詢，不提供醫療、法律、投資等專業意見。',
  'zh-CN': '本服务为紫微斗数命理咨询，不提供医疗、法律、投资等专业意见。',
  'en': 'This service offers Zi Wei Dou Shu readings and does not provide medical, legal, investment, or other professional advice.',
  'ja': '本サービスは紫微斗数による命理の相談であり、医療・法律・投資などの専門的な助言は提供しておりません。',
  'ko': '본 서비스는 자미두수 해석 상담이며, 의료·법률·투자 등 전문적인 조언은 제공하지 않습니다.',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!token) return json({ error: 'no_auth' }, 401);

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      console.error('notify-annual-request: invalid user token');
      return json({ error: 'forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const requestId = body?.request_id;
    if (!requestId || typeof requestId !== 'string') return json({ error: 'bad_request' }, 400);

    const { data: row, error: rErr } = await supabase
      .from('annual_report_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (rErr || !row) {
      console.error('notify-annual-request: not_found', requestId, rErr?.message);
      return json({ error: 'not_found' }, 404);
    }
    if (row.user_id !== user.id) {
      console.error('notify-annual-request: forbidden (not owner)');
      return json({ error: 'forbidden' }, 403);
    }

    // 原子性佔位：只有 notified_at 為 null 的那一次會拿到列
    const { data: claimed, error: cErr } = await supabase
      .from('annual_report_requests')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', requestId)
      .is('notified_at', null)
      .select('id');
    if (cErr) throw new Error(`claim_failed: ${cErr.message}`);
    if (!claimed || claimed.length === 0) {
      console.log('notify-annual-request: already notified', requestId);
      return json({ ok: true, skipped: 'already_notified' }, 200);
    }

    // 兩封各自獨立；用戶信先寄（優先級較高）
    let userOk = false, adminOk = false;
    try {
      await sendUserMail(row);
      userOk = true;
    } catch (e) {
      console.error('notify-annual-request: user mail failed:', String((e as any)?.message ?? e));
    }
    try {
      await sendAdminMail(row);
      adminOk = true;
    } catch (e) {
      console.error('notify-annual-request: admin mail failed:', String((e as any)?.message ?? e));
    }

    if (!userOk && !adminOk) {
      await supabase.from('annual_report_requests').update({ notified_at: null }).eq('id', requestId);
      return json({ error: 'mail_failed' }, 500);
    }

    console.log('notify-annual-request: sent', requestId, { userOk, adminOk });
    return json({ ok: true, user: userOk, admin: adminOk }, 200);
  } catch (err) {
    console.error('notify-annual-request error:', String((err as any)?.message ?? err));
    return json({ error: 'internal' }, 500);
  }
});

// ─── 用戶確認信（五語）───
async function sendUserMail(r: any) {
  const lang = langOf(r.ui_lang);
  const c = USER_MAIL[lang];
  const link = `${PORTAL}/annual-2027.html`;

  const html = `<div style="font-family:'Noto Serif TC',Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#15363a;">
    <div style="font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#b8945c;margin-bottom:16px;">FuSang Vision</div>
    <h2 style="font-weight:500;font-size:22px;margin:0 0 16px;">${escapeHtml(c.heading)}</h2>
    <p style="font-size:15px;line-height:1.8;color:#2d4a4d;margin:0 0 16px;">${escapeHtml(c.body)}</p>
    <p style="font-size:13px;line-height:1.7;color:#5a7174;margin:0 0 24px;">${escapeHtml(c.tip)}</p>
    <a href="${link}" style="display:inline-block;background:#15363a;color:#faf7f1;text-decoration:none;font-size:15px;padding:13px 26px;border-radius:3px;">${escapeHtml(c.cta)}</a>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;border-collapse:collapse;">
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
    </table>
    <p style="font-size:12px;color:#8fa2a4;margin:32px 0 0;line-height:1.7;">${escapeHtml(DISCLAIMER[lang])}</p>
  </div>`;
  const text = `${c.heading}\n\n${c.body}\n\n${c.tip}\n\n${c.cta}: ${link}\n\n— ${SIGNER}, FuSang Vision\n\n${DISCLAIMER[lang]}`;

  await brevoSend([r.user_email], c.subject, html, text);
}

// ─── 管理者通知（繁中）───
async function sendAdminMail(r: any) {
  const lang = LANG_LABEL[r.ui_lang] ?? r.ui_lang;
  const when = new Date(r.requested_at).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const link = `${PORTAL}/admin-annual-requests.html`;
  const subject = `[2027 年報索取] ${r.user_email}（${r.ui_lang}）`;

  const rows: [string, string][] = [
    ['Email', r.user_email],
    ['年報語言', lang],
    ['索取時間', `${when}（台北時間）`],
  ];

  const html = `<div style="font-family:'Noto Serif TC',Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#15363a;">
    <div style="font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#b8945c;margin-bottom:16px;">FuSang Vision</div>
    <h2 style="font-weight:500;font-size:22px;margin:0 0 12px;">新的 2027 年報索取</h2>
    <p style="font-size:15px;line-height:1.8;color:#2d4a4d;margin:0 0 20px;">請於 2–3 天內依下列語言撰寫並寄出年報。</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;font-size:14px;">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#8fa2a4;white-space:nowrap;">${k}</td><td style="padding:6px 0;color:#15363a;">${escapeHtml(v)}</td></tr>`).join('')}
    </table>
    <a href="${link}" style="display:inline-block;background:#15363a;color:#faf7f1;text-decoration:none;font-size:15px;padding:13px 26px;border-radius:3px;">前往索取名單</a>
  </div>`;
  const text = `新的 2027 年報索取\n\n請於 2–3 天內依下列語言撰寫並寄出年報。\n\n${rows.map(([k, v]) => `${k}：${v}`).join('\n')}\n\n前往索取名單：${link}`;

  await brevoSend(ADMIN_RECIPIENTS, subject, html, text);
}

async function brevoSend(to: string[], subject: string, htmlContent: string, textContent: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: to.map((email) => ({ email })),
      subject,
      htmlContent,
      textContent,
    }),
  });
  if (!res.ok) {
    console.error('Brevo send failed:', res.status, await res.text());
    throw new Error(`brevo_${res.status}`);
  }
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
