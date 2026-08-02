'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import Link from 'next/link';

const CustomAngleAxisTick = (props: any) => {
  const { x, y, payload, textAnchor } = props;
  const lines = payload.value.split('\n');
  const isKaishoku = payload.value.includes('快食');
  const isKaisho = payload.value.includes('快笑');

  return (
    <text x={x} y={y} textAnchor={textAnchor}>
      {lines.map((line: string, index: number) => {
        const isJapanese = index === 0;
        let dy = isJapanese ? -4 : 15;
        if (isKaishoku) {
          dy = isJapanese ? -20 : 13;
        } else if (isKaisho) {
          dy = isJapanese ? 14 : 28;
        }

        return (
          <tspan
            key={index}
            x={x}
            dy={dy}
            fontSize={isJapanese ? 13 : 9}
            fontWeight={isJapanese ? 'bold' : 'normal'}
            fill={isJapanese ? '#1e293b' : '#64748b'}
          >
            {line}
          </tspan>
        );
      })}
    </text>
  );
};

export default function ResultPage({ params }: { params: Promise<{ submission_token: string }> }) {
  const { submission_token } = use(params);
  const [surveyData, setSurveyData] = useState<any>(null);
  const [preSurveyData, setPreSurveyData] = useState<any>(null);
  const [groupAvgData, setGroupAvgData] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>(''); 
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // 💡 プライベートイベント判定用のステート
  const [isPrivate, setIsPrivate] = useState(false);

  const [email, setEmail] = useState("");
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [regError, setRegError] = useState("");

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data: currentData, error: currentError } = await supabase
          .from('surveys')
          .select('*')
          .eq('submission_token', submission_token)
          .maybeSingle();

        if (currentError) throw currentError;

        if (!currentData) {
          setErrorMsg("該当する回答データが見つかりませんでした。");
          return;
        }

        setSurveyData(currentData);

        // 💡 イベント情報を取得し、プライベートかどうかを判定
        let privateFlag = false;
        if (currentData.event_id) {
          const { data: eventData } = await supabase
            .from('events')
            .select('*')
            .eq('id', currentData.event_id)
            .maybeSingle();
            
          if (eventData) {
            const rawTitle = eventData.title || eventData.event_name || '';
            if (rawTitle.includes('【プライベート】')) {
              privateFlag = true;
              setIsPrivate(true);
            }
          }
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .or(`participant_id.eq.${currentData.participant_id},email.eq.${currentData.participant_id}`)
          .maybeSingle();

        if (profile) {
          setIsRegistered(true);
          setEmail(profile.email || '');
          if (profile.display_name) {
            setDisplayName(profile.display_name);
          } else if (!currentData.participant_id.includes('@')) {
            setDisplayName(currentData.participant_id);
          } else {
            setDisplayName(currentData.participant_id.split('@')[0]);
          }
        } else {
          setDisplayName(currentData.participant_id);
        }

        if (!privateFlag && currentData.timing_type === 'post') {
          const { data: preData } = await supabase
            .from('surveys')
            .select('*')
            .eq('event_id', currentData.event_id)
            .eq('participant_id', currentData.participant_id)
            .eq('timing_type', 'pre')
            .maybeSingle();
          
          if (preData) setPreSurveyData(preData);
        }

        // 💡 プライベートイベントの時は全体平均を計算・表示しない
        if (!privateFlag) {
          const { data: allEventPostSurveys } = await supabase
            .from('surveys')
            .select('*')
            .eq('event_id', currentData.event_id)
            .eq('timing_type', currentData.timing_type);

          if (allEventPostSurveys && allEventPostSurveys.length > 0) {
            const calcAvg = (key: string) => {
              const sum = allEventPostSurveys.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
              return Number((sum / allEventPostSurveys.length).toFixed(2));
            };

            setGroupAvgData({
              kaishoku: calcAvg('domain_kaishoku'),
              kaimin: calcAvg('domain_kaimin'),
              kaido: calcAvg('domain_kaido'),
              kaisho: calcAvg('domain_kaisho'),
              kairaku: calcAvg('domain_kairaku'),
              kaisei: calcAvg('domain_kaisei'),
              total_mean: calcAvg('total_mean'),
              total_sum: calcAvg('total_sum'),
              count: allEventPostSurveys.length
            });
          }
        }

      } catch (err: any) {
        console.error("Fetch Error:", err);
        setErrorMsg("データの読み込みに失敗しました。 / Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [submission_token]);

  const handleRegisterEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !surveyData) return;

    setRegistering(true);
    setRegError("");

    try {
      const cleanEmail = email.trim().toLowerCase();
      const nicknameToSave = displayName && !displayName.includes('@') ? displayName : displayName.split('@')[0];

      const { error: profileError } = await supabase.from('user_profiles').upsert(
        {
          participant_id: cleanEmail,
          email: cleanEmail,
          display_name: nicknameToSave,
        },
        { onConflict: 'email' }
      );

      if (profileError) throw profileError;

      await supabase
        .from('surveys')
        .delete()
        .eq('event_id', surveyData.event_id)
        .eq('timing_type', surveyData.timing_type)
        .eq('participant_id', cleanEmail)
        .neq('submission_token', submission_token);

      const { error: surveyError } = await supabase
        .from('surveys')
        .update({ participant_id: cleanEmail })
        .eq('submission_token', submission_token);

      if (surveyError) throw surveyError;

      if (surveyData.participant_id && surveyData.participant_id !== cleanEmail) {
        const { data: oldSurveys } = await supabase
          .from('surveys')
          .select('*')
          .eq('participant_id', surveyData.participant_id);

        if (oldSurveys && oldSurveys.length > 0) {
          for (const oldItem of oldSurveys) {
            const { data: existing } = await supabase
              .from('surveys')
              .select('id')
              .eq('event_id', oldItem.event_id)
              .eq('timing_type', oldItem.timing_type)
              .eq('participant_id', cleanEmail)
              .maybeSingle();

            if (!existing) {
              await supabase
                .from('surveys')
                .update({ participant_id: cleanEmail })
                .eq('id', oldItem.id);
            }
          }
        }
      }

      setSurveyData((prev: any) => ({ ...prev, participant_id: cleanEmail }));
      setDisplayName(nicknameToSave);
      setIsRegistered(true);

    } catch (err: any) {
      console.error("Register catch error:", err);
      setRegError(`登録エラー: ${err.message || '別のメールアドレスでお試しください。'}`);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-bold text-gray-600 text-center">
          読み込み中...
        </div>
      </div>
    );
  }

  if (errorMsg || !surveyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-red-100 text-red-700 p-6 rounded-xl text-center shadow-sm max-w-md w-full">
          <p className="font-bold mb-2">{errorMsg || "データが見つかりません。"}</p>
        </div>
      </div>
    );
  }

  const isPost = surveyData.timing_type === 'post';
  const hasPreData = !!preSurveyData;

  const chartData = [
    { subject: '快食\n(Enjoyable Eating)', score: surveyData.domain_kaishoku, preScore: preSurveyData?.domain_kaishoku, groupAvg: groupAvgData?.kaishoku },
    { subject: '快眠\n(Restful Sleep)', score: surveyData.domain_kaimin, preScore: preSurveyData?.domain_kaimin, groupAvg: groupAvgData?.kaimin },
    { subject: '快動\n(Comfortable Movement)', score: surveyData.domain_kaido, preScore: preSurveyData?.domain_kaido, groupAvg: groupAvgData?.kaido },
    { subject: '快笑\n(Smiling & Laughter)', score: surveyData.domain_kaisho, preScore: preSurveyData?.domain_kaisho, groupAvg: groupAvgData?.kaisho },
    { subject: '快楽\n(Enjoyment)', score: surveyData.domain_kairaku, preScore: preSurveyData?.domain_kairaku, groupAvg: groupAvgData?.kairaku },
    { subject: '快生\n(Living Well)', score: surveyData.domain_kaisei, preScore: preSurveyData?.domain_kaisei, groupAvg: groupAvgData?.kaisei },
  ];

  // 💡 プライベートイベント用のカラー設定を動的に割り当て
  const headerBgClass = isPrivate ? 'bg-purple-100 text-purple-700' : (isPost ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700');
  const borderClass = isPrivate ? 'border-purple-200' : (isPost ? 'border-green-200' : 'border-blue-200');
  const textClass = isPrivate ? 'text-purple-600' : (isPost ? 'text-green-600' : 'text-blue-600');
  const cardBgClass = isPrivate ? 'bg-purple-50 border-purple-100' : (isPost ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100');
  const radarColor = isPrivate ? '#8b5cf6' : (isPost ? '#10b981' : '#3b82f6');
  const radarName = isPrivate ? "自分 (Your Score)" : (isPost ? "自分: 事後 (Post)" : "自分: 事前 (Pre)");

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 font-sans bg-gray-50 min-h-screen">
      
      {/* メッセージヘッダー */}
      <div className={`p-6 rounded-2xl shadow-sm border mb-8 text-center bg-white relative ${borderClass}`}>
        <div className="absolute top-4 left-4">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${headerBgClass}`}>
            ID: {displayName || surveyData.participant_id}
          </span>
        </div>

        <h1 className={`text-2xl font-bold mb-2 mt-4 ${textClass}`}>
          {isPrivate ? 'プライベート記録 完了' : (isPost ? '事後アンケート完了' : '事前アンケート完了')}
          <span className="block text-base font-normal mt-1 opacity-80">
            {isPrivate ? 'Private Record Completed' : (isPost ? 'Post-event Survey Completed' : 'Pre-event Survey Completed')}
          </span>
        </h1>
        <p className="text-gray-600 font-medium mt-4">
          ご回答ありがとうございました！あなたの健幸度の結果です。
        </p>
      </div>

      {/* チャート＆スコア表示カード */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800 border-b-2 border-gray-100 pb-4">
          {displayName || surveyData.participant_id} さんの健幸度の結果
        </h2>

        {/* レーダーチャート */}
        <div className="w-full h-[360px] md:h-[440px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="46%" data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={<CustomAngleAxisTick />} />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 5]} 
                ticks={[1, 2, 3, 4, 5]} 
                stroke="none"
                tick={(props: any) => (
                  <text x={props.x} y={props.y} fill="#475569" fontSize={10} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
                    {props.payload.value}
                  </text>
                )}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>

              {hasPreData && (
                <Radar name="自分: 事前 (Pre)" dataKey="preScore" stroke="#9ca3af" strokeWidth={2} fill="transparent" />
              )}
              {groupAvgData && !isPrivate && (
                <Radar name={`全体平均 (Group Avg, N=${groupAvgData.count})`} dataKey="groupAvg" stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2} fill="transparent" />
              )}
              <Radar name={radarName} dataKey="score" stroke={radarColor} strokeWidth={2.5} fill="transparent" />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* スコア詳細比較 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl text-center border ${cardBgClass}`}>
            <div className={`text-sm font-bold mb-3 ${textClass}`}>
              総合平均点 <span className="text-xs font-normal opacity-70">Total Mean</span>
            </div>
            <div className="flex justify-center items-center gap-3">
              {hasPreData && (
                <>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 font-bold mb-1">事前 Pre</div>
                    <div className="text-lg font-bold text-gray-500">{Number(preSurveyData.total_mean).toFixed(2)}</div>
                  </div>
                  <div className="text-gray-300 font-bold">▶</div>
                </>
              )}
              <div className="text-center">
                <div className={`text-xs font-bold mb-1 ${textClass}`}>自分 Your Score</div>
                <div className={`text-2xl font-black ${textClass}`}>
                  {Number(surveyData.total_mean).toFixed(2)}
                </div>
              </div>
              {groupAvgData && !isPrivate && (
                <>
                  <div className="text-gray-300 font-bold">/</div>
                  <div className="text-center">
                    <div className="text-xs text-orange-500 font-bold mb-1">全体 Group</div>
                    <div className="text-2xl font-black text-orange-500">{groupAvgData.total_mean.toFixed(2)}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={`p-4 rounded-xl text-center border ${cardBgClass}`}>
            <div className={`text-sm font-bold mb-3 ${textClass}`}>
              総合合計点 <span className="text-xs font-normal opacity-70">Total Sum</span>
            </div>
            <div className="flex justify-center items-center gap-3">
              {hasPreData && (
                <>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 font-bold mb-1">事前 Pre</div>
                    <div className="text-lg font-bold text-gray-500">{preSurveyData.total_sum}</div>
                  </div>
                  <div className="text-gray-300 font-bold">▶</div>
                </>
              )}
              <div className="text-center">
                <div className={`text-xs font-bold mb-1 ${textClass}`}>自分 Your Score</div>
                <div className={`text-2xl font-black ${textClass}`}>
                  {surveyData.total_sum}
                </div>
              </div>
              {groupAvgData && !isPrivate && (
                <>
                  <div className="text-gray-300 font-bold">/</div>
                  <div className="text-center">
                    <div className="text-xs text-orange-500 font-bold mb-1">全体 Group</div>
                    <div className="text-2xl font-black text-orange-500">{groupAvgData.total_sum.toFixed(1)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メール登録 ＆ マイページ案内カード */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 md:p-8 rounded-2xl shadow-md border border-indigo-100 relative overflow-hidden">
        {/* 装飾用の背景円 */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-100 rounded-full blur-2xl opacity-60 pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-100 rounded-full blur-2xl opacity-60 pointer-events-none"></div>

        {!isRegistered ? (
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-sm">
                無料登録で保存
              </span>
              <h3 className="text-xl font-bold text-gray-800">今回のスコアを保存しよう！</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed font-medium">
              メールアドレスを登録して自分専用のマイダッシュボードを作成すると、<span className="text-indigo-600 font-bold">グラフで日々の変化を振り返る</span>ことができます。（登録は無料です）
            </p>

            <form onSubmit={handleRegisterEmail} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="メールアドレスを入力 (例: user@supwell.jp)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 text-sm bg-white shadow-inner"
              />
              <button
                type="submit"
                disabled={registering}
                className="bg-gray-900 hover:bg-black text-white font-bold px-6 py-3.5 rounded-xl shadow-md text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap"
              >
                {registering ? '保存中...' : '結果を保存する ✨'}
              </button>
            </form>
            {regError && <p className="text-xs text-red-500 mt-3 font-bold bg-red-50 p-2 rounded-md">{regError}</p>}
            
            <p className="text-[11px] text-gray-400 mt-4 text-center">
              ※すでにアカウントをお持ちの方は、同じアドレスを入力するとデータが統合されます。
            </p>
          </div>
        ) : (
          <div className="text-center py-4 relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-green-400 to-emerald-500 text-white rounded-full mb-4 text-2xl font-black shadow-md">
              ✓
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">スコアが保存されました！</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">
              グラフが追加された、あなた専用のマイダッシュボードを確認してみましょう。
            </p>
            <Link
              href={`/my/${encodeURIComponent(surveyData.participant_id)}`}
              className="inline-block bg-gray-900 hover:bg-black text-white font-bold px-8 py-3.5 rounded-xl shadow-md text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              📊 マイダッシュボードを開く
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}