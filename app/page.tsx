'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase'; // 👈 Vercelのエラーを防ぐため @/ に変更

interface EventItem {
  id: string;
  title: string;
  event_date?: string;
  date?: string;
  created_at: string;
}

interface SurveyItem {
  id: string;
  event_id: string;
  participant_id: string;
  timing_type: string;
  total_mean: number;
  total_sum: number;
  created_at: string;
  display_name?: string;
}

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. イベント一覧の取得
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. 回答データの取得
      const { data: surveysData } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      // 3. ユーザープロフィールの取得（エラー停止を防ぐ安全な書き方）
      let profilesData: Record<string, any>[] | null = null;
      try {
        const { data } = await supabase.from('user_profiles').select('participant_id, display_name, email');
        profilesData = data;
      } catch (profileErr) {
        console.warn('プロフィールの取得をスキップしました');
      }

      const profileMap: Record<string, string> = {};
      if (profilesData) {
        profilesData.forEach((p) => {
          if (p.participant_id) profileMap[p.participant_id] = p.display_name || p.participant_id;
          if (p.email) profileMap[p.email] = p.display_name || p.email;
        });
      }

      if (eventsData) setEvents(eventsData);

      if (surveysData) {
        const enrichedSurveys = surveysData.map((s) => ({
          ...s,
          display_name: profileMap[s.participant_id] || s.participant_id,
        }));
        setSurveys(enrichedSurveys as SurveyItem[]);
      }
    } catch (err) {
      console.error('Fetch admin data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 新規イベント作成
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const { error } = await supabase.from('events').insert([
      {
        title,
        event_date: eventDate || null,
      },
    ]);

    if (!error) {
      setTitle('');
      setEventDate('');
      fetchData();
    } else {
      alert('イベント作成に失敗しました: ' + error.message);
    }
  };

  // イベント削除
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('このイベントを削除してもよろしいですか？')) return;

    // 💡 Supabaseは、RLS等で削除権限がない場合でも「0件削除して成功」という
    // 応答を返すことがあり、エラーが出ないのに実際は削除されない、という
    // 分かりにくい状態になりうる。.select()で削除された行を取得し、
    // 0件だった場合は明示的にエラーとして扱う。
    const { data, error } = await supabase.from('events').delete().eq('id', id).select();

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert(
        '削除できませんでした（0件削除）。\n\n' +
        'エラーは出ていませんが、実際には削除が行われていません。' +
        'Supabase側の権限設定（RLS）で、削除がブロックされている可能性があります。'
      );
      return;
    }

    fetchData();
  };

  // コピー処理
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 参加者向け案内文のテンプレート（事前アンケートURLが埋め込み済み）
  const buildPreAnnouncement = (eventTitle: string, preUrl: string) =>
    `【☘️Well-being尺度（健幸度）チェックのお願い🌿】\n\n` +
    `「${eventTitle}」にご参加いただく皆さまへ、\n` +
    `簡単な健幸度チェック（2HFS）にご協力をお願いします。\n\n` +
    `▼事前アンケート（所要時間 約1分）\n${preUrl}\n\n` +
    `・メールアドレスの入力が必要です（結果をお送りするため）\n` +
    `・回答後、結果とマイダッシュボードへのご案内メールが届きます\n` +
    `・そのメールは、当日以降もご自身の記録を振り返るのに使いますので、\n` +
    `　よろしければ残しておいてください\n\n` +
    `お手すきの際にご回答ください🙏`;

  // 参加者向け案内文のテンプレート（事後アンケートURLが埋め込み済み）
  const buildPostAnnouncement = (eventTitle: string, postUrl: string) =>
    `【☘️Well-being尺度（健幸度）チェック（事後）のお願い🌿】\n\n` +
    `「${eventTitle}」にご参加いただきありがとうございました！\n` +
    `イベント前後での変化を見るため、事後アンケートへのご協力をお願いします。\n\n` +
    `▼事後アンケート（所要時間 約1分）\n${postUrl}\n\n` +
    `・事前アンケートと同じメールアドレスでご回答ください\n` +
    `・回答後、事前→事後の変化が分かる結果画面が表示されます\n` +
    `・結果画面から「マイダッシュボードを開く」を押すと、\n` +
    `　ご自身の記録がグラフで振り返れます\n\n` +
    `ご協力ありがとうございました✨`;

  // イベントに紐づかない、いつでも使えるプライベートセルフチェックの招待文
  const buildPrivateInvite = () =>
    `【☘️Well-being尺度（健幸度）セルフチェック🌿】\n\n` +
    `いつでも気軽に、ご自身の健幸度（Well-being）をチェックしてみませんか？\n\n` +
    `▼セルフチェック（所要時間 約1分）\nhttps://2hfs-app.vercel.app/create-private-event\n\n` +
    `・メールアドレスを登録すると、マイダッシュボードで記録の変化を振り返れます\n` +
    `・何度でも記録OK。続けることで、自分らしいリズムや変化が見えてきます\n\n` +
    `気になったタイミングで、気軽にお試しください🙏`;

  // アコーディオン開閉
  const toggleExpand = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    // 閲覧者のタイムゾーンに関わらず、常に日本時間(JST)で表示する
    return new Date(dateStr).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <header className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-orange-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-60 -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-800 tracking-tight">管理者ダッシュボード 🌿</h1>
              <p className="text-sm text-gray-500 mt-2 font-medium">アンケートイベントの作成および回答状況・URLの管理ができます。</p>
            </div>
            <button
              onClick={fetchData}
              className="flex-shrink-0 text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
              title="Supabase側で直接データを変更した場合など、最新の状態を再取得します"
            >
              🔄 再読み込み
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-orange-100 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">
              イベントに紐づかない、いつでも使えるセルフチェック（
              <span className="font-mono">/create-private-event</span>）の招待文：
            </span>
            <button
              onClick={() => handleCopy(buildPrivateInvite(), 'private-invite')}
              className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              {copiedId === 'private-invite' ? '✓ コピーしました' : '📋 招待文をコピー'}
            </button>
          </div>
        </header>

        {/* 新規イベント作成フォーム */}
        <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-lg mb-8 relative z-10">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <span className="text-xl">✨</span> 新規イベントの作成
          </h2>
          <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-gray-600 mb-2">イベント名</label>
              <input
                type="text"
                placeholder="例: SUPwell@狩野川"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border-2 border-orange-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">開催日程 (任意)</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-orange-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all shadow-sm text-gray-700"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
              >
                作成する ▶
              </button>
            </div>
          </form>
        </div>

        {/* 作成済みイベント一覧 */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-800 ml-2">作成済みイベント一覧</h2>

          {loading ? (
            <div className="text-center py-8 text-orange-400 font-bold animate-pulse">読み込み中...</div>
          ) : events.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-orange-100 text-center text-gray-400 text-sm shadow-sm">
              イベントがまだ登録されていません。
            </div>
          ) : (
            events.map((ev) => {
              const preUrl = `${baseUrl}/p/${ev.id}/pre`;
              const postUrl = `${baseUrl}/p/${ev.id}/post`;
              const privateUrl = `${baseUrl}/p/${ev.id}/private`;

              // このイベントに紐づく回答データを抽出
              const eventSurveys = surveys.filter((s) => s.event_id === ev.id);
              const preCount = eventSurveys.filter((s) => s.timing_type === 'pre').length;
              const postCount = eventSurveys.filter((s) => s.timing_type === 'post').length;
              const privateCount = eventSurveys.filter((s) => s.timing_type === 'private').length;

              const isExpanded = expandedEventId === ev.id;
              const targetDate = ev.event_date || ev.date;

              return (
                <div key={ev.id} className="bg-white p-6 rounded-3xl border border-orange-50 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-5">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h3 className="text-xl font-black text-gray-800 tracking-tight">{ev.title}</h3>
                        {targetDate && (
                          <span className="bg-orange-50 text-orange-600 border border-orange-100 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                            📅 {targetDate}
                          </span>
                        )}
                        {preCount === 0 && postCount === 0 && privateCount > 0 && (
                          <span className="bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                            👥 プライベートグループ
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono">ID: {ev.id}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="text-xs font-bold text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      削除
                    </button>
                  </div>

                  {/* 事前 / 事後 / プライベート URL */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                      <div className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-1">
                        <span>事前アンケート URL</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={preUrl}
                          className="w-full bg-white px-3 py-2 border border-orange-200 rounded-xl text-xs text-gray-600 truncate focus:outline-none"
                        />
                        <a
                          href={preUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-sm transition-colors"
                        >
                          開く ↗
                        </a>
                        <button
                          onClick={() => handleCopy(preUrl, `${ev.id}-pre`)}
                          className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-sm transition-colors"
                        >
                          {copiedId === `${ev.id}-pre` ? '完了' : 'コピー'}
                        </button>
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                      <div className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1">
                        <span>事後アンケート URL</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={postUrl}
                          className="w-full bg-white px-3 py-2 border border-emerald-200 rounded-xl text-xs text-gray-600 truncate focus:outline-none"
                        />
                        <a
                          href={postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-sm transition-colors"
                        >
                          開く ↗
                        </a>
                        <button
                          onClick={() => handleCopy(postUrl, `${ev.id}-post`)}
                          className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-sm transition-colors"
                        >
                          {copiedId === `${ev.id}-post` ? '完了' : 'コピー'}
                        </button>
                      </div>
                    </div>

                    <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                      <div className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1">
                        <span>プライベートURL（同じ場の参加者で平均を出したい場合）</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={privateUrl}
                          className="w-full bg-white px-3 py-2 border border-purple-200 rounded-xl text-xs text-gray-600 truncate focus:outline-none"
                        />
                        <a
                          href={privateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-sm transition-colors"
                        >
                          開く ↗
                        </a>
                        <button
                          onClick={() => handleCopy(privateUrl, `${ev.id}-private`)}
                          className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap shadow-sm transition-colors"
                        >
                          {copiedId === `${ev.id}-private` ? '完了' : 'コピー'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 参加者向け案内文コピー */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => handleCopy(buildPreAnnouncement(ev.title, preUrl), `${ev.id}-announce-pre`)}
                      className="text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-2 rounded-xl transition-colors"
                    >
                      {copiedId === `${ev.id}-announce-pre` ? '✓ コピーしました' : '📋 事前案内文をコピー'}
                    </button>
                    <button
                      onClick={() => handleCopy(buildPostAnnouncement(ev.title, postUrl), `${ev.id}-announce-post`)}
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl transition-colors"
                    >
                      {copiedId === `${ev.id}-announce-post` ? '✓ コピーしました' : '📋 事後案内文をコピー'}
                    </button>
                  </div>

                  {/* 📊 アコーディオン展開ボタン */}
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <span>回答件数:</span>
                      <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">事前 {preCount}件</span>
                      <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">事後 {postCount}件</span>
                      {privateCount > 0 && (
                        <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">プライベート {privateCount}件</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/event/${ev.id}`}
                        className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1 py-1.5 px-3 rounded-xl transition-colors shadow-sm"
                      >
                        📊 集団結果を見る
                      </Link>
                      <button
                        onClick={() => toggleExpand(ev.id)}
                        className="text-xs font-bold text-orange-600 hover:text-orange-800 flex items-center gap-1 py-1.5 px-3 rounded-xl hover:bg-orange-50 transition-colors"
                      >
                        回答一覧 ({eventSurveys.length}件) {isExpanded ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {/* 📋 回答結果一覧（開閉部） */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50/80 p-5 rounded-2xl">
                      <h4 className="text-xs font-bold text-gray-600 mb-3">アンケート回答ログ</h4>

                      {eventSurveys.length === 0 ? (
                        <p className="text-xs text-gray-400 py-4 text-center bg-white rounded-xl border border-gray-100">まだ回答がありません。</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
                            <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                              <tr>
                                <th className="p-3">回答者 (ニックネーム / ID)</th>
                                <th className="p-3">タイミング</th>
                                <th className="p-3">総合平均点</th>
                                <th className="p-3">合計点</th>
                                <th className="p-3">回答日時</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                              {eventSurveys.map((s) => {
                                const isPost = s.timing_type === 'post';
                                const isPrivateRow = s.timing_type === 'private';
                                const timingLabel = isPrivateRow ? 'プライベート' : isPost ? '事後 (Post)' : '事前 (Pre)';
                                const timingBadgeClass = isPrivateRow
                                  ? 'bg-purple-100 text-purple-700'
                                  : isPost
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-orange-100 text-orange-700';
                                return (
                                  <tr key={s.id} className="hover:bg-orange-50/50 transition-colors">
                                    <td className="p-3 font-bold text-gray-800">
                                      {s.display_name}
                                    </td>
                                    <td className="p-3">
                                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${timingBadgeClass}`}>
                                        {timingLabel}
                                      </span>
                                    </td>
                                    <td className="p-3 font-black text-gray-900 text-sm">
                                      {Number(s.total_mean).toFixed(2)} <span className="text-gray-400 text-xs font-normal">/ 5.0</span>
                                    </td>
                                    <td className="p-3 text-gray-500 font-medium">{s.total_sum} 点</td>
                                    <td className="p-3 text-gray-400">{formatDate(s.created_at)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}