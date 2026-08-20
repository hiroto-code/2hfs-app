import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// 管理者ダッシュボード（Basic認証）配下からのみ呼ばれる想定のAPI。
// extra_question_responsesはRLSでSELECTを一切許可していないため、
// service_roleキーを使うこの経路だけが読み取り手段になる。
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) {
    return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('extra_question_responses')
    .select('id, display_name, answers, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
