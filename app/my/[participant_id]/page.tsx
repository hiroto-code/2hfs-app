'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || payload.score === null) return null;
  
  const isPost = payload.timing === 'post';
  const color = isPost ? '#10b981' : '#f97316'; 
  return (
    <circle cx={cx} cy={cy} r={6} fill={color} stroke="#ffffff" strokeWidth={2} />
  );
};

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

        let query = supabase.from('surveys').select('*');
        if (currentEmail) {
          query = query.or(`participant_id.eq.${participantId},participant_id.eq.${currentEmail}`);
        } else {
          query = query.eq('participant_id', participantId);
        }

        const { data: surveyLogs, error: surveyError } = await query;

        if (!surveyError && surveyLogs) {
          const eventIds = Array.from(new Set(surveyLogs.map((s) => s.event_id).filter(Boolean)));
          let eventsMap: Record<string, any> = {};

          if (eventIds.length > 0) {
            const { data: eventsData } = await supabase
              .from('events')
              .select('*')
              .in('id', eventIds);

            if (eventsData) {
              eventsMap = eventsData.reduce((acc: any, ev: any) => {
                acc[ev.id] = ev;
                return acc;
              }, {});
            }
          }

          const enrichedSurveys = surveyLogs.map((s) => {
            const ev = eventsMap[s.event_id];
            const targetDate = ev?.event_date || ev?.date || s.created_at;
            return {
              ...s,
              target_date: targetDate,
              event_title: ev?.title || ev?.event_name || '',
            };
          });

          enrichedSurveys.sort((a, b) => {
            const timeA = new Date(a.target_date).getTime();
            const timeB = new Date(b.target_date).getTime();

            if (timeA !== timeB) {
              return timeA - timeB;
            }

            if (a.timing_type === 'pre' && b.timing_type === 'post') return -1;
            if (a.timing_type === 'post' && b.timing_type === 'pre') return 1;

            return 0;
          });

          setSurveys(enrichedSurveys);
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

  const preSurvey = [...surveys].reverse().find((s) => s.timing_type === 'pre');
  const postSurvey = [...surveys].reverse().find((s) => s.timing_type === 'post');

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

  const chartData: any[] = [];
  let prevGroupKey: string | null = null;
  let spacerIndex = 0;

  surveys.forEach((s) => {
    const currentGroupKey = s.event_id || s.target_date;

    if (prevGroupKey && currentGroupKey !== prevGroupKey) {
      chartData.push({
        label: `spacer_${spacerIndex}`,
        score: null,
        sum: null,
        timing: 'spacer',
      });
      spacerIndex++;
    }
    prevGroupKey = currentGroupKey;

    const dateLabel = formatDateLabel(s.target_date);
    const timingLabel = s.timing_type === 'post' ? '事後' : '事前';
    chartData.push({
      label: `${dateLabel} [${timingLabel}]`,
      score: Number(Number(s.total_mean).toFixed(2)),
      sum: s.total_sum,
      timing: s.timing_type,
    });
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
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

        <Link 
          href="/private-log" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm inline-block text-center"
        >
          + プライベートログを追加
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-6">
          健幸度スコアの経時推移
        </h2>

        {chartData.length > 0 ? (
          <div className="mb-8 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-center gap-6 mb-4 text-xs font-bold text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> 事前 (Pre)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> 事後 (Post)
              </span>
            </div>

            <div className="w-full overflow-x-auto pb-2">
              <div className="h-64 md:h-72 min-w-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      tickFormatter={(value) => value.startsWith('spacer') ? '' : value}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      dx={-2}
                      dy={10}
                      padding={{ left: 30, right: 30 }}
                    />
                    <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(value: any) => [`${value} 点`, '総合平均点']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                      filterNull={true}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#cbd5e1" 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                      dot={<CustomDot />}
                      activeDot={{ r: 8 }}
                      connectNulls={true} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-orange-50/50 border border-orange-100 p-5 rounded-2xl">
            {preSurvey ? (
              <>
                <div className="inline-block bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-lg mb-4">
                  📅 {formatDateLabel(preSurvey.target_date)} 事前 (Pre)
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-orange-900">
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

          <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl">
            {postSurvey ? (
              <>
                <div className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-lg mb-4">
                  📅 {formatDateLabel(postSurvey.target_date)} 事後 (Post)
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

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-6">
          アクティビティ・イベント履歴
        </h2>

        {surveys.length > 0 ? (
          <div className="space-y-4">
            {[...surveys].reverse().map((survey) => {
              const isPostType = survey.timing_type === 'post';
              return (
                <div
                  key={survey.id || survey.submission_token}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/70 hover:bg-gray-50 rounded-xl transition-colors border border-gray-100 gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        isPostType ? 'bg-emerald-500' : 'bg-orange-500'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-gray-800 text-sm">
                        {formatDateLabel(survey.target_date)}{' '}
                        <span className={isPostType ? 'text-emerald-600' : 'text-orange-600'}>
                          [{isPostType ? '事後' : '事前'}]
                        </span>{' '}
                        {survey.event_title ? `${survey.event_title} ` : ''}アンケート回答
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        平均: {Number(survey.total_mean).toFixed(2)}点 / 合計: {survey.total_sum}点
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/result/${survey.submission_token}`}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-lg text-white transition-colors flex items-center gap-1 shadow-sm ${
                        isPostType ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                    >
                      📊 結果を見る
                    </Link>

                    {survey.event_id && (
                      <Link
                        href={`/p/${survey.event_id}/${survey.timing_type}`}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-sm"
                      >
                        ✏️ やり直す
                      </Link>
                    )}

                    <span className="text-[11px] text-gray-400 bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 font-medium ml-auto sm:ml-0">
                      {formatDateFull(survey.target_date)}
                    </span>
                  </div>
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