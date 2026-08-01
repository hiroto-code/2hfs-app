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
    <div className="min-h-screen bg-gray-50 py-10 px-4 font-sans">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* ヘッダー部分 */}
        <div className="bg-indigo-600 px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-wide">
            プライベートログ
          </h1>
          <p className="text-indigo-100 text-sm mt-2">
            今日の健幸度を記録しましょう
          </p>
        </div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          
          {/* スコア入力 */}
          <div className="mb-8">
            <label className="block text-gray-700 font-bold mb-4 text-center">
              今の状態は何点ですか？ (1〜5)
            </label>
            <div className="flex justify-center items-center gap-4">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  className={`w-12 h-12 rounded-full font-bold text-lg transition-all ${
                    score === value
                      ? 'bg-indigo-600 text-white shadow-md transform scale-110'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="今日はよく眠れた、仕事が忙しかった、など..."
              className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-32"
            />
          </div>

          {/* ボタン類 */}
          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '記録を保存する'}
            </button>
            
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold py-3.5 px-4 rounded-xl transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}