import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// PT-007 admin-annual-report：後台填寫 2027 年報並寄出「年報已完成」通知
//   body { request_id, report_body }
//   · 授權：只有 admin（user_profiles.is_admin）可呼叫。
//   · 每次呼叫都儲存全文（report_body / report_updated_at）。
//   · 第一次（status='requested'）：原子性佔位改為 sent，寄五語通知信給客戶；
//     寄信失敗 → 狀態還原為 requested（全文保留），回 500，可再按一次重寄。
//   · 已寄出（status='sent'）：只更新全文，不再寄信（Ben 2026-10-19：可修改、不重寄）。
//   · 通知信不提優惠碼；回覆地址設為 support@，客戶直接回信即可留下感受。
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const SENDER = { name: 'FuSang Vision', email: 'info@fusang-vision.com' };
const REPLY_TO = { email: 'support@fusang-vision.com', name: 'FuSang Vision' };
const PORTAL = Deno.env.get('PORTAL_BASE_URL') ?? 'https://15789102.github.io/fusang-portal';
const AVATAR = Deno.env.get('EMAIL_AVATAR_URL') ?? `${PORTAL}/assets/rs-fusang.webp`;
const SIGNER = 'R.S. Chen';
const MAX_LEN = 60000;

type Lang = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko';
function langOf(raw: string | null): Lang {
  if (raw === 'zh-CN' || raw === 'en' || raw === 'ja' || raw === 'ko') return raw;
  return 'zh-TW';
}

// 「年報已完成」通知信（Ben 2026-10-19 核准；ja / ko 待語言專家審）
const READY_MAIL: Record<Lang, { subject: string; body: string; feedback: string; cta: string }> = {
  'zh-TW': {
    subject: '你的 2027 年報已完成',
    body: '你的 2027 年報已經完成。登入 FuSang Vision 的 2027 專區就能閱讀全文，之後也可以隨時回來查看，或存成 PDF 留存。',
    feedback: '讀完之後，如果有任何感受或想法，歡迎直接回覆這封信告訴我。',
    cta: '閱讀我的 2027 年報',
  },
  'zh-CN': {
    subject: '你的 2027 年报已完成',
    body: '你的 2027 年报已经完成。登录 FuSang Vision 的 2027 专区就能阅读全文，之后也可以随时回来查看，或存成 PDF 留存。',
    feedback: '读完之后，如果有任何感受或想法，欢迎直接回复这封信告诉我。',
    cta: '阅读我的 2027 年报',
  },
  'en': {
    subject: 'Your 2027 report is ready',
    body: 'Your 2027 report is ready. Sign in to the 2027 page on FuSang Vision to read it in full. You can come back to it anytime, or save it as a PDF.',
    feedback: 'After reading, if anything stays with you or you have thoughts to share, just reply to this email.',
    cta: 'Read my 2027 report',
  },
  'ja': {
    subject: '2027年 年報が完成しました',
    body: 'あなたの2027年 年報が完成しました。FuSang Vision の2027年 特集にログインすると、全文をお読みいただけます。いつでも見返したり、PDF として保存したりできます。',
    feedback: '読み終えて感じたことやご意見があれば、このメールに返信してお聞かせください。',
    cta: '2027年 年報を読む',
  },
  'ko': {
    subject: '2027 연간 리포트가 완성되었어요',
    body: '나의 2027 연간 리포트가 완성되었어요. FuSang Vision의 2027 페이지에 로그인하면 전체 내용을 읽을 수 있어요. 언제든 다시 보거나 PDF로 저장할 수 있어요.',
    feedback: '읽어 보시고 느낀 점이나 생각이 있다면 이 메일에 답장으로 들려주세요.',
    cta: '2027 연간 리포트 읽기',
  },
};

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
    if (!(await callerIsAdmin(token))) {
      console.error('admin-annual-report: forbidden (not admin)');
      return json({ error: 'forbidden' }, 403);
    }

    const payload = await req.json().catch(() => ({}));
    const requestId = payload?.request_id;
    const raw = payload?.report_body;
    if (!requestId || typeof requestId !== 'string' || typeof raw !== 'string') {
      return json({ error: 'bad_request' }, 400);
    }
    const body = raw.replace(/\r\n/g, '\n').trim();
    if (!body) return json({ error: 'empty_body' }, 400);
    if (body.length > MAX_LEN) return json({ error: 'too_long' }, 400);

    const { data: row, error: rErr } = await supabase
      .from('annual_report_requests').select('*').eq('id', requestId).maybeSingle();
    if (rErr || !row) return json({ error: 'not_found' }, 404);
    if (row.status === 'cancelled') return json({ error: 'cancelled' }, 409);

    const now = new Date().toISOString();

    // 1) 儲存全文（每次都存）
    const { error: sErr } = await supabase
      .from('annual_report_requests')
      .update({ report_body: body, report_updated_at: now })
      .eq('id', requestId);
    if (sErr) throw new Error(`save_failed: ${sErr.message}`);

    // 2) 第一次寄出：原子性佔位 requested → sent
    const { data: claimed, error: cErr } = await supabase
      .from('annual_report_requests')
      .update({ status: 'sent', sent_at: now })
      .eq('id', requestId)
      .eq('status', 'requested')
      .select('id');
    if (cErr) throw new Error(`claim_failed: ${cErr.message}`);

    if (!claimed || claimed.length === 0) {
      console.log('admin-annual-report: updated (no mail)', requestId);
      return json({ ok: true, mailed: false, status: 'sent' }, 200);
    }

    try {
      await sendReadyMail(row);
    } catch (e) {
      await supabase.from('annual_report_requests')
        .update({ status: 'requested', sent_at: null })
        .eq('id', requestId);
      console.error('admin-annual-report: mail failed:', String((e as any)?.message ?? e));
      return json({ error: 'mail_failed', saved: true }, 500);
    }

    console.log('admin-annual-report: sent', requestId);
    return json({ ok: true, mailed: true, status: 'sent' }, 200);
  } catch (err) {
    console.error('admin-annual-report error:', String((err as any)?.message ?? err));
    return json({ error: 'internal' }, 500);
  }
});

