'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrivateLogPage() {
  const router = useRouter();
  const [score, setScore] = useState<number>(3);
  const [memo, setMemo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: ここにSupabaseへの保存処理を追加します
    console.log('保存するデータ:', { score, memo });

    // 保存完了の疑似的な待機時間
    setTimeout(() => {
      alert('プライベートログを保存しました！（※現在はテスト動作です）');
      setIsSubmitting(false);
      router.back(); // 前の画面（ダッシュボード）に戻る
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-12 px-4 font-sans flex items-center justify-center">
      <div className="max-w-xl w-full mx-auto bg-white rounded-3xl shadow-xl border border-orange-100 overflow-hidden relative">
        
        {/* 装飾用の背景円（温かい色合い） */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200 rounded-full blur-3xl opacity-40 -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-200 rounded-full blur-3xl opacity-40 -z-10 transform -translate-x-1/2 translate-y-1/2"></div>

        {/* ヘッダー部分（前の画面とデザインを統一） */}
        <div className="pt-10 pb-6 px-8 text-center relative z-10">
          <div className="inline-block bg-orange-100 text-orange-600 text-xs font-black px-3 py-1 rounded-full mb-3 tracking-wider">
            PRIVATE LOG
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-tight mb-2">
            プライベートログ🌿
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-3 leading-relaxed">
            今日の健幸度を記録しましょう
          </p>
        </div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="px-8 pb-10 relative z-10">
          
          {/* スコア入力 */}
          <div className="mb-8">
            <label className="block text-gray-700 font-bold mb-4 text-center text-sm">
              今の状態は何点ですか？ (1〜5)
            </label>
            <div className="flex justify-center items-center gap-4">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  // 選択時と未選択時で温かい色合いに変化し、アニメーションも統一
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all duration-200 ${
                    score === value
                      ? 'bg-orange-100 border-2 border-orange-400 text-orange-700 shadow-md transform scale-110'
                      : 'bg-white border-2 border-orange-50 hover:border-orange-200 hover:bg-orange-50 text-gray-400 hover:text-gray-600 shadow-sm'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* メモ入力 */}
          <div className="mb-8">
            <label className="block text-gray-700 font-bold mb-2 text-sm">
              ひとことメモ（任意）
            </label>
            {/* 入力欄を見やすく白背景＋オレンジ枠線＋うっすら影に */}
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="今日はよく眠れた、仕事が忙しかった、など..."
              className="w-full bg-white border-2 border-orange-200 rounded-xl p-4 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all text-sm font-medium text-gray-800 placeholder-gray-400 shadow-sm resize-none h-32"
            />
          </div>

          {/* ボタン類 */}
          <div className="flex flex-col gap-3 mt-4">
            {/* メインボタンを温かいグラデーションに */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white font-bold py-4 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isSubmitting ? '保存中...' : '記録を保存する'}
            </button>
            
            {/* キャンセルボタンを前の画面の「あとでにする」と同じスタイルに */}
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full bg-transparent text-gray-400 hover:text-orange-500 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}