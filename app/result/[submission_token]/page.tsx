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
  
  const [isPrivate, setIsPrivate] = useState(false);

  const [inputName, setInputName] = useState("");
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

        const savedLocalName = typeof window !== 'undefined' ? localStorage.getItem('user_display_name') : null;

        let privateFlag = false;
        
        // 判定条件の強化：timing_typeがprivateやnoneの場合、またはイベントIDが無い場合はプライベートとみなす
        if (currentData.timing_type === 'private' || currentData.timing_type === 'none' || !currentData.event_id) {
          privateFlag = true;
          setIsPrivate(true);
        }

        // 判定条件の強化：イベント名に「プライベート」が含まれていれば検知（カッコの有無を問わない）
        if (!privateFlag && currentData.event_id) {
          const { data: eventData } = await supabase
            .from('events')
            .select('*')
            .eq('id', currentData.event_id)
            .maybeSingle();
            
          if (eventData) {
            const rawTitle = eventData.title || eventData.event_name || '';
            if (rawTitle.includes('プライベート') || rawTitle.includes('Private')) {
              privateFlag = true;
              setIsPrivate(true);
            }
          }
        }

        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('*')
          .or(`participant_id.eq.${currentData.participant_id},email.eq.${currentData.participant_id}`)
          .limit(1);

        const profile = profiles?.[0];
        let resolvedName = '';

        if (profile) {
          if (profile.display_name) {
            resolvedName = profile.display_name;
          }
          if (profile.email) {
            setEmail(profile.email);
          }
        }

        if (!resolvedName && savedLocalName) {
          resolvedName = savedLocalName;
        }

        if (!resolvedName) {
          if (currentData.participant_id && currentData.participant_id !== 'guest') {
            resolvedName = currentData.participant_id.includes('@')
              ? currentData.participant_id.split('@')[0]
              : currentData.participant_id;
          }
        }

        if (!resolvedName || resolvedName === 'guest') {
          resolvedName = 'あなた';
        }

        setDisplayName(resolvedName);
        setInputName(resolvedName !== 'あなた' ? resolvedName : '');

        if (profile?.email || (currentData.participant_id && currentData.participant_id !== 'guest' && currentData.participant_id.includes('@'))) {
          setIsRegistered(true);
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

        if (!privateFlag && currentData.event_id) {
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
      const nicknameToSave = inputName.trim() || cleanEmail.split('@')[0];

      if (typeof window !== 'undefined') {
        localStorage.setItem('user_display_name', nicknameToSave);
      }

      const payload: any = {
        participant_id: cleanEmail,
        email: cleanEmail,
        display_name: nicknameToSave,
      };

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'email' });

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-orange-500 font-bold animate-pulse text-lg">
          データを読み込み中... 🌿
        </div>
      </div>
    );
  }

  if (errorMsg || !surveyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
        <div className="bg-white p-6 rounded-3xl border border-rose-200 text-rose-700 text-center shadow-md max-w-md w-full">
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

  // テーマカラー設定（プライベート: 紫, 事後: 緑, 事前: オレンジ）
  const headerBgClass = isPrivate ? 'bg-purple-100 text-purple-700' : (isPost ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800');
  const borderClass = isPrivate ? 'border-purple-200' : (isPost ? 'border-emerald-200' : 'border-orange-200');
  const textClass = isPrivate ? 'text-purple-700' : (isPost ? 'text-emerald-700' : 'text-orange-600');
  const cardBgClass = isPrivate ? 'bg-purple-50/70 border-purple-100' : (isPost ? 'bg-emerald-50/70 border-emerald-100' : 'bg-orange-50/70 border-orange-100');
  const radarColor = isPrivate ? '#a855f7' : (isPost ? '#10b981' : '#f97316');
  const radarName = isPrivate ? "自分 (Your Score)" : (isPost ? "自分: 事後 (Post)" : "自分: 事前 (Pre)");

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* メッセージヘッダー */}
        <div className={`p-6 md:p-8 rounded-3xl shadow-md border bg-white/90 backdrop-blur-md mb-6 text-center relative overflow-hidden ${borderClass}`}>
          <div className="absolute top-4 left-4">
            <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm ${headerBgClass}`}>
              ID: {displayName}
            </span>
          </div>

          <h1 className={`text-2xl md:text-3xl font-black mb-2 mt-4 tracking-tight ${textClass}`}>
            {isPrivate ? 'プライベート記録 完了 ✨' : (isPost ? '事後アンケート完了 🎉' : '事前アンケート完了 🌿')}
            <span className="block text-xs md:text-sm font-medium mt-1 opacity-70 tracking-normal">
              {isPrivate ? 'Private Record Completed' : (isPost ? 'Post-event Survey Completed' : 'Pre-event Survey Completed')}
            </span>
          </h1>
          <p className="text-gray-600 font-medium text-xs md:text-sm mt-3">
            ご回答ありがとうございました！あなたの健幸度の結果です。
          </p>
        </div>

        {/* チャート＆スコア表示カード */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border border-orange-100 mb-6">
          <h2 className="text-lg md:text-xl font-bold text-center mb-6 text-gray-800 border-b border-orange-100 pb-4 flex items-center justify-center gap-2">
            <span>📊</span> {displayName} さんの健幸度結果
          </h2>

          {/* レーダーチャート */}
          <div className="w-full h-[360px] md:h-[420px] bg-orange-50/30 rounded-2xl p-2 border border-orange-100/60 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="46%" data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={<CustomAngleAxisTick />} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 5]} 
                  ticks={[1, 2, 3, 4, 5]} 
                  stroke="none"
                  tick={(props: any) => (
                    <text x={props.x} y={props.y} fill="#64748b" fontSize={10} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
                      {props.payload.value}
                    </text>
                  )}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}/>

                {hasPreData && (
                  <Radar name="自分: 事前 (Pre)" dataKey="preScore" stroke="#94a3b8" strokeWidth={2} fill="transparent" />
                )}
                {groupAvgData && !isPrivate && (
                  <Radar name={`全体平均 (Group Avg, N=${groupAvgData.count})`} dataKey="groupAvg" stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2} fill="transparent" />
                )}
                <Radar name={radarName} dataKey="score" stroke={radarColor} strokeWidth={3} fill="transparent" />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* スコア詳細比較 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl text-center border shadow-sm ${cardBgClass}`}>
              <div className={`text-xs font-bold mb-2 ${textClass}`}>
                総合平均点 <span className="font-normal opacity-70">Total Mean</span>
              </div>
              <div className="flex justify-center items-center gap-3">
                {hasPreData && (
                  <>
                    <div className="text-center">
                      <div className="text-[10px] text-gray-400 font-bold mb-0.5">事前 Pre</div>
                      <div className="text-base font-bold text-gray-500">{Number(preSurveyData.total_mean).toFixed(2)}</div>
                    </div>
                    <div className="text-gray-300 text-xs font-bold">▶</div>
                  </>
                )}
                <div className="text-center">
                  <div className={`text-[10px] font-bold mb-0.5 ${textClass}`}>自分 Your Score</div>
                  <div className={`text-3xl font-black ${textClass}`}>
                    {Number(surveyData.total_mean).toFixed(2)}
                  </div>
                </div>
                {groupAvgData && !isPrivate && (
                  <>
                    <div className="text-gray-300 text-xs font-bold">/</div>
                    <div className="text-center">
                      <div className="text-[10px] text-amber-600 font-bold mb-0.5">全体 Group</div>
                      <div className="text-2xl font-black text-amber-500">{groupAvgData.total_mean.toFixed(2)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={`p-5 rounded-2xl text-center border shadow-sm ${cardBgClass}`}>
              <div className={`text-xs font-bold mb-2 ${textClass}`}>
                総合合計点 <span className="font-normal opacity-70">Total Sum</span>
              </div>
              <div className="flex justify-center items-center gap-3">
                {hasPreData && (
                  <>
                    <div className="text-center">
                      <div className="text-[10px] text-gray-400 font-bold mb-0.5">事前 Pre</div>
                      <div className="text-base font-bold text-gray-500">{preSurveyData.total_sum}</div>
                    </div>
                    <div className="text-gray-300 text-xs font-bold">▶</div>
                  </>
                )}
                <div className="text-center">
                  <div className={`text-[10px] font-bold mb-0.5 ${textClass}`}>自分 Your Score</div>
                  <div className={`text-3xl font-black ${textClass}`}>
                    {surveyData.total_sum}
                  </div>
                </div>
                {groupAvgData && !isPrivate && (
                  <>
                    <div className="text-gray-300 text-xs font-bold">/</div>
                    <div className="text-center">
                      <div className="text-[10px] text-amber-600 font-bold mb-0.5">全体 Group</div>
                      <div className="text-2xl font-black text-amber-500">{groupAvgData.total_sum.toFixed(1)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* メール登録 ＆ マイページ案内カード */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border border-orange-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none"></div>

          {!isRegistered ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-sm">
                  無料登録で保存
                </span>
                <h3 className="text-lg font-bold text-gray-800">今回のスコアを保存しよう！</h3>
              </div>
              <p className="text-xs text-gray-600 mb-5 leading-relaxed font-medium">
                メールアドレスを登録して自分専用のマイダッシュボードを作成すると、<span className="text-purple-600 font-bold">グラフで日々の変化を振り返る</span>ことができます。（登録は無料です）
              </p>

              <form onSubmit={handleRegisterEmail} className="flex flex-col gap-3">
                <input
                  type="text"
                  required
                  placeholder="お名前 / ニックネーム (例: Hiroto)"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 text-sm bg-orange-50/20 shadow-inner transition-all"
                />
                <input
                  type="email"
                  required
                  placeholder="メールアドレスを入力 (例: user@supwell.jp)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 text-sm bg-orange-50/20 shadow-inner transition-all"
                />
                <button
                  type="submit"
                  disabled={registering}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md text-sm transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 mt-1"
                >
                  {registering ? '保存中...' : 'お名前と結果を保存する ✨'}
                </button>
              </form>
              {regError && <p className="text-xs text-rose-500 mt-3 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-100">{regError}</p>}
              
              <p className="text-[11px] text-gray-400 mt-4 text-center">
                ※すでにアカウントをお持ちの方は、同じアドレスを入力するとデータが統合されます。
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mb-3 text-xl font-black shadow-sm">
                ✓
              </div>
              <h3 className="text-lg font-black text-gray-800 mb-1">スコアが保存されました！</h3>
              <p className="text-xs text-gray-500 mb-5 font-medium">
                グラフが追加された、あなた専用のマイダッシュボードを確認してみましょう。
              </p>
              <Link
                href={`/my/${encodeURIComponent(surveyData.participant_id)}`}
                className="inline-block bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold px-8 py-3.5 rounded-2xl shadow-md text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                📊 マイダッシュボードを開く
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}