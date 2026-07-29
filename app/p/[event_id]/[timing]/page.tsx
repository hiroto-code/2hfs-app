'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

export default function AdminEventSummaryPage({ params }: { params: Promise<{ event_id: string }> }) {
  const { event_id } = use(params);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const { data: surveys, error } = await supabase
          .from('surveys')
          .select('*')
          .eq('event_id', event_id);

        if (error) throw error;

        if (!surveys || surveys.length === 0) {
          setErrorMsg('該当するイベントのデータが存在しません。');
          return;
        }

        const preList = surveys.filter((s) => s.timing_type === 'pre');
        const postList = surveys.filter((s) => s.timing_type === 'post');

        const calcAvg = (list: any[], key: string) => {
          if (list.length === 0) return 0;
          const sum = list.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
          return Number((sum / list.length).toFixed(2));
        };

        const domains = [
          { key: 'domain_kaishoku', label: '快食', en: 'Enjoyable Eating' },
          { key: 'domain_kaimin', label: '快眠', en: 'Restful Sleep' },
          { key: 'domain_kaido', label: '快動', en: 'Comfortable Movement' },
          { key: 'domain_kaisho', label: '快笑', en: 'Smiling & Laughter' },
          { key: 'domain_kairaku', label: '快楽', en: 'Enjoyment' },
          { key: 'domain_kaisei', label: '快生', en: 'Living Well' },
        ];

        const chartData = domains.map((d) => ({
          subject: `${d.label}\n(${d.en})`,
          preAvg: calcAvg(preList, d.key),
          postAvg: calcAvg(postList, d.key),
        }));

        setSummary({
          preCount: preList.length,
          postCount: postList.length,
          preTotalMean: calcAvg(preList, 'total_mean'),
          postTotalMean: calcAvg(postList, 'total_mean'),
          preTotalSum: calcAvg(preList, 'total_sum'),
          postTotalSum: calcAvg(postList, 'total_sum'),
          chartData,
          domains: domains.map((d) => ({
            ...d,
            preAvg: calcAvg(preList, d.key),
            postAvg: calcAvg(postList, d.key),
            diff: (calcAvg(postList, d.key) - calcAvg(preList, d.key)).toFixed(2),
          })),
        });
      } catch (err) {
        console.error(err);
        setErrorMsg('データ集計中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [event_id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-bold text-gray-600">集計中...</div>
      </div>
    );
  }

  if (errorMsg || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-red-100 text-red-700 p-6 rounded-xl font-bold text-center">
          {errorMsg || 'データがありません。'}
        </div>
      </div>
    );
  }

  const meanDiff = (summary.postTotalMean - summary.preTotalMean).toFixed(2);
  const sumDiff = (summary.postTotalSum - summary.preTotalSum).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans bg-gray-50 min-h-screen">
      {/* 管理画面ヘッダー */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <div className="text-xs font-bold text-indigo-600 tracking-wider uppercase mb-1">
          Event Analytics Summary
        </div>
        <h1 className="text-2xl font-black text-gray-800">
          イベント全体集計結果
        </h1>
        <p className="text-sm text-gray-500 mt-1">イベントID: {event_id}</p>
      </div>

      {/* サマリー数値カード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 text-center">
          <div className="text-xs font-bold text-gray-400 mb-1">回答件数 (Responses)</div>
          <div className="text-xl font-black text-gray-800">
            事前: <span className="text-blue-600">{summary.preCount}</span> 件 / 事後: <span className="text-green-600">{summary.postCount}</span> 件
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 text-center">
          <div className="text-xs font-bold text-gray-400 mb-1">全体平均点 (Total Mean)</div>
          <div className="text-xl font-black text-gray-800">
            {summary.preTotalMean.toFixed(2)} ▶ <span className="text-green-600">{summary.postTotalMean.toFixed(2)}</span>
            <span className="text-sm font-bold text-emerald-500 ml-2">
              ({Number(meanDiff) >= 0 ? `+${meanDiff}` : meanDiff})
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 text-center">
          <div className="text-xs font-bold text-gray-400 mb-1">全体合計点 (Total Sum)</div>
          <div className="text-xl font-black text-gray-800">
            {summary.preTotalSum.toFixed(1)} ▶ <span className="text-green-600">{summary.postTotalSum.toFixed(1)}</span>
            <span className="text-sm font-bold text-emerald-500 ml-2">
              ({Number(sumDiff) >= 0 ? `+${sumDiff}` : sumDiff})
            </span>
          </div>
        </div>
      </div>

      {/* 全体平均 レーダーチャート */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3 text-center">
          全体平均スコア比較（事前 vs 事後）
        </h2>

        <div className="w-full h-[380px] md:h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="48%" data={summary.chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} stroke="none" />
              <Legend verticalAlign="bottom" height={36} />
              
              <Radar
                name="事前全体平均 (Pre Group)"
                dataKey="preAvg"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="#3b82f6"
                fillOpacity={0.15}
              />
              <Radar
                name="事後全体平均 (Post Group)"
                dataKey="postAvg"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="#10b981"
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 領域別詳細リスト */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">
          領域別平均スコア推移
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {summary.domains.map((item: any) => (
            <div key={item.key} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="font-bold text-gray-800">{item.label}</div>
              <div className="text-xs text-gray-400 mb-3">{item.en}</div>
              
              <div className="flex justify-between items-baseline">
                <div className="text-xs text-gray-500">事前: <span className="font-bold">{item.preAvg.toFixed(2)}</span></div>
                <div className="text-sm text-gray-400">▶</div>
                <div className="text-sm text-green-600 font-bold">事後: <span className="text-base font-black">{item.postAvg.toFixed(2)}</span></div>
              </div>

              <div className="mt-2 text-right text-xs font-bold text-emerald-600">
                変化幅: {Number(item.diff) >= 0 ? `+${item.diff}` : item.diff}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}