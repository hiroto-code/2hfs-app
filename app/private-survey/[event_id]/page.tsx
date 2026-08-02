'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { domainQuestions, scaleOptions } from '@/lib/questions';

export default function PrivateSurveyPage({ params }: { params: Promise<{ event_id: string }> }) {
  const resolvedParams = use(params);
  const { event_id } = resolvedParams;
  
  const router = useRouter();

  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleScoreChange = (qIndex: number, val: number) => {
    setAnswers(prev => ({ ...prev, [qIndex]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (Object.keys(answers).length < 18) {
      setErrorMsg('すべての質問（18問）にお答えください。 / Please answer all 18 questions.');
      return;
    }

    setLoading(true);

    try {
      // 各領域の平均点計算
      const getDomainMean = (indices: number[]) => {
        const sum = indices.reduce((acc, idx) => acc + (answers[idx] || 0), 0);
        return sum / indices.length;
      };

      const domain_kaishoku = getDomainMean([0, 1, 2]);
      const domain_kaimin = getDomainMean([3, 4, 5]);
      const domain_kaido = getDomainMean([6, 7, 8]);
      const domain_kaisho = getDomainMean([9, 10, 11]);
      const domain_kairaku = getDomainMean([12, 13, 14]);
      const domain_kaisei = getDomainMean([15, 16, 17]);

      const total_sum = Object.values(answers).reduce((acc, cur) => acc + cur, 0);
      const total_mean = total_sum / 18;

      const submission_token = crypto.randomUUID();

      // DBの全対応カラムへ一元保存するペイロード
      const payload = {
        event_id,
        participant_id: 'guest', // セルフチェックなので固定IDを使用
        timing_type: 'post',     // 便宜上事後として保存
        display_language: 'bilingual',
        answers,
        q1: answers[0], q2: answers[1], q3: answers[2],
        q4: answers[3], q5: answers[4], q6: answers[5],
        q7: answers[6], q8: answers[7], q9: answers[8],
        q10: answers[9], q11: answers[10], q12: answers[11],
        q13: answers[12], q14: answers[13], q15: answers[14],
        q16: answers[15], q17: answers[16], q18: answers[17],
        domain_kaishoku, domain_kaimin, domain_kaido,
        domain_kaisho, domain_kairaku, domain_kaisei,
        total_sum, total_mean, submission_token
      };

      const { error } = await supabase.from('surveys').insert(payload);

      if (error) throw new Error(error.message);

      // 回答完了後、結果ページ（レーダーチャート）へジャンプ
      router.push(`/result/${submission_token}`);

    } catch (err: any) {
      console.error(err);
      setErrorMsg('送信に失敗しました: ' + (err.message || '通信エラー'));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-3 md:p-6 font-sans bg-gray-50 min-h-screen">
      
      {/* ヘッダー */}
      <div className="p-5 md:p-6 rounded-3xl shadow-sm border border-indigo-100 mb-6 text-center bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-60 -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
        <h1 className="text-xl md:text-2xl font-black text-indigo-900 mb-2">
          いまの「健幸度」を測定🌿
        </h1>
        <p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed">
          直近のあなたの状態について、最もあてはまるものを直感でお選びください。<br/>
          （全18問・約1分で完了します）
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        
        {/* 凡例 */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 text-[10px] md:text-xs text-gray-600 flex flex-wrap gap-2 justify-center shadow-sm">
          {scaleOptions.map(opt => (
            <span key={opt.val} className="whitespace-nowrap">
              <strong>{opt.val}</strong>: {opt.ja}
            </span>
          ))}
        </div>

        {/* 質問リスト */}
        {domainQuestions?.map((group) => (
          <div key={group.domainKey} className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-base md:text-lg font-bold text-indigo-900 border-b-2 border-indigo-50 pb-2 mb-4 flex items-center gap-2">
              <span className="text-xl">✨</span>
              <span>{group.domainJa}</span>
            </h2>

            <div className="space-y-6">
              {group.items.map((item) => {
                const qNum = item.index + 1;
                return (
                  <div key={item.index} className="space-y-2">
                    <p className="font-bold text-gray-800 text-sm leading-snug">
                      Q{qNum}. {item.textJa}
                    </p>

                    {/* 1〜5の選択肢ボタン */}
                    <div className="grid grid-cols-5 gap-1.5 md:gap-2 pt-1">
                      {scaleOptions.map((opt) => {
                        const isSelected = answers[item.index] === opt.val;
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => handleScoreChange(item.index, opt.val)}
                            className={`flex flex-col items-center justify-center py-2 px-1 md:p-2 rounded-xl border-2 transition-all text-center h-full ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100 hover:border-gray-200'
                            }`}
                          >
                            <span className="text-lg md:text-xl font-black mb-1">{opt.val}</span>
                            <span className={`text-[9px] md:text-[10px] font-bold leading-tight block w-full break-words ${isSelected ? 'text-indigo-50' : 'text-gray-500'}`}>
                              {opt.ja}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-200 text-sm font-bold text-center shadow-sm">
            {errorMsg}
          </div>
        )}

        {/* 送信ボタン */}
        <div className="pt-4 pb-12">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-900 hover:bg-indigo-800'
            }`}
          >
            {loading ? '結果を生成中...' : '測定結果を見る ▶'}
          </button>
        </div>

      </form>
    </div>
  );
}