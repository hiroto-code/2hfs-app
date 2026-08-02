'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase'; // ← ここを `../../` に修正しました！

export default function PrivateLogPage() {
  const router = useRouter();
  const [score, setScore] = useState<number>(3);
  const [memo, setMemo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. プライベートイベントのタイトルを生成
      const eventTitle = `【プライベート】${memo.trim() || '今日の振り返り'}`;
      
      // 今日の日付を取得 (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];

      // 2. Supabaseのeventsテーブルに新規イベントを自動作成
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert([
          {
            title: eventTitle,
            event_date: today,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (newEvent && newEvent.id) {
        // 3. 作成されたイベントIDを使って、実際のアンケート回答画面へ自動遷移
router.push(`/p/${newEvent.id}/post`);
      }

    } catch (err: any) {
      console.error('Event creation error:', err);
      setErrorMsg('エラーが発生しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 font-sans flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-indigo-50 overflow-hidden relative">
        
        {/* 装飾用の背景円 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-50 -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-50 -z-10 transform -translate-x-1/2 translate-y-1/2"></div>

        {/* ヘッダー部分 */}
        <div className="pt-10 pb-6 px-8 text-center relative z-10">
          <div className="inline-block bg-indigo-100 text-indigo-600 text-xs font-black px-3 py-1 rounded-full mb-3 tracking-wider">
            SELF CHECK
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-tight mb-2">
            今の「健幸度」を<br />チェックしてみよう！🌿
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-3 leading-relaxed">
            たった1分の簡単な質問で、<br />いまのあなたのバランスをグラフで可視化します。
          </p>
        </div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="px-8 pb-10 relative z-10">
          
          {/* 気分入力 */}
          <div className="mb-8">
            <label className="block text-gray-700 font-bold mb-4 text-center text-sm">
              チェックを始める前に、今の気分は？
            </label>
            <div className="flex justify-between items-center gap-2">
              {[
                { val: 1, emoji: '😫' },
                { val: 2, emoji: '😕' },
                { val: 3, emoji: '😐' },
                { val: 4, emoji: '🙂' },
                { val: 5, emoji: '✨' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setScore(item.val)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 ${
                    score === item.val
                      ? 'bg-indigo-100 border-2 border-indigo-500 shadow-sm transform scale-110'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                  }`}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* タイトル入力 */}
          <div className="mb-8">
            <label className="block text-gray-700 font-bold mb-2 text-sm">
              何についての記録ですか？（任意）
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例：今日の振り返り、朝サウナ など"
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm bg-gray-50 focus:bg-white"
            />
          </div>

          {/* エラーメッセージ */}
          {errorMsg && (
            <p className="text-red-500 text-xs font-bold text-center mb-4">{errorMsg}</p>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col gap-3 mt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isSubmitting ? '準備中...' : 'さっそく測定を始める (約1分) ▶'}
            </button>
            
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full bg-transparent text-gray-400 hover:text-gray-600 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
            >
              あとでにする
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}