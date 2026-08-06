'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

const CustomAngleAxisTick = (props: any) => {
  const { x, y, payload, textAnchor } = props;
  const lines = payload.value.split('\n');

  return (
    <text x={x} y={y} textAnchor={textAnchor}>
      {lines.map((line: string, index: number) => {
        const isJapanese = index === 0;
        return (
          <tspan
            key={index}
            x={x}
            dy={isJapanese ? -4 : 16}
            fontSize={isJapanese ? 16 : 11}
            fontWeight={isJapanese ? 'bold' : 600}
            fill={isJapanese ? '#f8fafc' : '#cbd5e1'}
          >
            {line}
          </tspan>
        );
      })}
    </text>
  );
};

const domainSubjects = [
  { key: 'kaishoku', label: '快食\n(Enjoyable Eating)' },
  { key: 'kaimin', label: '快眠\n(Restful Sleep)' },
  { key: 'kaido', label: '快動\n(Comfortable Movement)' },
  { key: 'kaisho', label: '快笑\n(Smiling & Laughter)' },
  { key: 'kairaku', label: '快楽\n(Enjoyment)' },
  { key: 'kaisei', label: '快生\n(Living Well)' },
];

function calcGroupAverage(group: any[]) {
  if (group.length === 0) return null;
  const avg = (key: string) =>
    Number((group.reduce((sum, s) => sum + (Number(s[key]) || 0), 0) / group.length).toFixed(2));

  return {
    kaishoku: avg('domain_kaishoku'),
    kaimin: avg('domain_kaimin'),
    kaido: avg('domain_kaido'),
    kaisho: avg('domain_kaisho'),
    kairaku: avg('domain_kairaku'),
    kaisei: avg('domain_kaisei'),
    total_mean: avg('total_mean'),
    total_sum: avg('total_sum'),
    count: group.length,
  };
}

