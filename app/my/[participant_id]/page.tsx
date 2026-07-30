'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  // ★ URLエンコードされたIDを元の日本語（「ヒロトん」など）にデコードする
  const rawId = resolvedParams.id || '';
  const participantId = decodeURIComponent(rawId);

  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!participantId) return;

    async function fetchUserData() {
      setLoading(true);

      // デコードした participantId で検索
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('participant_id', participantId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('データ取得エラー:', error);
      } else if (data) {
        setSurveys(data);
      }
      setLoading(false);
    }

    fetchUserData();
  }, [participantId]);

  const preSurvey = surveys.find(s => s.timing_type === 'pre');
  const postSurvey = surveys.find(s => s.timing_type === 'post');

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 font-sans space-y-6">
      
      {/* ヘッダーカード */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-bold">
            Well-being Timeline
          </span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">マイダッシュボード</h1>
          {/* デコード後のIDを表示 */}
          <p className="text-sm text-gray-500 mt-1">ID: <span className="font-semibold text-gray-700">{participantId}</span></p>
        </div>
      </div>

      {/* スコア経時推移カード */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
          ウェルビーイング スコアの経時推移
        </h2>

        {loading ? (
          <p className="text-center text-gray-400 py-8">読み込み中...</p>
        ) : surveys.length === 0 ? (
          <p className="text-center text-gray-400 py-8">データがまだありません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preSurvey && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-xs font-bold text-blue-600">事前 (Pre)</span>
                <p className="text-2xl font-black text-blue-900 mt-1">
                  {preSurvey.total_mean ? Number(preSurvey.total_mean).toFixed(2) : '0.00'}
                  <span className="text-xs text-gray-500 font-normal ml-1">/ 5.0</span>
                </p>
              </div>
            )}
            {postSurvey && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <span className="text-xs font-bold text-green-600">事後 (Post)</span>
                <p className="text-2xl font-black text-green-900 mt-1">
                  {postSurvey.total_mean ? Number(postSurvey.total_mean).toFixed(2) : '0.00'}
                  <span className="text-xs text-gray-500 font-normal ml-1">/ 5.0</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* アクティビティ・イベント履歴カード */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">
          アクティビティ・イベント履歴
        </h2>
        {surveys.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {surveys.map((s) => (
              <li key={s.id} className="py-3 flex justify-between items-center text-sm">
                <div>
                  <span className={`font-bold mr-2 ${s.timing_type === 'post' ? 'text-green-600' : 'text-blue-600'}`}>
                    {s.timing_type === 'post' ? '[事後]' : '[事前]'}
                  </span>
                  <span className="text-gray-700">アンケート回答</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-400 py-8">履歴はありません。</p>
        )}
      </div>

    </div>
  );
}