async function callerIsAdmin(token: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return false;
    const { data: prof } = await supabase
      .from('user_profiles').select('is_admin').eq('id', user.id).single();
    return prof?.is_admin === true;
  } catch (_) { return false; }
}

async function sendReadyMail(r: any) {
  const lang = langOf(r.ui_lang);
  const c = READY_MAIL[lang];
  const link = `${PORTAL}/annual-2027.html`;

  const html = `<div style="font-family:'Noto Serif TC',Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#15363a;">
    <div style="font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#b8945c;margin-bottom:16px;">FuSang Vision</div>
    <h2 style="font-weight:500;font-size:22px;margin:0 0 16px;">${escapeHtml(c.subject)}</h2>
    <p style="font-size:15px;line-height:1.8;color:#2d4a4d;margin:0 0 24px;">${escapeHtml(c.body)}</p>
    <a href="${link}" style="display:inline-block;background:#15363a;color:#faf7f1;text-decoration:none;font-size:15px;padding:13px 26px;border-radius:3px;">${escapeHtml(c.cta)}</a>
    <p style="font-size:14px;line-height:1.8;color:#2d4a4d;margin:28px 0 0;">${escapeHtml(c.feedback)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;border-collapse:collapse;">
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
  const text = `${c.subject}\n\n${c.body}\n\n${c.cta}: ${link}\n\n${c.feedback}\n\n— ${SIGNER}, FuSang Vision\n\n${DISCLAIMER[lang]}`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      replyTo: REPLY_TO,
      to: [{ email: r.user_email }],
      subject: c.subject,
      htmlContent: html,
      textContent: text,
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
