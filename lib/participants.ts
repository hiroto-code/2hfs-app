import { supabase } from '@/lib/supabase';

// メールアドレスから研究用ID(research_participant_id)を解決する。
// 個人情報テーブル(participant_pii)への直接アクセスはRLSでブロックされているため、
// この関数（DB側のSECURITY DEFINER関数 get_or_create_research_participant）が唯一の入り口。
export async function getOrCreateResearchParticipantId(
  email: string,
  displayName?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_research_participant', {
    p_email: email,
    p_display_name: displayName || null,
  });

  if (error) throw new Error(error.message);
  return data as string;
}
