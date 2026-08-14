import { createClient } from '@supabase/supabase-js';

// サーバー側専用（API Route等）。SUPABASE_SERVICE_ROLE_KEYはRLSを無視して
// 全テーブルにアクセスできるため、'use client' コンポーネントからは絶対に呼び出さないこと。
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
