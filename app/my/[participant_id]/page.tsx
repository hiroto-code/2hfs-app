'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

export default function MyDashboardPage({ params }: { params: Promise<{ participant_id: string }> }) {
  const { participant_id: rawId } = use(params);
  const participantId = decodeURIComponent(rawId);

  const [displayName, setDisplayName] = useState<string>('');
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
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

        const currentEmail = profile?.email || (participantId.includes('@') ? participantId : '');
        
        if (profile) {
          setDisplayName(profile.display_name || profile.participant_id);
          setAccountEmail(currentEmail);
        } else {
          setDisplayName(participantId.includes('@') ? participantId.split('@')[0] : participantId);
          setAccountEmail(participantId.includes('@') ? participantId : '');
        }

        // 2. 該当ユーザーのアンケート履歴を取得（IDまたはメールアドレスで検索）
        let query = supabase.from('surveys').select('*');
        if (currentEmail) {
          query = query.or(`participant_id.eq.${participantId},participant_id.eq.${currentEmail}`);
        } else {
          query = query.eq('participant_id', participantId);
        }

        const { data: surveyLogs, error: surveyError } = await query.order('created_at', { ascending: false });

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 font-bold">読み込み中...</div>
      </div>
    );
  }

  // 最新の事前・事後データ抽出
  const preSurvey = surveys.find((s) => s.timing_type === 'pre');
  const postSurvey = surveys.find((s) => s.timing_type === 'post');

  // 日付フォーマット用
  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatDateFull = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans bg-gray-50 min-h-screen">
      {/* 1. ヘッダーカード */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
            Well-being Timeline
          </span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">
            {displayName} さんのマイダッシュボード
          </h1>
          {accountEmail && (
            <p className="text-xs text-gray-500 mt-1">
              アカウント: <span className="font-medium text-gray-700">{accountEmail}</span>
            </p>
          )}
        </div>

        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          + プライベートログを追加
        </button>
      </div>

      {/* 2. 健幸度スコアの経時推移 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-6">
          健幸度スコアの経時推移
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 事前 (Pre) カード */}
          <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
            {preSurvey ? (
              <>
                <div className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-lg mb-4">
                  📅 {formatDateLabel(preSurvey.created_at)} 事前 (Pre)
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-blue-900">
                    {Number(preSurvey.total_mean).toFixed(2)}
                  </span>
                  <span className="text-gray-500 text-sm font-medium">/ 5.0</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  合計: {preSurvey.total_sum} 点
                </p>
              </>
            ) : (
              <div className="text-sm text-gray-400 py-4 text-center">事前アンケート未回答</div>
            )}
          </div>

          {/* 事後 (Post) カード */}
          <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl">
            {postSurvey ? (
              <>
                <div className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-lg mb-4">
                  📅 {formatDateLabel(postSurvey.created_at)} 事後 (Post)
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-emerald-900">
                    {Number(postSurvey.total_mean).toFixed(2)}
                  </span>
                  <span className="text-gray-500 text-sm font-medium">/ 5.0</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  合計: {postSurvey.total_sum} 点
                </p>
              </>
            ) : (
              <div className="text-sm text-gray-400 py-4 text-center">事後アンケート未回答</div>
            )}
          </div>
        </div>
      </div>

      {/* 3. アクティビティ・イベント履歴 */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-6">
          アクティビティ・イベント履歴
        </h2>

        {surveys.length > 0 ? (
          <div className="space-y-4">
            {surveys.map((survey) => {
              const isPostType = survey.timing_type === 'post';
              return (
                <div
                  key={survey.id || survey.submission_token}
                  className="flex items-center justify-between p-4 bg-gray-50/70 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        isPostType ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-gray-800 text-sm">
                        {formatDateLabel(survey.created_at)}{' '}
                        <span className={isPostType ? 'text-emerald-600' : 'text-blue-600'}>
                          [{isPostType ? '事後' : '事前'}]
                        </span>{' '}
                        アンケート回答
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        平均: {Number(survey.total_mean).toFixed(2)}点 / 合計: {survey.total_sum}点
                      </div>
                    </div>
                  </div>

                  <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-md border border-gray-100 font-medium">
                    {formatDateFull(survey.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">回答履歴がありません。</p>
        )}
      </div>
    </div>
  );
}