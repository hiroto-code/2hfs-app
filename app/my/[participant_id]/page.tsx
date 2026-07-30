'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const params = useParams();

  // URLパラメータからID（メアド）を抽出
  const rawId = (params?.id as string) || (params?.participant_id as string) || '';
  
  let participantId = '';
  try {
    participantId = decodeURIComponent(rawId);
    if (participantId.includes('%')) {
      participantId = decodeURIComponent(participantId);
    }
  } catch (e) {
    participantId = rawId;
  }

  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (!participantId) {
      setLoading(false);
      setDebugInfo('URLから参加者ID（またはメールアドレス）を読み込めませんでした。');
      return;
    }

    async function fetchUserData() {
      setLoading(true);
      setDebugInfo('');

      try {
        const { data, error } = await supabase
          .from('surveys')
          .select('*')
          .eq('participant_id', participantId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('データ取得エラー:', error);
          setDebugInfo(`DBエラー: ${error.message}`);
        } else if (data) {
          setSurveys(data);
          if (data.length === 0) {
            setDebugInfo(`「${participantId}」で検索しましたが、該当する回答データが0件でした。`);
          }
        }
      } catch (err: any) {
        setDebugInfo(`予期せぬエラー: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [participantId]);

  // 点数(total_mean)が入っている最新のデータを優先して取得
  const validSurveys = [...surveys].reverse(); // 新しい順にする
  const preSurvey = validSurveys.find(s => s.timing_type === 'pre' && s.total_mean != null) || surveys.find(s => s.timing_type === 'pre');
  const postSurvey = validSurveys.find(s => s.timing_type === 'post' && s.total_mean != null) || surveys.find(s => s.timing_type === 'post');

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 font-sans space-y-6 bg-gray-50 min-h-screen">
      
      {/* ヘッダーカード */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-bold">
            Well-being Timeline
          </span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">マイダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">
            ID: <span className="font-semibold text-gray-700">{participantId || '(未指定)'}</span>
          </p>
        </div>
        <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm text-sm transition-colors">
          ＋ プライベートログを追加
        </Link>
      </div>

      {/* デバッグ・お知らせ枠 */}
      {debugInfo && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm">
          <p className="text-sm text-yellow-800 font-bold">※開発者用メッセージ</p>
          <p className="text-xs text-yellow-700 mt-1">{debugInfo}</p>
        </div>
      )}

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
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl relative overflow-hidden">
                <span className="text-xs font-bold text-blue-600 relative z-10">事前 (Pre)</span>
                <p className="text-3xl font-black text-blue-900 mt-1 relative z-10">
                  {preSurvey.total_mean ? Number(preSurvey.total_mean).toFixed(2) : '0.00'}
                  <span className="text-sm text-gray-500 font-normal ml-1">/ 5.0</span>
                </p>
                <p className="text-xs text-gray-500 mt-2 relative z-10">
                  合計: {preSurvey.total_sum ?? '-'} 点
                </p>
              </div>
            )}
            {postSurvey && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl relative overflow-hidden">
                <span className="text-xs font-bold text-green-600 relative z-10">事後 (Post)</span>
                <p className="text-3xl font-black text-green-900 mt-1 relative z-10">
                  {postSurvey.total_mean ? Number(postSurvey.total_mean).toFixed(2) : '0.00'}
                  <span className="text-sm text-gray-500 font-normal ml-1">/ 5.0</span>
                </p>
                <p className="text-xs text-gray-500 mt-2 relative z-10">
                  合計: {postSurvey.total_sum ?? '-'} 点
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
              <li key={s.id} className="py-4 flex justify-between items-center text-sm hover:bg-gray-50 transition-colors px-2 rounded-lg -mx-2">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.timing_type === 'post' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <span className={`font-bold mr-2 ${s.timing_type === 'post' ? 'text-green-700' : 'text-blue-700'}`}>
                      {s.timing_type === 'post' ? '[事後]' : '[事前]'}
                    </span>
                    <span className="text-gray-700 font-medium">アンケート回答</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                  {new Date(s.created_at).toLocaleDateString('ja-JP')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8">
            <div className="inline-block p-4 bg-gray-50 rounded-full mb-3">
              <span className="text-2xl opacity-50">📝</span>
            </div>
            <p className="text-gray-400">履歴はありません。</p>
          </div>
        )}
      </div>

    </div>
  );
}