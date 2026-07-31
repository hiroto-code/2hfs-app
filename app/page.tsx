'use client';

import { useEffect, useState } from 'react';
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
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      fetchData();
    } else {
      alert('削除に失敗しました: ' + error.message);
    }
  };

  // コピー処理
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // アコーディオン開閉
  const toggleExpand = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 font-sans min-h-screen bg-gray-50">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">2HFS 管理者ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">アンケートイベントの作成および回答状況・URLの管理ができます。</p>
      </header>

      {/* 新規イベント作成フォーム */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">新規イベントの作成</h2>
        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-gray-600 mb-1">イベント名</label>
            <input
              type="text"
              placeholder="例: SUPwell@狩野川"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">開催日程 (任意)</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors shadow-sm"
            >
              作成する
            </button>
          </div>
        </form>
      </div>

      {/* 作成済みイベント一覧 */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-gray-800">作成済みイベント一覧</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400 font-bold">読み込み中...</div>
        ) : events.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border text-center text-gray-400 text-sm">
            イベントがまだ登録されていません。
          </div>
        ) : (
          events.map((ev) => {
            // ⭕️ URL修正済み（/pre と /post）
            const preUrl = `${baseUrl}/p/${ev.id}/pre`;
            const postUrl = `${baseUrl}/p/${ev.id}/post`;

            // このイベントに紐づく回答データを抽出
            const eventSurveys = surveys.filter((s) => s.event_id === ev.id);
            const preCount = eventSurveys.filter((s) => s.timing_type === 'pre').length;
            const postCount = eventSurveys.filter((s) => s.timing_type === 'post').length;

            const isExpanded = expandedEventId === ev.id;
            const targetDate = ev.event_date || ev.date;

            return (
              <div key={ev.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-800">{ev.title}</h3>
                      {targetDate && (
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md">
                          📅 {targetDate}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">ID: {ev.id}</p>
                  </div>

                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                  >
                    削除
                  </button>
                </div>

                {/* 事前 / 事後 URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                    <div className="text-xs font-bold text-blue-700 mb-1">事前アンケート URL</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={preUrl}
                        className="w-full bg-white px-2 py-1 border rounded text-xs text-gray-600 truncate"
                      />
                      <a
                        href={preUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                      >
                        開く ↗
                      </a>
                      <button
                        onClick={() => handleCopy(preUrl, `${ev.id}-pre`)}
                        className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                      >
                        {copiedId === `${ev.id}-pre` ? 'コピー完了' : 'コピー'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <div className="text-xs font-bold text-emerald-700 mb-1">事後アンケート URL</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={postUrl}
                        className="w-full bg-white px-2 py-1 border rounded text-xs text-gray-600 truncate"
                      />
                      <a
                        href={postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                      >
                        開く ↗
                      </a>
                      <button
                        onClick={() => handleCopy(postUrl, `${ev.id}-post`)}
                        className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                      >
                        {copiedId === `${ev.id}-post` ? 'コピー完了' : 'コピー'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 📊 アコーディオン展開ボタン */}
                <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <span>回答件数:</span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">事前 {preCount}件</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">事後 {postCount}件</span>
                  </div>

                  <button
                    onClick={() => toggleExpand(ev.id)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 py-1 px-3 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    📊 回答結果を確認 ({eventSurveys.length}件) {isExpanded ? '▲' : '▼'}
                  </button>
                </div>

                {/* 📋 回答結果一覧（開閉部） */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50/80 p-4 rounded-xl">
                    <h4 className="text-xs font-bold text-gray-700 mb-3">アンケート回答ログ</h4>

                    {eventSurveys.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2 text-center">まだ回答がありません。</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
                          <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                            <tr>
                              <th className="p-2.5">回答者 (ニックネーム / ID)</th>
                              <th className="p-2.5">タイミング</th>
                              <th className="p-2.5">総合平均点</th>
                              <th className="p-2.5">合計点</th>
                              <th className="p-2.5">回答日時</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-gray-700">
                            {eventSurveys.map((s) => {
                              const isPost = s.timing_type === 'post';
                              return (
                                <tr key={s.id} className="hover:bg-gray-50">
                                  <td className="p-2.5 font-bold text-gray-800">
                                    {s.display_name}
                                  </td>
                                  <td className="p-2.5">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        isPost
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-orange-100 text-orange-800'
                                      }`}
                                    >
                                      {isPost ? '事後 (Post)' : '事前 (Pre)'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 font-black text-gray-900">
                                    {Number(s.total_mean).toFixed(2)} / 5.0
                                  </td>
                                  <td className="p-2.5 text-gray-500">{s.total_sum} 点</td>
                                  <td className="p-2.5 text-gray-400">{formatDate(s.created_at)}</td>
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
  );
}