'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Event = {
  id: string;
  title: string;
  created_at: string;
};

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
    } else if (data) {
      setEvents(data);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .insert([{ title: newTitle.trim() }])
      .select();

    if (error) {
      alert('イベント作成に失敗しました: ' + error.message);
    } else {
      setNewTitle('');
      fetchEvents();
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('URLをコピーしました！');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans bg-gray-50 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
        📊 管理者ダッシュボード
      </h1>

      {/* 新規イベント作成 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-3">新規イベント・研修の作成</h2>
        <form onSubmit={handleCreateEvent} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="例: 〇〇企業 研修会"
            className="flex-1 p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? '作成中...' : '作成する'}
          </button>
        </form>
      </div>

      {/* イベント一覧 */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800 mb-3">作成済みイベント一覧</h2>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white p-6 rounded-2xl text-center border">
            まだイベントが作成されていません。
          </p>
        ) : (
          events.map((ev) => {
            // ⭕ URLの形式を /pre と /post に修正
            const preUrl = `${baseUrl}/p/${ev.id}/pre`;
            const postUrl = `${baseUrl}/p/${ev.id}/post`;

            return (
              <div key={ev.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{ev.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">ID: {ev.id}</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {new Date(ev.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>

                {/* URL一覧 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 事前アンケート */}
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-blue-900 text-sm">📋 事前アンケート</span>
                      <a
                        href={preUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        開く ↗
                      </a>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={preUrl}
                      className="w-full text-xs p-2 bg-white border border-blue-200 rounded-lg text-gray-600 mb-2"
                    />
                    <button
                      onClick={() => copyToClipboard(preUrl)}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      事前URLをコピー
                    </button>
                  </div>

                  {/* 事後アンケート */}
                  <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-green-900 text-sm">✨ 事後アンケート</span>
                      <a
                        href={postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-green-600 hover:underline font-medium"
                      >
                        開く ↗
                      </a>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={postUrl}
                      className="w-full text-xs p-2 bg-white border border-green-200 rounded-lg text-gray-600 mb-2"
                    />
                    <button
                      onClick={() => copyToClipboard(postUrl)}
                      className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      事後URLをコピー
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}