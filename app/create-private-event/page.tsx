'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function CreatePrivateEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  
  const [eventDate, setEventDate] = useState(() => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return today.toISOString().split('T')[0];
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setLoading(true);

    try {
      const eventId = crypto.randomUUID();

      // 💡 日付を「event_date」として正しくデータベースに送信します
      let { error } = await supabase
        .from('events')
        .insert([
          {
            id: eventId,
            title: title, 
            event_date: eventDate, // ここで日付を保存！
          }
        ]);

      // もし title カラムが存在しないエラーだった場合は、event_name で再挑戦
      if (error && error.code === 'PGRST204' && error.message.includes('title')) {
         const { error: retryError } = await supabase
          .from('events')
          .insert([
            {
              id: eventId,
              event_name: title,
              event_date: eventDate, // こちらでも日付を保存！
            }
          ]);
         error = retryError;
      }

      if (error) {
        throw error;
      }

      // 取得した正式なUUIDを使って、事前アンケート(2HFS)へ遷移
      router.push(`/p/${eventId}/pre`);

    } catch (err: any) {
      console.error('イベントの作成に失敗しました:', err);
      alert(`イベントの作成に失敗しました。\n\n【エラー詳細】\n${JSON.stringify(err, null, 2)}`);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 font-sans bg-gray-50 min-h-screen">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm mt-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          プライベートイベントの作成
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          日常の活動や個人的なイベントを記録して、アンケートに回答しましょう。
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              活動名・イベント名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：朝のランニング、読書、〇〇セミナー"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              日付 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !title}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-4 py-4 rounded-xl transition-colors shadow-sm disabled:bg-gray-400"
            >
              {loading ? '準備中...' : 'この内容で事前アンケートへ進む'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}