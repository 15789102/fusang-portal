import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// PT-006 notify-annual-request
//   用戶索取 2027 年報後，寄一封繁中通知給管理者。
//   · 呼叫：前端在 request_annual_report 回傳 created=true 後呼叫，body { request_id }。
//   · 授權：呼叫者必須是該筆索取的擁有者（auth.getUser(token).id === user_id）。
//   · 防重複：以 notified_at 原子性佔位（只在 notified_at 為 null 時寄），
//     同一筆最多寄一封；寄信失敗時把 notified_at 還原為 null，方便日後重送。
//   · 寄信失敗不影響索取本身（索取已在 RPC 完成）。
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const SENDER = { name: 'FuSang Vision', email: 'info@fusang-vision.com' };
const RECIPIENTS = ['support@fusang-vision.com', 'ben880153@gmail.com'];
const PORTAL = Deno.env.get('PORTAL_BASE_URL') ?? 'https://15789102.github.io/fusang-portal';

const LANG_LABEL: Record<string, string> = {
  'zh-TW': '繁體中文（zh-TW）',
  'zh-CN': '簡體中文（zh-CN）',
  'en': '英文（en）',
  'ja': '日文（ja）',
  'ko': '韓文（ko）',
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

    try {
      await sendAdminMail(row);
    } catch (e) {
      await supabase.from('annual_report_requests').update({ notified_at: null }).eq('id', requestId);
      throw e;
    }

    console.log('notify-annual-request: sent', requestId);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('notify-annual-request error:', String((err as any)?.message ?? err));
    return json({ error: 'internal' }, 500);
  }
});

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

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: RECIPIENTS.map((email) => ({ email })),
      subject,
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
