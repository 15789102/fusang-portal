// supabase/functions/delete-my-account/index.ts
// PT-014：客人在帳戶頁自己刪除帳號。
//
// 身分一律從 JWT 取（auth.getUser），請求 body 完全不讀。
// 順序：身分 → 登入新鮮度（24 小時）→ 管理者／進行中訂閱檢查
//       → public.delete_account_data(JWT 的 email) → auth.admin.deleteUser(JWT 的 id)。
// 資料與 auth 的刪除不是同一個交易：auth 刪除失敗時回 auth_delete_failed，
// log 標 DATA_PURGED_AUTH_REMAINS，需人工到 Dashboard → Authentication 刪除。
//
// log 只記 user_id、request_id、步驟與筆數。不記 email、JWT、出生資料、body。
// delete_account_data 回傳「已刪除 <email> | 表:筆數 …」，記錄前先去掉 | 之前的部分。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const DEFAULT_ALLOWED_ORIGINS = 'https://portal.fusang-vision.com,https://15789102.github.io';
const ALLOWED_ORIGINS: string[] = (Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED_ORIGINS)
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter((s) => s.length > 0);

const MAX_AUTH_AGE_SEC = 24 * 60 * 60;
const BLOCKING_SUB_STATUS = ['active', 'trialing', 'past_due'];

function buildCors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin.replace(/\/+$/, ''))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

// 把字串裡出現的 email 換成 [email]（大小寫不分）。
function scrub(text: unknown, email: string | null): string | null {
  if (text === null || text === undefined) return null;
  let s = String(text);
  if (email) {
    const esc = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(esc, 'gi'), '[email]');
  }
  return s;
}

function logErr(
  requestId: string,
  step: string,
  err: any,
  email: string | null,
  extra?: Record<string, unknown>,
): void {
  console.error(JSON.stringify({
    scope: 'delete-my-account',
    step,
    request_id: requestId,
    code: err?.code ?? null,
    message: scrub(err?.message ?? err, email),
    details: scrub(err?.details, email),
    hint: scrub(err?.hint, email),
    ...(extra ?? {}),
    at: new Date().toISOString(),
  }));
}

// 解 JWT payload（簽章已由平台 verify_jwt 與 auth.getUser 驗過，這裡只讀 amr）。
function lastAuthTime(jwt: string): number | null {
  try {
    const part = jwt.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    const amr = Array.isArray(payload?.amr) ? payload.amr : [];
    let max: number | null = null;
    for (const a of amr) {
      const t = Number(a?.timestamp);
      if (Number.isFinite(t) && (max === null || t > max)) max = t;
    }
    return max;
  } catch (_) {
    return null;
  }
}

// 只取「表:筆數」部分；格式不符就不記內容。
function countsOnly(result: unknown): { counts?: string; parse_failed?: true } {
  if (typeof result !== 'string') return { parse_failed: true };
  const i = result.indexOf('|');
  if (i < 0) return { parse_failed: true };
  return { counts: result.slice(i + 1).trim() };
}

Deno.serve(async (req) => {
  const cors = buildCors(req);
  const requestId = crypto.randomUUID();

  function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify({ ...body, request_id: requestId }), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let email: string | null = null;
  let userId: string | null = null;

  try {
    // 1) 身分：只從 JWT 取
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'not_authenticated' }, 401);

    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser(jwt);
    if (userErr || !user) return json({ error: 'not_authenticated' }, 401);

    userId = user.id;
    email = user.email ?? null;
    if (!email) return json({ error: 'no_email' }, 400);

    // 2) 登入新鮮度
    const authAt = lastAuthTime(jwt);
    const nowSec = Math.floor(Date.now() / 1000);
    if (authAt === null || nowSec - authAt > MAX_AUTH_AGE_SEC) {
      return json({ error: 'reauth_required' }, 403);
    }

    const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 3) 管理者、進行中訂閱
    const { data: profile, error: profErr } = await svc
      .from('user_profiles')
      .select('is_admin, subscription_status')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) {
      logErr(requestId, 'profile_lookup', profErr, email, { user_id: userId });
      return json({ error: 'unexpected' }, 500);
    }
    if (profile?.is_admin === true) return json({ error: 'is_admin' }, 403);
    if (profile && BLOCKING_SUB_STATUS.includes(String(profile.subscription_status ?? ''))) {
      return json({ error: 'active_subscription' }, 409);
    }

    // 4) 刪資料
    const { data: purge, error: purgeErr } = await svc.rpc('delete_account_data', { p_email: email });
    if (purgeErr) {
      logErr(requestId, 'purge', purgeErr, email, { user_id: userId });
      return json({ error: 'purge_failed' }, 500);
    }

    // 5) 刪 auth 使用者
    const { error: authErr } = await svc.auth.admin.deleteUser(userId);
    if (authErr) {
      logErr(requestId, 'auth_delete', authErr, email, {
        user_id: userId,
        severity: 'DATA_PURGED_AUTH_REMAINS',
        ...countsOnly(purge),
      });
      return json({ error: 'auth_delete_failed' }, 500);
    }

    console.log(JSON.stringify({
      scope: 'delete-my-account',
      step: 'deleted',
      request_id: requestId,
      user_id: userId,
      ...countsOnly(purge),
      at: new Date().toISOString(),
    }));

    return json({ ok: true });
  } catch (e: any) {
    logErr(requestId, 'unexpected', e, email, { user_id: userId, stack: scrub(e?.stack, email) });
    return json({ error: 'unexpected' }, 500);
  }
});
