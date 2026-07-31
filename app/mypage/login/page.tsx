'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${baseUrl}/mypage`, // ここにリダイレクトさせる
      },
    });

    if (error) {
      setMessage('エラーが発生しました: ' + error.message);
    } else {
      setMessage('✨ ログインURLを記載したメールを送信しました！メールボックスをご確認ください。');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">マイページにログイン</h1>
        <p className="text-sm text-gray-500 mb-6">
          登録したメールアドレスを入力してください。専用のログインURLをお送りします。
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? '送信中...' : 'ログインURLをメールで送る'}
          </button>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm font-bold rounded-lg border border-blue-100">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}