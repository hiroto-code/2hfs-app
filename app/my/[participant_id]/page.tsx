'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase'; // パスを階層に合わせて修正
import Link from 'next/link';

export default function MyDashboardPage({ params }: { params: Promise<{ participant_id: string }> }) {
  const { participant_id: rawId } = use(params);
  const participantId = decodeURIComponent(rawId);

  const [displayName, setDisplayName] = useState<string>('');
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // アンケート履歴等のデータ用ステート
  const [surveys, setSurveys] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // 1. プロフィール情報（display_name と email）を取得
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .or(`participant_id.eq.${participantId},email.eq.${participantId}`)
          .maybeSingle();

        if (profile) {
          // プロフィールに設定された表示名があれば最優先、無ければIDを使用
          setDisplayName(profile.display_name || profile.participant_id);
          setAccountEmail(profile.email || (participantId.includes('@') ? participantId : ''));
        } else {
          // プロフィール未登録の場合のフォールバック
          setDisplayName(participantId.includes('@') ? participantId.split('@')[0] : participantId);
          setAccountEmail(participantId.includes('@') ? participantId : '');
        }

        // 2. 該当ユーザーのアンケート履歴を取得
        const { data: surveyLogs, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('participant_id', participantId)
          .order('created_at', { ascending: false });

        if (!surveyError && surveyLogs) {
          setSurveys(surveyLogs);
        }

      } catch (err) {
        console.error('Fetch dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [participantId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans">
      {/* ヘッダーカード */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
            Well-being Timeline
          </span>
          {/* 表示名（ニックネーム）を優先して表示 */}
          <h1 className="text-2xl font-bold text-gray-800 mt-2">
            {displayName} さんのマイダッシュボード
          </h1>
          {accountEmail && (
            <p className="text-xs text-gray-500 mt-1">
              アカウント: <span className="font-medium text-gray-700">{accountEmail}</span>
            </p>
          )}
        </div>

        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
          + プライベートログを追加
        </button>
      </div>

      {/* ここに既存のスコア推移やアクティビティ履歴のカードが入ります */}
    </div>
  );
}