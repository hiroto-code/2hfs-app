'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { domainQuestions, scaleOptions } from '@/lib/questions';
import { type ExtraQuestion, EXTRA_LIKERT_SCALE } from '@/lib/extraQuestions';

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
  const [mood, setMood] = useState<number>(3);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [extraQuestions, setExtraQuestions] = useState<ExtraQuestion[]>([]);
  const [extraAnswers, setExtraAnswers] = useState<{ [id: string]: string | number }>({});
  const [step, setStep] = useState<1 | 2>(1);

  const isPost = timing === 'post';
  const isPrivate = timing === 'private';

  // 💡 過去の回答データを取得してフォームに自動セットする処理
  const fetchExistingAnswers = async (targetEmail: string) => {
    if (!targetEmail.trim()) return;

    setFetchingExisting(true);
    try {
      const formattedEmail = targetEmail.trim().toLowerCase();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event_id || '');
      const dbEventId = isUUID ? event_id : null;

      let query = supabase
        .from('surveys')
        .select('*')
        .eq('participant_id', formattedEmail)
        .eq('timing_type', timing);

      if (dbEventId === null) {
        query = query.is('event_id', null);
      } else {
        query = query.eq('event_id', dbEventId);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (error) throw error;

      if (data) {
        // 過去の回答が存在した場合、フォームを自動復元
        if (data.answers && Object.keys(data.answers).length > 0) {
          setAnswers(data.answers);
        } else {
          // q1 ~ q18 カラムから回答を復元（バックアップ対応）
          const restoredAnswers: { [key: number]: number } = {};
          for (let i = 0; i < 18; i++) {
            const val = data[`q${i + 1}`];
            if (val !== undefined && val !== null) {
              restoredAnswers[i] = Number(val);
            }
          }
          if (Object.keys(restoredAnswers).length > 0) {
            setAnswers(restoredAnswers);
          }
        }

        if (data.display_name) {
          setDisplayName(data.display_name);
        }
        if (data.mood_score !== undefined && data.mood_score !== null) {
          setMood(Number(data.mood_score));
        }
        if (data.extra_answers && typeof data.extra_answers === 'object') {
          setExtraAnswers(data.extra_answers);
        }
        setHasExistingData(true);
      }
    } catch (err) {
      console.error('前回のデータ取得エラー:', err);
    } finally {
      setFetchingExisting(false);
    }
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem('supwell_user_email');
    const savedName = localStorage.getItem('supwell_user_name');
    if (savedName) setDisplayName(savedName);

    if (savedEmail) {
      setEmail(savedEmail);
      fetchExistingAnswers(savedEmail);
    }
  }, [event_id, timing]);

  // 事後アンケート(post)の場合のみ、そのイベント固有の「追加質問」を取得する
  useEffect(() => {
    const fetchExtraQuestions = async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event_id || '');
      if (timing !== 'post' || !isUUID) {
        setExtraQuestions([]);
        return;
      }
      const { data } = await supabase
        .from('events')
        .select('extra_questions')
        .eq('id', event_id)
        .maybeSingle();
      setExtraQuestions(Array.isArray(data?.extra_questions) ? data.extra_questions : []);
    };
    fetchExtraQuestions();
  }, [event_id, timing]);

  // メールアドレス入力欄のフォーカスが外れた際にも自動検索
  const handleEmailBlur = () => {
    if (email.trim()) {
      fetchExistingAnswers(email.trim());
    }
  };

  const handleScoreChange = (qIndex: number, val: number) => {
    setAnswers(prev => ({ ...prev, [qIndex]: val }));
  };

  const handleExtraAnswerChange = (id: string, value: string | number) => {
    setExtraAnswers((prev) => ({ ...prev, [id]: value }));
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

    if (extraQuestions.length > 0) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    await submitToDatabase();
  };

  const handleExtraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    for (const q of extraQuestions) {
      if (!q.required) continue;
      const val = extraAnswers[q.id];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        setErrorMsg(`「${q.textJa}」にお答えください。`);
        return;
      }
    }

    await submitToDatabase();
  };

  const submitToDatabase = async () => {
    setLoading(true);

    try {
      const formattedEmail = email.trim().toLowerCase();
      const formattedName = displayName.trim() || 'ゲスト';

      localStorage.setItem('supwell_user_email', formattedEmail);
      localStorage.setItem('supwell_user_name', formattedName);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event_id || '');
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
        total_sum, total_mean, submission_token,
        mood_score: mood,
        extra_answers: extraQuestions.length > 0 ? extraAnswers : {},
      };

      // 既存データの削除（上書き用のリセット）
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

      // ===== ⬇メール送信処理（マイページURLを /my/メールアドレス に修正） =====
      // 💡 新規回答の時だけ送る。既存データの「修正して上書き」では再送しない
      // （同じ人が再訪問して上書きするたびに案内メールが届くのを防ぐため）
      if (!hasExistingData) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formattedEmail,
              name: formattedName,
              dashboardUrl: `${window.location.origin}/my/${encodeURIComponent(formattedEmail)}?st=${submission_token}`
            }),
          });
        } catch (emailError) {
          console.error('メール送信エラー:', emailError);
        }
      }
      // ===== ⬆ここまで =====

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
          {hasExistingData && (
            <p className="text-xs text-emerald-600 font-bold mt-2 bg-emerald-50 border border-emerald-200 py-1 px-3 rounded-full inline-block">
              前回の回答データを読み込みました。修正箇所を選んで上書き保存できます。
            </p>
          )}
          <p className="text-sm text-gray-600 font-medium mt-3 leading-relaxed">
            スマートフォンで文字が小さい場合は、ブラウザの拡大表示もご利用ください。<br />
            <span className="text-gray-500">If the text appears small on your smartphone, you may also use your browser&apos;s zoom setting.</span>
          </p>
        </div>

        {step === 1 && (
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="bg-white p-5 rounded-3xl shadow-md border border-orange-100 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">
                メールアドレス <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                className="w-full mt-1 p-3 border border-orange-200 rounded-2xl focus:ring-2 focus:ring-amber-400 focus:outline-none text-base text-gray-800 bg-orange-50/20 shadow-inner"
              />
              <div className="mt-2 text-xs text-gray-600 leading-relaxed bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="font-bold text-gray-700 mb-1">📋 ご入力にあたって</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>メールアドレスは、回答結果の保存とマイダッシュボードのご案内のためにのみ使用します。</li>
                  <li>ご回答内容を研究目的で活用させていただく場合は、集計・匿名化した形で扱い、個人が特定されない形で使用します。</li>
                  <li>回答は任意です。ご不明な点はイベント運営者までお問い合わせください。</li>
                </ul>
              </div>
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
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2 text-center">今の気分は？</label>
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
                    onClick={() => setMood(item.val)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 ${
                      mood === item.val
                        ? 'bg-orange-100 border-2 border-orange-400 shadow-md transform scale-110'
                        : 'bg-white border-2 border-orange-50 hover:border-orange-200 hover:bg-orange-50 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 shadow-sm'
                    }`}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {fetchingExisting && (
            <div className="text-center py-2 text-xs font-bold text-orange-500 animate-pulse">
              前回の回答データを検索・読み込み中...
            </div>
          )}

          {domainQuestions?.map((group) => {
            const style = domainStyles[group.domainKey] || { bg: 'bg-white', border: 'border-orange-100', title: 'text-amber-900' };
            return (
              <div key={group.domainKey} className={`p-4 md:p-6 rounded-3xl shadow-sm border transition-all ${style.bg} ${style.border}`}>
                <h2 className={`text-lg md:text-xl font-bold border-b border-black/5 pb-3 mb-3 flex items-center gap-2 ${style.title}`}>
                  <span>{group.domainJa}</span>
                </h2>
                {(group.descriptionJa || group.descriptionEn) && (
                  <div className="mb-5">
                    {group.descriptionJa && (
                      <p className="text-base text-gray-700 leading-relaxed font-medium">{group.descriptionJa}</p>
                    )}
                    {group.descriptionEn && (
                      <p className="text-sm text-gray-600 leading-relaxed mt-1">{group.descriptionEn}</p>
                    )}
                  </div>
                )}
                <div className="space-y-7 md:space-y-8">
                  {group.items.map((item) => {
                    const qNum = item.index + 1;
                    return (
                      <div key={item.index} className="space-y-3">
                        <p className="font-bold text-gray-900 text-base md:text-lg leading-snug">Q{qNum}. {item.textJa}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 sm:gap-2 pt-1">
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
                                className={`flex flex-row sm:flex-col items-center sm:justify-start gap-3 sm:gap-0 px-4 py-3.5 sm:p-2.5 rounded-2xl border transition-all text-left sm:text-center min-h-[48px] active:scale-95 ${isSelected ? selectedBtnClass : 'bg-white/80 text-gray-800 border-gray-200/80 hover:bg-white'}`}
                              >
                                <span className="text-lg md:text-xl font-black leading-none sm:mb-1.5 flex-shrink-0 w-7 text-center">{opt.val}</span>
                                <span className={`text-sm font-bold leading-snug block w-full break-words ${isSelected ? 'text-white' : 'text-gray-800'}`}>{opt.ja}</span>
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
            {loading
              ? '送信中...'
              : extraQuestions.length > 0
              ? '次へ（追加の質問があります） →'
              : hasExistingData
              ? '修正内容を上書き保存する 🌿'
              : isPrivate
              ? '記録を保存する 🌿'
              : isPost
              ? '事後アンケートを送信する ✨'
              : '事前アンケートを送信する 📋'}
          </button>
        </form>
        )}

        {step === 2 && (
          <form onSubmit={handleExtraSubmit} className="space-y-4 md:space-y-6">
            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-md border border-emerald-100 space-y-2">
              <h2 className="text-lg font-bold text-emerald-800">追加の質問 📝</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                今後の運営の参考とするための質問です。前ページの2HFSの回答と結びつけて使用することはありません。
              </p>
            </div>

            {extraQuestions.map((q) => (
              <div key={q.id} className="bg-white p-5 rounded-3xl shadow-sm border border-emerald-50 space-y-3">
                <p className="font-bold text-gray-900 text-base leading-snug">
                  {q.textJa} {q.required !== false && <span className="text-rose-500">*</span>}
                </p>

                {q.type === 'likert' && (
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 sm:gap-2 pt-1">
                    {EXTRA_LIKERT_SCALE.map((opt) => {
                      const isSelected = extraAnswers[q.id] === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => handleExtraAnswerChange(q.id, opt.val)}
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
                      const isSelected = extraAnswers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleExtraAnswerChange(q.id, opt)}
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
                    value={(extraAnswers[q.id] as string) || ''}
                    onChange={(e) => handleExtraAnswerChange(q.id, e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:outline-none text-base text-gray-800 bg-emerald-50/20 shadow-inner"
                  />
                )}

                {q.type === 'name' && (
                  <input
                    type="text"
                    value={(extraAnswers[q.id] as string) || ''}
                    onChange={(e) => handleExtraAnswerChange(q.id, e.target.value)}
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-4 px-5 rounded-2xl font-bold text-gray-500 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-all"
              >
                ← 戻る
              </button>
              <button
                type="submit" disabled={loading}
                className={`flex-1 py-4 rounded-2xl font-bold text-white text-base md:text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] ${submitBtnBg} ${loading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
              >
                {loading ? '送信中...' : hasExistingData ? '修正内容を上書き保存する 🌿' : '事後アンケートを送信する ✨'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}