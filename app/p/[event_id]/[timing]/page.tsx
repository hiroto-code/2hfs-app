'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { domainQuestions, scaleOptions } from '@/lib/questions';

export default function SurveyPage({ params }: { params: Promise<{ event_id: string; timing: string }> }) {
  const resolvedParams = use(params);
  const { event_id, timing } = resolvedParams;
  
  const router = useRouter();

  // ユーザー情報のステート（IDから、メールと表示名に分離）
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isPost = timing === 'post';

  // 💡 初回読み込み時：過去に入力した情報をブラウザから復元
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
      // 💡 データの正規化（揺れ防止）
      // メールアドレスは空白を消し、すべて小文字に統一
      const formattedEmail = email.trim().toLowerCase();
      // 表示名が空欄の場合は「ゲスト」にする
      const formattedName = displayName.trim() || 'ゲスト';

      // 入力情報をブラウザに保存（次回以降の自動入力用）
      localStorage.setItem('supwell_user_email', formattedEmail);
      localStorage.setItem('supwell_user_name', formattedName);

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

      // DB保存用ペイロード
      const payload = {
        event_id,
        participant_id: formattedEmail, // ★ データ紐付け用の主キーとしてメールアドレスを保存
        display_name: formattedName,    // ★ 新規追加した表示名カラム
        timing_type: timing,
        display_language: 'bilingual',
        answers,
        q1: answers[0],
        q2: answers[1],
        q3: answers[2],
        q4: answers[3],
        q5: answers[4],
        q6: answers[5],
        q7: answers[6],
        q8: answers[7],
        q9: answers[8],
        q10: answers[9],
        q11: answers[10],
        q12: answers[11],
        q13: answers[12],
        q14: answers[13],
        q15: answers[14],
        q16: answers[15],
        q17: answers[16],
        q18: answers[17],
        domain_kaishoku,
        domain_kaimin,
        domain_kaido,
        domain_kaisho,
        domain_kairaku,
        domain_kaisei,
        total_sum,
        total_mean,
        submission_token
      };

      // 事前・事後の上書き用（メールアドレスを基準に過去データを削除）
      await supabase
        .from('surveys')
        .delete()
        .match({ 
          event_id: event_id, 
          participant_id: formattedEmail, // メールアドレスで特定
          timing_type: timing 
        });

      // 新しい回答データを保存
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-3 md:p-6 font-sans">
      <div className="max-w-2xl mx-auto">
        
        {/* 🔄 事前 / 事後 切り替えタブナビゲーション */}
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
            <span className={`text-[10px] font-normal ${!isPost ? 'text-amber-100' : 'text-gray-400'}`}>
              (Pre-event)
            </span>
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
            <span className={`text-[10px] font-normal ${isPost ? 'text-emerald-100' : 'text-gray-400'}`}>
              (Post-event)
            </span>
          </Link>
        </div>

        {/* ヘッダー */}
        <div className={`p-5 md:p-6 rounded-3xl shadow-md border mb-5 text-center bg-white/90 backdrop-blur-md ${isPost ? 'border-emerald-200' : 'border-orange-200'}`}>
          <h1 className={`text-xl md:text-2xl font-black ${isPost ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isPost ? '事後アンケート ✨' : '事前アンケート 📋'}
            <span className="block text-xs md:text-sm font-medium mt-1 text-gray-500">
              {isPost ? 'Post-event Survey' : 'Pre-event Survey'}
            </span>
          </h1>
          <p className="text-xs md:text-sm text-gray-600 mt-2 font-medium">
            直近のあなたの状態について、最もあてはまるものを直感でお選びください。
            <span className="block text-[11px] md:text-xs text-gray-400 mt-0.5 font-normal">
              Please intuitively select the option that best describes your recent state.
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          
          {/* ✨ ユーザー情報入力エリア（メール＆表示名） */}
          <div className="bg-white p-5 rounded-3xl shadow-md border border-orange-100 space-y-4">
            
            {/* メールアドレス（必須） */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">
                メールアドレス <span className="text-rose-500">*</span>
                <span className="block text-xs font-normal text-gray-500">Email address (Used for saving your history)</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="例: example@juntendo.ac.jp"
                className="w-full mt-1 p-3 border border-orange-200 rounded-2xl focus:ring-2 focus:ring-amber-400 focus:outline-none text-base text-gray-800 bg-orange-50/20 shadow-inner"
              />
            </div>

            {/* 表示名・ニックネーム（任意） */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">
                表示名・ニックネーム
                <span className="block text-xs font-normal text-gray-500">Display Name / Nickname (Optional)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例: ゆめ"
                className="w-full mt-1 p-3 border border-orange-200 rounded-2xl focus:ring-2 focus:ring-amber-400 focus:outline-none text-base text-gray-800 bg-orange-50/20 shadow-inner"
              />
            </div>

            <div className="mt-2 p-3 bg-amber-50/80 rounded-2xl border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
              <p className="font-bold">※データの集計・マイダッシュボードの表示にはメールアドレスを使用します。</p>
              <p className="opacity-80 mt-0.5">※入力した情報はブラウザに記憶され、次回から自動入力されます。</p>
            </div>
          </div>

          {/* 凡例 */}
          <div className="bg-white/80 p-3 rounded-2xl border border-orange-100 text-[10px] md:text-xs text-gray-600 flex flex-wrap gap-2.5 justify-center shadow-sm">
            {scaleOptions.map(opt => (
              <span key={opt.val} className="whitespace-nowrap bg-orange-50/50 px-2.5 py-1 rounded-xl border border-orange-100/60">
                <strong className="text-amber-700">{opt.val}</strong>: {opt.ja}
              </span>
            ))}
          </div>

          {/* 質問リスト */}
          {domainQuestions?.map((group) => (
            <div key={group.domainKey} className="bg-white p-4 md:p-6 rounded-3xl shadow-md border border-orange-100">
              <h2 className="text-base md:text-lg font-bold text-amber-900 border-b border-orange-100 pb-2.5 mb-4 flex items-center gap-2">
                <span>{group.domainJa}</span>
                <span className="text-xs font-normal text-gray-400">/ {group.domainEn}</span>
              </h2>

              <div className="space-y-5 md:space-y-6">
                {group.items.map((item) => {
                  const qNum = item.index + 1;
                  return (
                    <div key={item.index} className="space-y-2">
                      <p className="font-bold text-gray-800 text-sm leading-snug">
                        Q{qNum}. {item.textJa}
                        <span className="block text-[11px] font-normal text-gray-500 mt-0.5 leading-tight">{item.textEn}</span>
                      </p>

                      {/* 1〜5の選択肢ボタン */}
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {scaleOptions.map((opt) => {
                          const isSelected = answers[item.index] === opt.val;
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => handleScoreChange(item.index, opt.val)}
                              className={`flex flex-col items-center justify-start p-2 rounded-2xl border transition-all text-center h-full active:scale-95 ${
                                isSelected
                                  ? isPost
                                    ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-md transform scale-[1.02]'
                                    : 'bg-gradient-to-b from-amber-500 to-orange-500 text-white border-orange-500 shadow-md transform scale-[1.02]'
                                  : 'bg-orange-50/30 text-gray-700 border-orange-100 hover:bg-orange-100/50'
                              }`}
                            >
                              <span className="text-base md:text-lg font-black leading-none mb-1.5">{opt.val}</span>
                              <span className={`text-[9px] md:text-[10px] font-bold leading-tight block w-full break-words ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                                {opt.ja}
                              </span>
                              <span className={`text-[8px] md:text-[9px] leading-tight block w-full mt-0.5 opacity-80 break-words ${isSelected ? 'text-amber-100' : 'text-gray-400'}`}>
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

          {errorMsg && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl border border-rose-200 text-sm font-bold text-center shadow-sm">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-white text-base md:text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] ${
              isPost 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700' 
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
            } ${loading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
          >
            {loading ? '送信中... / Submitting...' : isPost ? '事後アンケートを送信する ✨' : '事前アンケートを送信する 📋'}
          </button>

        </form>
      </div>
    </div>
  );
}