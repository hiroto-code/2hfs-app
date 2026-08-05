'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function PrivateLogPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [score, setScore] = useState<number>(3);
  const [memo, setMemo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 💡 前回入力した名前があればローカルストレージから自動で初期セット
  useEffect(() => {
    const savedName = localStorage.getItem('user_display_name');
    if (savedName) {
      setDisplayName(savedName);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 名前の入力チェック
    if (!displayName.trim()) {
      setErrorMsg('お名前（ニックネーム）を入力してください。');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 💡 1. ログイン中のユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      const currentEmail = user?.email;
      const participantId = currentEmail || user?.id;

      // 💡 2. ニックネームを `user_profiles` テーブルに保存/更新（upsert）
      if (participantId) {
        // ローカルストレージにも保存しておく（次回以降の入力省略用）
        localStorage.setItem('user_display_name', displayName.trim());

        const profileData: any = {
          display_name: displayName.trim(),
          updated_at: new Date().toISOString(),
        };

        if (currentEmail) {
          profileData.email = currentEmail;
          profileData.participant_id = currentEmail;
        } else if (user?.id) {
          profileData.participant_id = user.id;
        }

        // profilesテーブルへ上書きまたは新規作成
        await supabase
          .from('user_profiles')
          .upsert(profileData, { onConflict: currentEmail ? 'email' : 'participant_id' });
      }

      // 3. プライベートイベントのタイトルを生成
      const eventTitle = `【プライベート】${memo.trim() || '今日の振り返り'}`;
      
      // 今日の日付を取得 (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0];

      // 4. Supabaseのeventsテーブルに新規イベントを自動作成
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
        // 5. 作成されたイベントIDを使って、実際のアンケート回答画面へ自動遷移
        router.push(`/private-survey/${newEvent.id}`);
      }

    } catch (err: any) {
      console.error('Event creation error:', err);
      setErrorMsg('エラーが発生しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-12 px-4 font-sans flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-orange-100 overflow-hidden relative">
        
        {/* 装飾用の背景円 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200 rounded-full blur-3xl opacity-40 -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-200 rounded-full blur-3xl opacity-40 -z-10 transform -translate-x-1/2 translate-y-1/2"></div>

        {/* ヘッダー部分 */}
        <div className="pt-10 pb-6 px-8 text-center relative z-10">
          <div className="inline-block bg-orange-100 text-orange-600 text-xs font-black px-3 py-1 rounded-full mb-3 tracking-wider">
            SELF CHECK
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-tight mb-2">
            今の「健幸度」を<br />チェックしてみよう！🌿
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-3 leading-relaxed">
            たった1分の簡単な質問で、<br />いまのあなたのバランスをグラフで可視化します。
          </p>
          <div className="mt-4 text-left bg-orange-50/60 border border-orange-100 rounded-2xl p-4">
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              💡 メールアドレスを登録すると、専用の<span className="font-bold text-orange-600">マイダッシュボード</span>で健幸度の変化を振り返ることができます。<br />
              何度でもチェックしてOK — 続けることで、自分らしいリズムや変化が見えてきます。
            </p>
          </div>
        </div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="px-8 pb-10 relative z-10">
          
          {/* お名前（ニックネーム）入力欄 */}
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2 text-sm">
              あなたのお名前・ニックネーム <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例：さぷうぇる、ドラ◯もん、など"
              className="w-full bg-white border-2 border-orange-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all text-sm font-medium text-gray-800 placeholder-gray-400 shadow-sm"
            />
          </div>

          {/* 気分入力 */}
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-3 text-center text-sm">
              今の気分は？
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
                      ? 'bg-orange-100 border-2 border-orange-400 shadow-md transform scale-110'
                      : 'bg-white border-2 border-orange-50 hover:border-orange-200 hover:bg-orange-50 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 shadow-sm'
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
              className="w-full bg-white border-2 border-orange-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all text-sm font-medium text-gray-800 placeholder-gray-400 shadow-sm"
            />
          </div>

          {/* エラーメッセージ */}
          {errorMsg && (
            <p className="text-rose-500 text-xs font-bold text-center mb-4">{errorMsg}</p>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col gap-3 mt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white font-bold py-4 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isSubmitting ? '準備中...' : 'さっそく測定を始める (約1分) ▶'}
            </button>
            
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full bg-transparent text-gray-400 hover:text-orange-500 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
            >
              あとでにする
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}