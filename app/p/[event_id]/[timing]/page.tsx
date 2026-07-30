'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { domainQuestions, scaleOptions } from '@/lib/questions';

export default function SurveyPage({ params }: { params: Promise<{ event_id: string; timing: string }> }) {
  const { event_id, timing } = use(params);
  const router = useRouter();

  const [participantId, setParticipantId] = useState('');
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isPost = timing === 'post';

  const handleScoreChange = (qIndex: number, val: number) => {
    setAnswers(prev => ({ ...prev, [qIndex]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!participantId.trim()) {
      setErrorMsg('参加者ID（またはお名前・ニックネーム）を入力してください。 / Please enter your Participant ID.');
      return;
    }

    if (Object.keys(answers).length < 18) {
      setErrorMsg('すべての質問（18問）にお答えください。 / Please answer all 18 questions.');
      return;
    }

    setLoading(true);

    try {
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

      const { error } = await supabase.from('surveys').insert({
        event_id,
        participant_id: participantId.trim(),
        timing_type: timing,
        display_language: 'bilingual',
        answers,
        domain_kaishoku,
        domain_kaimin,
        domain_kaido,
        domain_kaisho,
        domain_kairaku,
        domain_kaisei,
        total_sum,
        total_mean,
        submission_token
      });

      if (error) throw error;

      router.push(`/result/${submission_token}`);

    } catch (err: any) {
      console.error(err);
      setErrorMsg('送信に失敗しました: ' + (err.message || '通信エラー'));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 font-sans bg-gray-50 min-h-screen">
      
      {/* ヘッダー */}
      <div className={`p-6 rounded-2xl shadow-sm border mb-6 text-center bg-white ${isPost ? 'border-green-200' : 'border-blue-200'}`}>
        <h1 className={`text-2xl font-bold ${isPost ? 'text-green-600' : 'text-blue-600'}`}>
          {isPost ? '事後アンケート' : '事前アンケート'}
          <span className="block text-sm font-normal mt-1 text-gray-500">
            {isPost ? 'Post-event Survey' : 'Pre-event Survey'}
          </span>
        </h1>
        <p className="text-xs md:text-sm text-gray-600 mt-3">
          直近のあなたの状態について、最もあてはまるものを直感でお選びください。
          <span className="block text-xs text-gray-400 mt-0.5">Please intuitively select the option that best describes your recent state.</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 参加者ID入力エリア */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <label className="block text-sm font-bold text-gray-800 mb-1">
            参加者ID（またはお名前・ニックネーム） <span className="text-red-500">*</span>
            <span className="block text-xs font-normal text-gray-500">Participant ID / Name</span>
          </label>
          <input
            type="text"
            required
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            placeholder="例: yamada123"
            className="w-full mt-2 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-base"
          />
          <p className="text-xs text-gray-400 mt-1">※事前・事後で同じIDをご入力ください。</p>
        </div>

        {/* 質問リスト */}
        {domainQuestions.map((group) => (
          <div key={group.domainKey} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-blue-900 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
              <span>{group.domainJa}</span>
              <span className="text-xs font-normal text-gray-400">/ {group.domainEn}</span>
            </h2>

            <div className="space-y-6">
              {group.items.map((item) => {
                const qNum = item.index + 1;
                return (
                  <div key={item.index} className="space-y-2">
                    <p className="font-bold text-gray-800 text-sm md:text-base leading-snug">
                      Q{qNum}. {item.textJa}
                      <span className="block text-xs font-normal text-gray-500 mt-0.5">{item.textEn}</span>
                    </p>

                    {/* 1〜5の選択肢ボタン（スマホ最適化） */}
                    <div className="grid grid-cols-5 gap-1 md:gap-2 pt-1">
                      {scaleOptions.map((opt) => {
                        const isSelected = answers[item.index] === opt.val;
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => handleScoreChange(item.index, opt.val)}
                            className={`flex flex-col items-center justify-between p-1.5 md:p-2.5 rounded-xl border transition-all text-center ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <span className="text-base md:text-lg font-black leading-none mb-1">{opt.val}</span>
                            <span className="text-[10px] md:text-xs font-medium leading-tight block w-full break-all">
                              {opt.ja}
                            </span>
                            <span className={`text-[8px] md:text-[10px] leading-tight block w-full mt-0.5 opacity-80 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                              {opt.en}
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

        {/* エラーメッセージ */}
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-sm font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-md transition-all ${
            isPost ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? '送信中... / Submitting...' : isPost ? '事後アンケートを送信する' : '事前アンケートを送信する'}
        </button>

      </form>
    </div>
  );
}