export default function AdminEventResultsPage({ params }: { params: Promise<{ event_id: string }> }) {
  const { event_id } = use(params);
  const [event, setEvent] = useState<any>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: eventData } = await supabase.from('events').select('*').eq('id', event_id).maybeSingle();
      setEvent(eventData);

      const { data: surveyData } = await supabase
        .from('surveys')
        .select('*')
        .eq('event_id', event_id)
        .order('created_at', { ascending: true });

      setSurveys(surveyData || []);
      setLoading(false);
    };

    fetchData();
  }, [event_id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-300 font-bold animate-pulse text-sm">読み込み中...</div>
      </div>
    );
  }

  const preSurveys = surveys.filter((s) => s.timing_type === 'pre');
  const postSurveys = surveys.filter((s) => s.timing_type === 'post');
  const privateSurveys = surveys.filter((s) => s.timing_type === 'private');

  const preAvg = calcGroupAverage(preSurveys);
  const postAvg = calcGroupAverage(postSurveys);
  const privateAvg = calcGroupAverage(privateSurveys);

  const chartData = domainSubjects.map(({ key, label }) => ({
    subject: label,
    pre: preAvg ? (preAvg as any)[key] : undefined,
    post: postAvg ? (postAvg as any)[key] : undefined,
    private: privateAvg ? (privateAvg as any)[key] : undefined,
  }));

  const timingLabel = (t: string) => (t === 'private' ? 'プライベート' : t === 'post' ? '事後' : '事前');
  const timingBadge = (t: string) =>
    t === 'private' ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
      : t === 'post' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
      : 'bg-amber-950/60 text-amber-300 border-amber-800/50';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        <div>
          <Link href="/" className="text-xs text-slate-300 hover:text-slate-200 underline">
            ← 管理者ダッシュボードに戻る
          </Link>
        </div>

        <div className="bg-slate-800/90 p-6 md:p-8 rounded-2xl border border-slate-700/60 shadow-lg">
          <span className="bg-slate-700 text-slate-300 text-[11px] font-semibold px-2.5 py-1 rounded-md inline-block mb-2">
            ADMIN SYSTEM
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
            {event?.title || '(イベント名なし)'} の集団結果
          </h1>
          <p className="text-xs text-slate-300 mt-1">合計 {surveys.length} 件の回答</p>
        </div>

        {surveys.length === 0 ? (
          <div className="bg-slate-800/90 p-8 rounded-2xl border border-slate-700/60 text-center text-slate-300 text-sm">
            まだ回答がありません。
          </div>
        ) : (
          <>
            <div className="bg-slate-800/90 p-6 md:p-8 rounded-2xl border border-slate-700/60 shadow-md">
              <div className="w-full h-[360px] md:h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="46%" data={chartData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={<CustomAngleAxisTick />} />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      stroke="none"
                      tick={{ fontSize: 12, fontWeight: 700, fill: '#e2e8f0' }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px', color: '#e2e8f0' }} />

                    {preAvg && (
                      <Radar name={`事前平均 (N=${preAvg.count})`} dataKey="pre" stroke="#f59e0b" strokeWidth={2.5} fill="#f59e0b" fillOpacity={0.12} />
                    )}
                    {postAvg && (
                      <Radar name={`事後平均 (N=${postAvg.count})`} dataKey="post" stroke="#10b981" strokeWidth={2.5} fill="#10b981" fillOpacity={0.12} />
                    )}
                    {privateAvg && (
                      <Radar name={`プライベート平均 (N=${privateAvg.count})`} dataKey="private" stroke="#a855f7" strokeWidth={2.5} fill="#a855f7" fillOpacity={0.12} />
                    )}
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {preAvg && (
                  <div className="p-4 rounded-xl border border-amber-800/40 bg-amber-950/30 text-center">
                    <div className="text-xs font-bold text-amber-300 mb-1">事前平均 (N={preAvg.count})</div>
                    <div className="text-2xl font-black text-amber-200">{preAvg.total_mean.toFixed(2)}</div>
                    <div className="text-xs text-amber-300/80 mt-0.5">合計平均 {preAvg.total_sum.toFixed(1)}点</div>
                  </div>
                )}
                {postAvg && (
                  <div className="p-4 rounded-xl border border-emerald-800/40 bg-emerald-950/30 text-center">
                    <div className="text-xs font-bold text-emerald-300 mb-1">事後平均 (N={postAvg.count})</div>
                    <div className="text-2xl font-black text-emerald-200">{postAvg.total_mean.toFixed(2)}</div>
                    <div className="text-xs text-emerald-300/80 mt-0.5">合計平均 {postAvg.total_sum.toFixed(1)}点</div>
                  </div>
                )}
                {privateAvg && (
                  <div className="p-4 rounded-xl border border-purple-800/40 bg-purple-950/30 text-center">
                    <div className="text-xs font-bold text-purple-300 mb-1">プライベート平均 (N={privateAvg.count})</div>
                    <div className="text-2xl font-black text-purple-200">{privateAvg.total_mean.toFixed(2)}</div>
                    <div className="text-xs text-purple-300/80 mt-0.5">合計平均 {privateAvg.total_sum.toFixed(1)}点</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-800/90 p-6 rounded-2xl border border-slate-700/60 shadow-md">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">個別回答一覧</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-300 font-medium">
                      <th className="p-3">回答者 (ニックネーム)</th>
                      <th className="p-3">種別</th>
                      <th className="p-3 text-right">総合平均</th>
                      <th className="p-3 text-center">詳細</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {surveys.map((s) => (
                      <tr key={s.id || s.submission_token} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 text-slate-200 font-medium">{s.display_name || 'ゲスト'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${timingBadge(s.timing_type)}`}>
                            {timingLabel(s.timing_type)}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-200">
                          {s.total_mean ? Number(s.total_mean).toFixed(2) : '-'} 点
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            href={`/result/${s.submission_token}`}
                            target="_blank"
                            className="text-indigo-400 hover:text-indigo-300 underline text-[11px]"
                          >
                            開く ↗
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
