'use client';

import { useState, use } from 'react';
import { supabase } from '@/lib/supabase';

// URLのパラメータ（event_id と timing）を受け取るための型定義
interface PageProps {
  params: Promise<{
    event_id: string;
    timing: string;
  }>;
}

export default function SurveyFormPage({ params }: PageProps) {
  // Next.js の仕様に合わせて params を展開
  const { event_id, timing } = use(params);
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answerText, setAnswerText] = useState('');

  // timing が 'pre' なら事前、それ以外（'post'）なら事後としてタイトルを出し分ける
  const isPre = timing === 'pre';
  const pageTitle = isPre ? '事前アンケート' : '事後アンケート';

  // 送信ボタンを押したときの処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // surveys テーブルに回答データを保存する（※実際のカラム名に合わせて後で調整可能です）
      const { error } = await supabase
        .from('surveys')
        .insert([
          {
            event_id: event_id,
            timing_type: timing,
            content: answerText, // ← 追加：入力されたテキストを content 枠に保存する指示！
          }
        ]);

      if (error) throw error;
      
      // 送信成功したら完了画面に切り替え
      setSubmitted(true);
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 送信完了後の画面
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <h2 className="text-xl font-bold text-slate-800 mb-2">送信完了</h2>
          <p className="text-slate-600">アンケートにご協力いただき、ありがとうございました！</p>
        </div>
      </div>
    );
  }

  // アンケート入力画面
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-sm border border-slate-200">
        
        <header className="border-b border-slate-100 pb-6 mb-6">
          <span className="text-sm font-bold text-blue-600 tracking-wider">
            {isPre ? 'PRE-SURVEY' : 'POST-SURVEY'}
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">{pageTitle}</h1>
          <p className="text-slate-500 text-sm mt-2 text-gray-500">
            イベントID: <span className="font-mono text-xs">{event_id}</span>
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 仮の質問項目 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              ご意見・ご感想をお聞かせください
            </label>
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              placeholder="ここに入力してください..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? '送信中...' : 'アンケートを送信する'}
          </button>
        </form>

      </div>
    </div>
  );
}