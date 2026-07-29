'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function MyPage({ params }: { params: Promise<{ participant_id: string }> }) {
  const { participant_id } = use(params);
  
  const [profile, setProfile] = useState<any>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // セルフログ追加フォーム用ステート
  const [showAddForm, setShowAddForm] = useState(false);
  const [logTitle, setLogTitle] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [domainKaishoku, setDomainKaishoku] = useState(3);
  const [domainKaimin, setDomainKaimin] = useState(3);
  const [domainKaido, setDomainKaido] = useState(3);
  const [domainKaisho, setDomainKaisho] = useState(3);
  const [domainKairaku, setDomainKairaku] = useState(3);
  const [domainKaisei, setDomainKaisei] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      // 1. プロフィール取得
      const { data: profData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('participant_id', participant_id)
        .maybeSingle();
      if (profData) setProfile(profData);

      // 2. このユーザーの全アンケート回答取得
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('participant_id', participant_id)
        .order('created_at', { ascending: true });

      if (surveyError) throw surveyError;
      setSurveys(surveyData || []);

      // 3. イベントタイトルの取得
      if (surveyData && surveyData.length > 0) {
        const eventIds = Array.from(new Set(surveyData.map((s) => s.event_id)));
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .in('id', eventIds);

        const map: Record<string, any> = {};
        eventData?.forEach((e) => {
          map[e.id] = e;
        });
        setEventsMap(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [participant_id]);

  // プライベートログ（自主記録）の投稿
  const handleAddPersonalLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle) return;

    setSubmitting(true);
    try {
      const personalEventId = `personal_${Date.now()}`;
      const token = `token_p_${Math.random().toString(36).substring(2, 10)}`;

      // 1. events テーブルに personal として作成
      await supabase.from('events').insert({
        id: personalEventId,
        title: logTitle,
        event_type: 'personal',
      });

      // スコア計算
      const scores = [domainKaishoku, domainKaimin, domainKaido, domainKaisho, domainKairaku, domainKaisei];
      const sum = scores.reduce((a, b) => a + b, 0);
      const mean = Number((sum / 6).toFixed(2));

      // 2. surveys テーブルに登録
      await supabase.from('surveys').insert({
        event_id: personalEventId,
        participant_id,
        timing_type: 'post',
        submission_token: token,
        domain_kaishoku: domainKaishoku,
        domain_kaimin: domainKaimin,
        domain_kaido: domainKaido,
        domain_kaisho: domainKaisho,
        domain_kairaku: domainKairaku,
        domain_kaisei: domainKaisei,
        total_mean: mean,
        total_sum: sum,
        created_at: new Date(logDate).toISOString(),
      });

      // フォームリセット
      setLogTitle('');
      setShowAddForm(false);
      fetchData(); // 再読み込み
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-bold text-gray-600">マイページ読み込み中...</div>
      </div>
    );
  }

  // 折れ線グラフ用データの整形
  const chartData = surveys.map((s) => {
    const dateStr = new Date(s.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    const eventInfo = eventsMap[s.event_id];
    const title = eventInfo?.title || '体験アクティビティ';
    return {
      date: dateStr,
      name: `${title} (${s.timing_type === 'pre' ? '事前' : '事後'})`,
      score: Number(s.total_mean),
    };
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans bg-gray-50 min-h-screen">
      
      {/* ユーザーヘッダー */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
            Well-being Timeline
          </span>
          <h1 className="text-2xl font-black text-gray-800 mt-1">マイダッシュボード</h1>
          <p className="text-sm text-gray-500">
            {profile?.email ? `登録メール: ${profile.email}` : `ID: ${participant_id.slice(0, 8)}...`}
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          {showAddForm ? '閉じる' : '＋ プライベートログを追加'}
        </button>
      </div>

      {/* プライベートログ追加フォーム */}
      {showAddForm && (
        <form onSubmit={handleAddPersonalLog} className="bg-white p-6 rounded-2xl shadow-md border border-indigo-100 mb-6 transition-all">
          <h2 className="text-lg font-bold text-gray-800 mb-1">プライベートセルフログの追加</h2>
          <p className="text-xs text-gray-500 mb-4">個人で行ったヨガ、散歩、運動などのコンディションを記録できます。（SUPwell公式集計には含まれません）</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">内容・タイトル</label>
              <input
                type="text"
                required
                placeholder="例: 朝ヨガ体験、週末ウォーキング"
                value={logTitle}
                onChange={(e) => setLogTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">日付</label>
              <input
                type="date"
                required
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-2">各領域のコンディション (1〜5点)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: '快食 (食生活)', val: domainKaishoku, set: setDomainKaishoku },
                { label: '快眠 (睡眠)', val: domainKaimin, set: setDomainKaimin },
                { label: '快動 (運動)', val: domainKaido, set: setDomainKaido },
                { label: '快笑 (笑い)', val: domainKaisho, set: setDomainKaisho },
                { label: '快楽 (楽しさ)', val: domainKairaku, set: setDomainKairaku },
                { label: '快生 (充実感)', val: domainKaisei, set: setDomainKaisei },
              ].map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-2.5 rounded-xl border">
                  <div className="text-xs font-bold text-gray-700 mb-1">{item.label}</div>
                  <select
                    value={item.val}
                    onChange={(e) => item.set(Number(e.target.value))}
                    className="w-full p-1 border rounded text-sm bg-white"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>{num} 点</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="text-right">
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {submitting ? '保存中...' : 'ログを記録する'}
            </button>
          </div>
        </form>
      )}

      {/* スコア推移グラフ */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">
          ウェルビーイング スコアの経時推移
        </h2>

        {chartData.length > 0 ? (
          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => [`${value} pt`, '平均スコア']}
                  labelFormatter={(label, items) => items[0]?.payload?.name || label}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 6, fill: '#4f46e5' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">データがまだありません。</div>
        )}
      </div>

      {/* 体験履歴タイムライン */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">
          アクティビティ・イベント履歴
        </h2>

        {surveys.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">履歴はありません。</p>
        ) : (
          <div className="space-y-4">
            {surveys.map((item) => {
              const eventInfo = eventsMap[item.event_id];
              const isOfficial = eventInfo?.event_type !== 'personal';

              return (
                <div key={item.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOfficial ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                        {isOfficial ? 'SUPwell公式' : 'セルフログ'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    <div className="font-bold text-gray-800 text-base">
                      {eventInfo?.title || '体験アクティビティ'}
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        ({item.timing_type === 'pre' ? '事前アンケート' : '事後アンケート'})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 font-bold">平均スコア</div>
                      <div className="text-lg font-black text-indigo-600">{Number(item.total_mean).toFixed(2)}</div>
                    </div>

                    <Link
                      href={`/result/${item.submission_token}`}
                      className="bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg border transition-colors whitespace-nowrap"
                    >
                      チャートを見る ▶
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}