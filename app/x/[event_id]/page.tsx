'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { type ExtraQuestion, EXTRA_LIKERT_SCALE } from '@/lib/extraQuestions';

export default function ExtraOnlyPage({ params }: { params: Promise<{ event_id: string }> }) {
  const { event_id } = use(params);
  const [eventTitle, setEventTitle] = useState('');
  const [questions, setQuestions] = useState<ExtraQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [id: string]: string | number }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('events')
        .select('title, extra_questions')
        .eq('id', event_id)
        .maybeSingle();

      setEventTitle(data?.title || '');
      setQuestions(Array.isArray(data?.extra_questions) ? data.extra_questions : []);
      setLoading(false);
    };
    fetchData();
  }, [event_id]);

  const handleAnswerChange = (id: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    for (const q of questions) {
      if (!q.required) continue;
      const val = answers[q.id];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        setErrorMsg(`「${q.textJa}」にお答えください。`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const nameQuestion = questions.find((q) => q.type === 'name');
      const displayName = nameQuestion ? (answers[nameQuestion.id] as string) || '' : '';

      const { error } = await supabase.from('extra_question_responses').insert({
        event_id,
        display_name: displayName.trim() || null,
        answers,
      });

      if (error) throw new Error(error.message);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg('送信に失敗しました: ' + (err.message || '通信エラー'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-orange-400 font-bold animate-pulse text-sm">読み込み中...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-md border border-orange-100 text-center text-gray-500 text-sm max-w-md">
          このイベントには、現在回答できる追加質問がありません。
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-md border border-emerald-100 text-center max-w-md">
          <div className="text-4xl mb-3">🎉</div>
          <h1 className="text-lg font-bold text-emerald-700 mb-2">ご回答ありがとうございました！</h1>
          <p className="text-sm text-gray-500">いただいた回答は、今後の運営の参考にさせていただきます。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-3 md:p-6 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="p-5 md:p-6 rounded-3xl shadow-md border border-emerald-200 mb-5 text-center bg-white/90 backdrop-blur-md">
          <h1 className="text-xl md:text-2xl font-black text-emerald-700">{eventTitle} アンケート 📝</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border border-emerald-100 space-y-2">
            <p className="text-xs text-gray-500 leading-relaxed">
              今後の運営の参考とするための質問です。全参加者の方にご回答をお願いしています。
            </p>
          </div>

          {questions.map((q) => (
            <div key={q.id} className="bg-white p-5 rounded-3xl shadow-sm border border-emerald-50 space-y-3">
              <p className="font-bold text-gray-900 text-base leading-snug">
                {q.textJa} {q.required !== false && <span className="text-rose-500">*</span>}
              </p>

              {q.type === 'likert' && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 sm:gap-2 pt-1">
                  {EXTRA_LIKERT_SCALE.map((opt) => {
                    const isSelected = answers[q.id] === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => handleAnswerChange(q.id, opt.val)}
                        className={`flex flex-row sm:flex-col items-center sm:justify-start gap-3 sm:gap-0 px-4 py-3.5 sm:p-2.5 rounded-2xl border transition-all text-left sm:text-center min-h-[48px] active:scale-95 ${
                          isSelected
                            ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-md transform scale-[1.02]'
                            : 'bg-white/80 text-gray-800 border-gray-200/80 hover:bg-white'
                        }`}
                      >
                        <span className="text-lg font-black leading-none sm:mb-1.5 flex-shrink-0 w-7 text-center">{opt.val}</span>
                        <span className={`text-sm font-bold leading-snug block w-full break-words ${isSelected ? 'text-white' : 'text-gray-800'}`}>{opt.ja}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'choice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {(q.options || []).map((opt) => {
                    const isSelected = answers[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleAnswerChange(q.id, opt)}
                        className={`px-4 py-3 rounded-2xl border text-sm font-bold transition-all min-h-[48px] active:scale-95 ${
                          isSelected
                            ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white/80 text-gray-800 border-gray-200/80 hover:bg-white'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'text' && (
                <textarea
                  value={(answers[q.id] as string) || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:outline-none text-base text-gray-800 bg-emerald-50/20 shadow-inner"
                />
              )}

              {q.type === 'name' && (
                <input
                  type="text"
                  value={(answers[q.id] as string) || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  className="w-full p-3 border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:outline-none text-base text-gray-800 bg-emerald-50/20 shadow-inner"
                />
              )}
            </div>
          ))}

          {errorMsg && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl border border-rose-200 text-sm font-bold text-center shadow-sm">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 rounded-2xl font-bold text-white text-base md:text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 ${submitting ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
          >
            {submitting ? '送信中...' : '送信する ✨'}
          </button>
        </form>
      </div>
    </div>
  );
}
