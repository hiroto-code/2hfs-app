'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MyDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/mypage/login');
      return;
    }

    const email = session.user.email;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('participant_id')
      .eq('email', email)
      .single();

    if (profile?.participant_id) {
      const pId = profile.participant_id;

      const { data: mySurveys } = await supabase
        .from('surveys')
        .select('*')
        .eq('participant_id', pId);
      
      setSurveys(mySurveys || []);

      const eventIds = [...new Set((mySurveys || []).map(s => s.event_id))];
      if (eventIds.length > 0) {
        const { data: myEvents } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);
        setEvents(myEvents || []);
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/mypage/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">読み込み中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">マイダッシュボード</h1>
        <button onClick={handleLogout} className="text-sm font-bold text-gray-500 hover:text-gray-800">
          ログアウト
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border text-center text-gray-500">
          まだ参加したイベントのデータがありません。
        </div>
      ) : (
        <div className="space-y-6">
          {events.map(ev => {
            // 👇 ここを修正：それぞれの回答データを特定して、固有のトークンを取得するようにしました
            const myEventSurveys = surveys.filter(s => s.event_id === ev.id);
            const preSurvey = myEventSurveys.find(s => s.timing_type === 'pre');
            const postSurvey = myEventSurveys.find(s => s.timing_type === 'post');

            return (
              <div key={ev.id} className="bg-white p-6 rounded-2xl border shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-4">{ev.title}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 事前アンケート側 */}
                  <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-xl">
                    <h3 className="font-bold text-orange-800 mb-3">事前 (Pre)</h3>
                    {preSurvey ? (
                      <div className="flex gap-2">
                        {/* 👇 リンク先を submission_token に修正しました */}
                        <Link href={`/result/${preSurvey.submission_token}`} className="flex-1 text-center bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2 rounded-lg transition">
                          📊 結果を見る
                        </Link>
                        <Link href={`/p/${ev.id}/pre`} className="text-center bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-bold py-2 px-3 rounded-lg transition">
                          ✏️ やり直す
                        </Link>
                      </div>
                    ) : (
                      <Link href={`/p/${ev.id}/pre`} className="block w-full text-center bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold py-2 rounded-lg transition">
                        アンケートに回答する
                      </Link>
                    )}
                  </div>

                  {/* 事後アンケート側 */}
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <h3 className="font-bold text-emerald-800 mb-3">事後 (Post)</h3>
                    {postSurvey ? (
                      <div className="flex gap-2">
                        {/* 👇 リンク先を submission_token に修正しました */}
                        <Link href={`/result/${postSurvey.submission_token}`} className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition">
                          📊 結果を見る
                        </Link>
                        <Link href={`/p/${ev.id}/post`} className="text-center bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-bold py-2 px-3 rounded-lg transition">
                          ✏️ やり直す
                        </Link>
                      </div>
                    ) : (
                      <Link href={`/p/${ev.id}/post`} className="block w-full text-center bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold py-2 rounded-lg transition">
                        アンケートに回答する
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}