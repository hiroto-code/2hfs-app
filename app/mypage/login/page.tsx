'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false); // 💡 メッセージの色を変えるために追加

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${baseUrl}/mypage`, // ここにリダイレクトさせる
      },
    });

    if (error) {
      setMessage('エラーが発生しました: ' + error.message);
      setIsError(true);
    } else {
      setMessage('✨ ログインURLを記載したメールを送信しました！メールボックスをご確認ください。');
      setIsError(false);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-orange-100 max-w-md w-full relative overflow-hidden">
        
        {/* 装飾用の背景円 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200 rounded-full blur-3xl opacity-40 -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-200 rounded-full blur-3xl opacity-40 -z-10 transform -translate-x-1/2 translate-y-1/2"></div>

        <h1 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">マイページにログイン🌿</h1>
        <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
          登録したメールアドレスを入力してください。専用のログインURLをお送りします。
        </p>

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-orange-100 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all shadow-sm"
              placeholder="example@email.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? '送信中...' : 'ログインURLをメールで送る ▶'}
          </button>
        </form>

        {message && (
          <div 
            className={`mt-6 p-4 text-sm font-bold rounded-2xl border shadow-sm relative z-10 leading-relaxed ${
              isError 
                ? 'bg-rose-50 text-rose-600 border-rose-200' 
                : 'bg-orange-50 text-orange-700 border-orange-200'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}