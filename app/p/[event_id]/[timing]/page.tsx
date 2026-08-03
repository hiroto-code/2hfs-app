'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { domainQuestions, scaleOptions } from '@/lib/questions';

const domainStyles: Record<string, { bg: string; border: string; title: string }> = {
  kaishoku: { bg: 'bg-rose-50/60', border: 'border-rose-200', title: 'text-rose-800' },
  kaimin:   { bg: 'bg-blue-50/60', border: 'border-blue-200', title: 'text-blue-800' },
  kaido:    { bg: 'bg-emerald-50/60', border: 'border-emerald-200', title: 'text-emerald-800' },
  kaisho:   { bg: 'bg-amber-50/60', border: 'border-amber-200', title: 'text-amber-800' },
  kairaku:  { bg: 'bg-purple-50/60', border: 'border-purple-200', title: 'text-purple-800' },
  kaisei:   { bg: 'bg-cyan-50/60', border: 'border-cyan-200', title: 'text-cyan-800' },
};

export default function SurveyPage({ params }: { params: Promise<{ event_id: string; timing: string }> }) {
  const resolvedParams = use(params);
  const { event_id, timing } = resolvedParams;
  
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isPost = timing === 'post';
  const isPrivate = timing === 'private';

  useEffect(() => {
    const savedEmail = localStorage.getItem('supwell_user_email');
    const savedName = localStorage.getItem('supwell_user_name');
    if (savedEmail) setEmail(savedEmail);
    if (savedName) setDisplayName(savedName);
  }, []);

  const handleScoreChange = (qIndex: number, val: number) => {
    setAnswers(prev => ({ ...prev, [qIndex]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('メールアドレスを入力してください。 / Please enter your email address.');
      return;
    }

    if (Object.keys(answers).length < 18) {
      setErrorMsg('すべての質問（18問）にお答えください。 / Please answer all 18 questions.');
      return;
    }

    setLoading(true);

    try {
      const formattedEmail = email.trim().toLowerCase();
      const formattedName = displayName.trim() || 'ゲスト';

      localStorage.setItem('supwell_user_email', formattedEmail);
      localStorage.setItem('supwell_user_name', formattedName);

      // 💡 超強力ガード：正しいUUIDの形式かどうかを正規表現でチェックする
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event_id || '');
      // 💡 "private" など不正な形式の時は強制的に null にする
      const dbEventId = isUUID ? event_id : null;

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

      const payload = {
        event_id: dbEventId, 
        participant_id: formattedEmail,
        display_name: formattedName,
        timing_type: timing, 
        display_language: 'bilingual',
        answers,
        q1: answers[0], q2: answers[1], q3: answers[2], q4: answers[3],
        q5: answers[4], q6: answers[5], q7: answers[6], q8: answers[7],
        q9: answers[8], q10: answers[9], q11: answers[10], q12: answers[11],
        q13: answers[12], q14: answers[13], q15: answers[14], q16: answers[15],
        q17: answers[16], q18: answers[17],
        domain_kaishoku, domain_kaimin, domain_kaido,
        domain_kaisho, domain_kairaku, domain_kaisei,
        total_sum, total_mean, submission_token
      };

      if (dbEventId === null) {
        await supabase
          .from('surveys')
          .delete()
          .match({ 
            participant_id: formattedEmail,
            timing_type: timing 
          })
          .is('event_id', null);
      } else {
        await supabase
          .from('surveys')
          .delete()
          .match({ 
            event_id: dbEventId, 
            participant_id: formattedEmail,
            timing_type: timing 
          });
      }

      const { error } = await supabase
        .from('surveys')
        .insert(payload);

      if (error) {
        throw new Error(error.message);
      }

      router.push(`/result/${submission_token}`);

    } catch (err: any) {
      console.error(err);
      setErrorMsg('送信に失敗しました: ' + (err.message || '通信エラー'));
      setLoading(false);
    }
  };

  const headerBorder = isPrivate ? 'border-purple-200' : isPost ? 'border-emerald-200' : 'border-orange-200';
  const headerTitleColor = isPrivate ? 'text-purple-800' : isPost ? 'text-emerald-700' : 'text-amber-700';
  const submitBtnBg = isPrivate 
    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
    : isPost 
    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700' 
    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-3 md:p-6 font-sans">
      <div className="max-w-2xl mx-auto">
        {!isPrivate && (
          <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-orange-100 shadow-sm mb-4 flex gap-2">
            <Link
              href={`/p/${event_id}/pre`}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                !isPost
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'text-gray-500 hover:bg-orange-50/50'
              }`}
            >
              <span>📋 事前アンケート</span>
            </Link>
            <Link
              href={`/p/${event_id}/post`}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                isPost
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : 'text-gray-500 hover:bg-orange-50/50'
              }`}
            >
              <span>✨ 事後アンケート</span>
            </Link>
          </div>
        )}

        <div className={`p-5 md:p-6 rounded-3xl shadow-md border mb-5 text-center bg-white/90 backdrop-blur-md ${headerBorder}`}>
          <h1 className={`text-xl md:text-2xl font-black ${headerTitleColor}`}>
            {isPrivate ? 'プライベート健幸度チェック 🌿' : isPost ? '事後アンケート ✨' : '事前アンケート 📋'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="bg-white p-5 rounded-3xl shadow-md border border-orange-100 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">メールアドレス <span className="text-rose-500">*</span></label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 p-3 border border-orange-200 rounded-2xl focus:ring-2 focus:ring-amber-400 focus:outline-none text-base text-gray-800 bg-orange-50/20 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">表示名・ニックネーム</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full mt-1 p-3 border border-orange-200 rounded-2xl focus:ring-2 focus:ring-amber-400 focus:outline-none text-base text-gray-800 bg-orange-50/20 shadow-inner"
              />
            </div>
          </div>

          {domainQuestions?.map((group) => {
            const style = domainStyles[group.domainKey] || { bg: 'bg-white', border: 'border-orange-100', title: 'text-amber-900' };
            return (
              <div key={group.domainKey} className={`p-4 md:p-6 rounded-3xl shadow-sm border transition-all ${style.bg} ${style.border}`}>
                <h2 className={`text-base md:text-lg font-bold border-b border-black/5 pb-2.5 mb-4 flex items-center gap-2 ${style.title}`}>
                  <span>{group.domainJa}</span>
                </h2>
                <div className="space-y-5 md:space-y-6">
                  {group.items.map((item) => {
                    const qNum = item.index + 1;
                    return (
                      <div key={item.index} className="space-y-2">
                        <p className="font-bold text-gray-800 text-sm leading-snug">Q{qNum}. {item.textJa}</p>
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                          {scaleOptions.map((opt) => {
                            const isSelected = answers[item.index] === opt.val;
                            const selectedBtnClass = isPrivate
                              ? 'bg-gradient-to-b from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md transform scale-[1.02]'
                              : isPost
                              ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-md transform scale-[1.02]'
                              : 'bg-gradient-to-b from-amber-500 to-orange-500 text-white border-orange-500 shadow-md transform scale-[1.02]';
                            return (
                              <button
                                key={opt.val} type="button"
                                onClick={() => handleScoreChange(item.index, opt.val)}
                                className={`flex flex-col items-center justify-start p-2 rounded-2xl border transition-all text-center h-full active:scale-95 ${isSelected ? selectedBtnClass : 'bg-white/80 text-gray-700 border-gray-200/80 hover:bg-white'}`}
                              >
                                <span className="text-base md:text-lg font-black leading-none mb-1.5">{opt.val}</span>
                                <span className={`text-[9px] md:text-[10px] font-bold leading-tight block w-full break-words ${isSelected ? 'text-white' : 'text-gray-700'}`}>{opt.ja}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {errorMsg && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl border border-rose-200 text-sm font-bold text-center shadow-sm">
              {errorMsg}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-white text-base md:text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] ${submitBtnBg} ${loading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
          >
            {loading ? '送信中...' : isPrivate ? '記録を保存する 🌿' : isPost ? '事後アンケートを送信する ✨' : '事前アンケートを送信する 📋'}
          </button>
        </form>
      </div>
    </div>
  );
}