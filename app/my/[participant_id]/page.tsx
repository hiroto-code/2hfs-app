'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 💡 グラフの点を描画するカスタムコンポーネント
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || payload.score === null) return null;
  
  const isPrivate = payload.isPrivate;
  const isPost = payload.timing === 'post';
  const color = isPrivate ? '#a855f7' : (isPost ? '#10b981' : '#f97316'); 
  return (
    <circle cx={cx} cy={cy} r={6} fill={color} stroke="#ffffff" strokeWidth={2} className="drop-shadow-sm" />
  );
};

export default function MyDashboardPage({ params }: { params: Promise<{ participant_id: string }> }) {
  const { participant_id: rawId } = use(params);
  const participantId = decodeURIComponent(rawId || '');
  const router = useRouter();

  const [displayName, setDisplayName] = useState<string>('');
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // 🔒 ログイン確認：本人（同じメールアドレス）以外はマイダッシュボードを見られないようにする
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.email) {
        const sessionEmail = session.user.email.toLowerCase();

        // URLの参加者IDが自分のメールアドレスと一致しない場合は、自分のダッシュボードへ誘導
        if (participantId.toLowerCase() !== sessionEmail) {
          router.replace(`/my/${encodeURIComponent(session.user.email)}`);
          return;
        }

        setAuthorized(true);
        return;
      }

      // 💡 ログインセッションがなくても、このブラウザで直前に本人がアンケート回答・
      // 登録した実績（localStorageに保存済みのメールアドレス）があれば、
      // わざわざOTPログインをやり直させずそのまま自分のダッシュボードを見せる。
      // 他人のメールアドレスをURLで直接叩いてきた場合はここに一致しないため、
      // 引き続きログインページへ誘導される。
      const locallyVerifiedEmail =
        typeof window !== 'undefined' ? localStorage.getItem('supwell_user_email') : null;

      if (locallyVerifiedEmail && locallyVerifiedEmail.toLowerCase() === participantId.toLowerCase()) {
        setAuthorized(true);
        return;
      }

      router.replace('/mypage/login');
    };

    checkAuth();
  }, [participantId, router]);

  useEffect(() => {
    if (!authorized) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);

        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('*')
          .or(`participant_id.eq.${participantId},email.eq.${participantId}`)
          .order('created_at', { ascending: false })
          .limit(1);

        const profile = profiles?.[0];
        const currentEmail = profile?.email || (participantId.includes('@') ? participantId : '');
        
        let resolvedName = participantId.includes('@') ? participantId.split('@')[0] : participantId;

        if (profile) {
          if (profile.display_name) {
            resolvedName = profile.display_name;
          } else if (profile.participant_id && profile.participant_id !== 'guest') {
            resolvedName = profile.participant_id;
          } else if (currentEmail) {
            resolvedName = currentEmail.split('@')[0];
          }
        }

        if (resolvedName === 'guest' || !resolvedName) {
          resolvedName = currentEmail ? currentEmail.split('@')[0] : 'あなた';
        }

        setDisplayName(resolvedName);
        setAccountEmail(currentEmail);

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
            const rawTitle = ev?.title || ev?.event_name || '';
            const isPrivate = rawTitle.includes('【プライベート】') || s.timing_type === 'private';
            const displayTitle = rawTitle.replace('【プライベート】', '');

            // 💡 プライベート記録は同じ日に複数回答することがあるため、
            // 日付のみのevent_dateではなく、実際の回答日時(created_at)を使う
            // （グラフのラベルで時刻まで区別できるようにするため）
            const targetDate = isPrivate ? s.created_at : (ev?.event_date || ev?.date || s.created_at);

            return {
              ...s,
              target_date: targetDate,
              event_title: rawTitle,
              displayTitle: displayTitle,
              isPrivate: isPrivate,
            };
          });

          // 💡 並び順ルール：
          // ・プライベート記録は、回答した日時順に個別に並べる
          // ・イベント（事前/事後）は、後から振り返って事後だけ日を空けて回答する
          //   ケースもあるため、実際の回答日時がバラバラでも「同じイベント」として
          //   常に隣り合わせ（事前→事後の順）で表示する
          const timingOrder: Record<string, number> = { pre: 1, post: 2, private: 3 };

          const eventGroups = new Map<string, typeof enrichedSurveys>();
          const blocks: { sortKey: number; items: typeof enrichedSurveys }[] = [];

          enrichedSurveys.forEach((s) => {
            if (s.isPrivate) {
              blocks.push({ sortKey: new Date(s.target_date).getTime(), items: [s] });
              return;
            }
            const key = s.event_id || `no-event-${s.id}`;
            if (!eventGroups.has(key)) {
              eventGroups.set(key, []);
            }
            eventGroups.get(key)!.push(s);
          });

          eventGroups.forEach((items) => {
            items.sort((a, b) => (timingOrder[a.timing_type] || 99) - (timingOrder[b.timing_type] || 99));
            const sortKey = Math.min(...items.map((i) => new Date(i.target_date).getTime()));
            blocks.push({ sortKey, items });
          });

          blocks.sort((a, b) => a.sortKey - b.sortKey);

          setSurveys(blocks.flatMap((b) => b.items));
        }

      } catch (err) {
        console.error('Fetch dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [participantId, authorized]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-orange-500 font-bold animate-pulse">ログイン状態を確認中... 🌿</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-orange-500 font-bold animate-pulse">データを読み込み中... 🌿</div>
      </div>
    );
  }

  // サマリーカード用のデータ（最新1件ずつ）
  const preSurvey = [...surveys].reverse().find((s) => s.timing_type === 'pre' && !s.isPrivate);
  const postSurvey = [...surveys].reverse().find((s) => s.timing_type === 'post' && !s.isPrivate);
  const privateSurvey = [...surveys].reverse().find((s) => s.isPrivate);

  const isPostPending = preSurvey ? !surveys.some(s => s.event_id === preSurvey.event_id && s.timing_type === 'post') : false;

  // 閲覧者のタイムゾーンに関わらず、常に日本時間(JST)で表示する
  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const formatTimeLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateFull = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
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
        isPrivate: false,
      });
      spacerIndex++;
    }
    prevGroupKey = currentGroupKey;

    const dateLabel = formatDateLabel(s.target_date);
    const timingLabel = s.timing_type === 'post' ? '後' : '前';

    // プライベート記録は同じ日に複数件あり得るため、時刻も付けて見分けられるようにする
    const privateLabel = `${dateLabel} ${formatTimeLabel(s.target_date)}`;

    // イベント（事前/事後）は、実際の回答日ではなくイベント名で表記し、
    // 同じイベントの事前・事後が常に隣り合わせで分かるようにする
    const eventLabel = `${s.displayTitle?.trim() || dateLabel}（${timingLabel}）`;

    chartData.push({
      label: s.isPrivate ? privateLabel : eventLabel,
      score: Number(Number(s.total_mean).toFixed(2)),
      sum: s.total_sum,
      timing: s.timing_type,
      isPrivate: s.isPrivate,
    });
  });

  // 通常イベントとプライベートイベントを分けて保持
  const regularSurveys = [...surveys].filter((s) => !s.isPrivate).reverse();
  const privateSurveys = [...surveys].filter((s) => s.isPrivate).reverse();

  // 💡 プライベート記録は都度の単発記録なので、全件の平均を自動集計して表示する
  const privateAverageMean = privateSurveys.length > 0
    ? privateSurveys.reduce((sum, s) => sum + Number(s.total_mean || 0), 0) / privateSurveys.length
    : null;

  // やり直しボタンの遷移先URLを判定する関数
  const getRetakeUrl = (survey: any) => {
    if (survey.isPrivate) {
      // プライベートイベント用の回答/やり直しページ
      return survey.event_id ? `/p/${survey.event_id}/private` : '/create-private-event';
    }
    // 通常イベント（事前・事後）
    return `/p/${survey.event_id}/${survey.timing_type}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ヘッダーカード */}
        <div className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-orange-100 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-60 -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
          <div>
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full inline-block mb-2">
              Well-being Timeline 🌿
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
              {displayName} さんのマイダッシュボード
            </h1>
            {accountEmail && (
              <p className="text-xs text-gray-500 mt-1 font-medium">
                アカウント: <span className="text-gray-700">{accountEmail}</span>
              </p>
            )}
          </div>

          <Link 
            href="/create-private-event" 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs md:text-sm px-5 py-3 rounded-2xl transition-all shadow-md transform hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2 text-center"
          >
            <span>📋</span> プライベートイベントの回答をする
          </Link>
        </div>

        {/* グラフエリア */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-orange-100 shadow-md">
          <h2 className="text-lg font-bold text-gray-800 border-b border-orange-100 pb-3 mb-6 flex items-center gap-2">
            <span>📈</span> 健幸度スコアの経時推移
          </h2>

          {chartData.length > 0 ? (
            <div className="mb-8 bg-orange-50/30 p-4 rounded-2xl border border-orange-100/60">
              <div className="flex items-center justify-center gap-6 mb-4 text-xs font-bold text-gray-600 flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> 事前 (Pre)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> 事後 (Post)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block" /> プライベート</span>
              </div>
              <div className="w-full overflow-x-auto pb-2">
                <div className="h-64 md:h-72 min-w-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" tickFormatter={(value) => value.startsWith('spacer') ? '' : value} tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }} interval={0} angle={-45} textAnchor="end" dx={-2} dy={10} padding={{ left: 30, right: 30 }} />
                      <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fontWeight: 600, fill: '#334155' }} />
                      <Tooltip
                        formatter={(value: any) => [`${value} 点`, '総合平均点']}
                        contentStyle={{ borderRadius: '16px', border: '1px solid #fed7aa', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        itemStyle={{ color: '#334155', fontWeight: 700, fontSize: 13 }}
                        labelStyle={{ color: '#1e293b', fontWeight: 700, fontSize: 13, marginBottom: 4 }}
                        filterNull={true}
                      />
                      <Line type="monotone" dataKey="score" stroke="#cbd5e1" strokeWidth={2.5} strokeDasharray="4 4" dot={<CustomDot />} activeDot={{ r: 8 }} connectNulls={true} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : null}

          {/* 3つのサマリーカード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 事前 */}
            <div className="bg-gradient-to-br from-orange-50/80 to-amber-50/50 border border-orange-100 p-5 rounded-2xl shadow-sm">
              {preSurvey ? (
                <>
                  <div className="inline-block bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-lg mb-3">
                    📅 {formatDateLabel(preSurvey.target_date)} 事前 (Pre)
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-orange-900">
                      {Number(preSurvey.total_mean).toFixed(2)}
                    </span>
                    <span className="text-gray-500 text-xs font-medium">/ 5.0</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    合計: {preSurvey.total_sum} 点
                  </p>
                </>
              ) : (
                <div className="text-xs text-gray-400 py-4 text-center font-medium">事前アンケート未回答</div>
              )}
            </div>

            {/* 事後 */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
              {isPostPending && preSurvey ? (
                <div className="flex flex-col items-center justify-center text-center space-y-3 py-1">
                  <p className="text-[11px] text-emerald-700 font-bold bg-emerald-100/60 px-2.5 py-1 rounded-md">
                    イベント終了後はこちらから👇
                  </p>
                  <Link
                    href={`/p/${preSurvey.event_id}/post`}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs md:text-sm px-4 py-3 rounded-xl shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <span>✨</span> 事後アンケートに進む
                  </Link>
                </div>
              ) : postSurvey ? (
                <>
                  <div className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-lg mb-3 self-start">
                    📅 {formatDateLabel(postSurvey.target_date)} 事後 (Post)
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-emerald-900">
                      {Number(postSurvey.total_mean).toFixed(2)}
                    </span>
                    <span className="text-gray-500 text-xs font-medium">/ 5.0</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    合計: {postSurvey.total_sum} 点
                  </p>
                </>
              ) : (
                <div className="text-xs text-gray-400 py-4 text-center font-medium">事後アンケート未回答</div>
              )}
            </div>

            {/* プライベート */}
            <div className="bg-gradient-to-br from-purple-50/80 to-fuchsia-50/50 border border-purple-100 p-5 rounded-2xl shadow-sm">
              {privateSurvey ? (
                <>
                  <div className="inline-block bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-lg mb-3">
                    📅 {formatDateLabel(privateSurvey.target_date)} プライベート
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-purple-900">
                      {Number(privateSurvey.total_mean).toFixed(2)}
                    </span>
                    <span className="text-gray-500 text-xs font-medium">/ 5.0</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    合計: {privateSurvey.total_sum} 点
                  </p>
                </>
              ) : (
                <div className="text-xs text-gray-400 py-4 text-center font-medium">プライベート記録なし</div>
              )}
            </div>
          </div>
        </div>

        {/* 1. 通常イベント履歴（事前・事後） */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-orange-100 shadow-md">
          <h2 className="text-lg font-bold text-gray-800 border-b border-orange-100 pb-3 mb-6 flex items-center gap-2">
            <span>📜</span> イベント回答履歴（事前・事後）
          </h2>

          {regularSurveys.length > 0 ? (
            <div className="space-y-3">
              {regularSurveys.map((survey) => {
                const isPostType = survey.timing_type === 'post';
                const badgeColor = isPostType ? 'bg-emerald-500' : 'bg-orange-500';
                const textColor = isPostType ? 'text-emerald-600' : 'text-orange-600';
                const timingText = isPostType ? '[事後]' : '[事前]';
                const buttonColor = isPostType ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600';

                return (
                  <div key={survey.id || survey.submission_token} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-orange-50/30 hover:bg-orange-50/80 rounded-2xl transition-all border border-orange-100/60 gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${badgeColor} shadow-sm`} />
                      <div>
                        <div className="font-bold text-gray-800 text-sm">
                          {formatDateLabel(survey.target_date)}{' '}
                          <span className={textColor}>{timingText}</span>{' '}
                          {survey.displayTitle ? `${survey.displayTitle} ` : ''}アンケート回答
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          平均: <span className="font-bold text-gray-700">{Number(survey.total_mean).toFixed(2)}点</span> / 合計: {survey.total_sum}点
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/result/${survey.submission_token}`} className={`text-[11px] font-bold px-3 py-2 rounded-xl text-white transition-all flex items-center gap-1 shadow-sm ${buttonColor}`}>
                        📊 結果を見る
                      </Link>
                      <Link href={getRetakeUrl(survey)} className="text-[11px] font-bold px-3 py-2 rounded-xl bg-white border border-orange-200 text-gray-600 hover:bg-orange-50 transition-colors flex items-center gap-1 shadow-sm">
                        ✏️ やり直す
                      </Link>
                      <span className="text-[11px] text-gray-400 bg-white px-2.5 py-2 rounded-xl border border-gray-100 font-medium ml-auto sm:ml-0">
                        {formatDateFull(survey.target_date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">イベント回答履歴がありません。</p>
          )}
        </div>

        {/* 2. プライベート記録履歴（紫デザインで独立） */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-purple-100 shadow-md">
          <h2 className="text-lg font-bold text-purple-900 border-b border-purple-100 pb-3 mb-6 flex items-center gap-2">
            <span>💜</span> プライベート記録履歴
          </h2>

          {privateAverageMean !== null && (
            <div className="mb-5 p-4 bg-purple-50/60 border border-purple-100 rounded-2xl flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-purple-700">
                全{privateSurveys.length}件の平均（自動集計）
              </span>
              <span className="text-lg font-black text-purple-900">
                {privateAverageMean.toFixed(2)} <span className="text-xs font-normal text-purple-400">/ 5.0</span>
              </span>
            </div>
          )}

          {privateSurveys.length > 0 ? (
            <div className="space-y-3">
              {privateSurveys.map((survey) => {
                return (
                  <div key={survey.id || survey.submission_token} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-purple-50/30 hover:bg-purple-50/80 rounded-2xl transition-all border border-purple-100/60 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0 bg-purple-500 shadow-sm" />
                      <div>
                        <div className="font-bold text-gray-800 text-sm">
                          {formatDateLabel(survey.target_date)}{' '}
                          <span className="text-purple-600">[プライベート]</span>{' '}
                          {survey.displayTitle ? `${survey.displayTitle} ` : ''}記録
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          平均: <span className="font-bold text-purple-800">{Number(survey.total_mean).toFixed(2)}点</span> / 合計: {survey.total_sum}点
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/result/${survey.submission_token}`} className="text-[11px] font-bold px-3 py-2 rounded-xl text-white bg-purple-600 hover:bg-purple-700 transition-all flex items-center gap-1 shadow-sm">
                        📊 記録を見る
                      </Link>
                      <Link href={getRetakeUrl(survey)} className="text-[11px] font-bold px-3 py-2 rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-1 shadow-sm">
                        ✏️ やり直す
                      </Link>
                      <span className="text-[11px] text-gray-400 bg-white px-2.5 py-2 rounded-xl border border-gray-100 font-medium ml-auto sm:ml-0">
                        {formatDateFull(survey.target_date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">プライベート記録がありません。</p>
          )}
        </div>

      </div>
    </div>
  );
}