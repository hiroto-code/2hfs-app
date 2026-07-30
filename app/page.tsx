'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Event {
  id: string;
  title: string;
  event_date?: string;
  created_at?: string;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // イベント一覧を取得
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching events:', error);
      if (data) setEvents(data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // 新規イベント作成
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return;

    setLoading(true);
    try {
      const insertData: { title: string; event_date?: string } = {
        title: eventName.trim(),
      };
      if (eventDate) {
        insertData.event_date = eventDate;
      }

      const { data, error } = await supabase
        .from('events')
        .insert([insertData])
        .select();

      if (error) {
        alert('イベントの作成に失敗しました: ' + error.message);
      } else {
        setEventName('');
        setEventDate('');
        fetchEvents();
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // イベント削除機能
  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除してもよろしいですか？`)) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        alert('削除に失敗しました: ' + error.message);
      } else {
        fetchEvents();
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    }
  };

  // URLコピー機能
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* ヘッダー */}
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-800">2HFS 管理者ダッシュボード</h1>
          <p className="text-slate-500 text-sm mt-1">アンケートイベントの作成および回答URLの管理ができます。</p>
        </header>

        {/* イベント作成フォーム */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">新規イベントの作成</h2>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">イベント名</label>
                <input
                  type="text"
                  placeholder="例: テストイベント"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">開催日程 (任意)</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? '作成中...' : '作成する'}
            </button>
          </form>
        </section>

        {/* イベント一覧 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-700">作成済みイベント一覧</h2>
          
          {events.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500">
              まだイベントが作成されていません。上のフォームから新しく作成してください。
            </div>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => {
                const preUrl = `${getBaseUrl()}/p/${event.id}/pre`;
                const postUrl = `${getBaseUrl()}/p/${event.id}/post`;

                return (
                  <div key={event.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold text-slate-800">{event.title}</h3>
                          {event.event_date && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                              📅 {event.event_date}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">ID: {event.id}</p>
                      </div>

                      {/* 削除ボタン */}
                      <button
                        onClick={() => handleDeleteEvent(event.id, event.title)}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded transition font-medium border border-transparent hover:border-red-200"
                      >
                        削除
                      </button>
                    </div>

                    {/* URL共有領域 */}
                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      {/* 事前アンケート */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">事前アンケート URL</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={preUrl}
                            className="w-full text-xs bg-white p-2 rounded border border-slate-200 text-slate-600 font-mono"
                          />
                          <button
                            onClick={() => handleCopy(preUrl, `${event.id}-pre`)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded font-medium whitespace-nowrap"
                          >
                            {copiedUrl === `${event.id}-pre` ? 'コピー済!' : 'コピー'}
                          </button>
                        </div>
                      </div>

                      {/* 事後アンケート */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider block mb-1">事後アンケート URL</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={postUrl}
                            className="w-full text-xs bg-white p-2 rounded border border-slate-200 text-slate-600 font-mono"
                          />
                          <button
                            onClick={() => handleCopy(postUrl, `${event.id}-post`)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded font-medium whitespace-nowrap"
                          >
                            {copiedUrl === `${event.id}-post` ? 'コピー済!' : 'コピー'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}