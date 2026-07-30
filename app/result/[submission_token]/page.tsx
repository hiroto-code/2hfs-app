'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../lib/supabase';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import Link from 'next/link';

// 各項目の文字位置を調整するカスタムTick
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
  const [displayName, setDisplayName] = useState<string>(''); // 表示用ニックネーム
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // メール登録フォーム用ステート
  const [email, setEmail] = useState("");
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [regError, setRegError] = useState("");

  useEffect(() => {
    const fetchResult = async () => {
      try {
        // 1. 本人の回答データを取得
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

        // 既にメール登録済みか、プロフィール情報をチェック
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

        // 2. 本人の事前データを取得（事後アンケートの場合）
        if (currentData.timing_type === 'post') {
          const { data: preData } = await supabase
            .from('surveys')
            .select('*')
            .eq('event_id', currentData.event_id)
            .eq('participant_id', currentData.participant_id)
            .eq('timing_type', 'pre')
            .maybeSingle();
          
          if (preData) setPreSurveyData(preData);
        }

        // 3. 同じイベント全体の事後平均データを取得
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

      } catch (err: any) {
        console.error("Fetch Error:", err);
        setErrorMsg("データの読み込みに失敗しました。 / Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [submission_token]);

  // メールアドレス登録処理（同一イベント・同一タイミングの衝突を防いで上書き統合する）
  const handleRegisterEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !surveyData) return;

    setRegistering(true);
    setRegError("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 保存するニックネーム（メールアドレスの形式でなければ採用）
      const nicknameToSave = displayName && !displayName.includes('@') ? displayName : displayName.split('@')[0];

      // 1. user_profiles にメアドと表示名(display_name)を保存
      const { error: profileError } = await supabase.from('user_profiles').upsert(
        {
          participant_id: cleanEmail,
          email: cleanEmail,
          display_name: nicknameToSave,
        },
        { onConflict: 'email' }
      );

      if (profileError) {
        console.error("Profile Error:", profileError);
        throw profileError;
      }

      // 2. 既に同じメールアドレスで「同じイベント」かつ「同じ時期（事前/事後）」のデータが存在する場合は古い方を削除して重複衝突を防ぐ (.neq に修正)
      await supabase
        .from('surveys')
        .delete()
        .eq('event_id', surveyData.event_id)
        .eq('timing_type', surveyData.timing_type)
        .eq('participant_id', cleanEmail)
        .neq('submission_token', submission_token);

      // 3. 今回のアンケート回答データの participant_id をメアドに更新
      const { error: surveyError } = await supabase
        .from('surveys')
        .update({ participant_id: cleanEmail })
        .eq('submission_token', submission_token);

      if (surveyError) {
        console.error("Survey Update Error:", surveyError);
        throw surveyError;
      }

      // 4. 元の仮IDで登録されていた過去データの一括統合（衝突回避処理付き）
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

      // 画面上のデータ更新
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
          <div className="text-sm text-gray-400 font-normal mt-2">Loading...</div>
        </div>
      </div>
    );
  }

  if (errorMsg || !surveyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-red-100 text-red-700 p-6 rounded-xl text-center shadow-sm max-w-md w-full">
          <p className="font-bold mb-2">{errorMsg || "データが見つかりません。"}</p>
          <p className="text-sm font-normal opacity-80">Data not found.</p>
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

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 font-sans bg-gray-50 min-h-screen">
      
      {/* メッセージヘッダー */}
      <div className={`p-6 rounded-2xl shadow-sm border mb-8 text-center bg-white relative ${isPost ? 'border-green-200' : 'border-blue-200'}`}>
        
        {/* 参加者ID / ニックネームの表示 */}
        <div className="absolute top-4 left-4">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${isPost ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            ID: {displayName || surveyData.participant_id}
          </span>
        </div>

        <h1 className={`text-2xl font-bold mb-2 mt-4 ${isPost ? 'text-green-600' : 'text-blue-600'}`}>
          {isPost ? '事後アンケート完了' : '事前アンケート完了'}
          <span className="block text-base font-normal mt-1 opacity-80">
            {isPost ? 'Post-event Survey Completed' : 'Pre-event Survey Completed'}
          </span>
        </h1>
        <p className="text-gray-600 font-medium mt-4">
          ご回答ありがとうございました！あなたの健幸度の結果です。
          <span className="block text-sm text-gray-400 font-normal mt-1">Thank you! Here is your score result.</span>
        </p>
      </div>

      {/* チャート＆スコア表示カード */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-center mb-6 text-gray-800 border-b-2 border-gray-100 pb-4">
          {displayName || surveyData.participant_id} さんの健幸度の結果
          <span className="block text-sm text-gray-500 font-normal mt-1">Your Well-being Balance</span>
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
              {groupAvgData && (
                <Radar name={`全体平均 (Group Avg, N=${groupAvgData.count})`} dataKey="groupAvg" stroke="#8b5cf6" strokeDasharray="4 4" strokeWidth={2} fill="transparent" />
              )}
              <Radar name={isPost ? "自分: 事後 (Post)" : "自分: 事前 (Pre)"} dataKey="score" stroke={isPost ? "#10b981" : "#3b82f6"} strokeWidth={2.5} fill="transparent" />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* スコア詳細比較 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl text-center border ${isPost ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
            <div className={`text-sm font-bold mb-3 ${isPost ? 'text-green-800' : 'text-blue-800'}`}>
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
                <div className={`text-xs font-bold mb-1 ${isPost ? 'text-green-600' : 'text-blue-600'}`}>自分 Your Score</div>
                <div className={`text-2xl font-black ${isPost ? 'text-green-600' : 'text-blue-600'}`}>
                  {Number(surveyData.total_mean).toFixed(2)}
                </div>
              </div>
              {groupAvgData && (
                <>
                  <div className="text-gray-300 font-bold">/</div>
                  <div className="text-center">
                    <div className="text-xs text-purple-600 font-bold mb-1">全体 Group</div>
                    <div className="text-2xl font-black text-purple-600">{groupAvgData.total_mean.toFixed(2)}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={`p-4 rounded-xl text-center border ${isPost ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
            <div className={`text-sm font-bold mb-3 ${isPost ? 'text-green-800' : 'text-blue-800'}`}>
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
                <div className={`text-xs font-bold mb-1 ${isPost ? 'text-green-600' : 'text-blue-600'}`}>自分 Your Score</div>
                <div className={`text-2xl font-black ${isPost ? 'text-green-600' : 'text-blue-600'}`}>
                  {surveyData.total_sum}
                </div>
              </div>
              {groupAvgData && (
                <>
                  <div className="text-gray-300 font-bold">/</div>
                  <div className="text-center">
                    <div className="text-xs text-purple-600 font-bold mb-1">全体 Group</div>
                    <div className="text-2xl font-black text-purple-600">{groupAvgData.total_sum.toFixed(1)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メール登録 ＆ マイページ案内カード */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
        {!isRegistered ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">RECOMMEND</span>
              <h3 className="text-lg font-bold text-gray-800">今回のスコアを保存してマイページを作成する</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              メールアドレスを登録すると、過去の体験ログの比較や、SUPwellからの次回イベントのご案内を受け取ることができます。
            </p>

            <form onSubmit={handleRegisterEmail} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 text-sm bg-white"
              />
              <button
                type="submit"
                disabled={registering}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-sm text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {registering ? '保存中...' : 'スコアを保存して登録'}
              </button>
            </form>
            {regError && <p className="text-xs text-red-500 mt-2 font-bold">{regError}</p>}
          </div>
        ) : (
          <div className="text-center py-2">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-3 text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">スコアが保存・統合されました！</h3>
            <p className="text-sm text-gray-500 mb-4">マイページから過去の経時ログやイベント記録を確認できます。</p>
            <Link
              href={`/my/${encodeURIComponent(surveyData.participant_id)}`}
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-sm text-sm transition-colors"
            >
              あなたのマイページを開く ▶
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}