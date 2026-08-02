'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// 💡 6つの快（質問項目）の背景色＆枠線カラーセット
const itemColors = [
  "bg-rose-50/70 border-rose-200",       // 1. 爽やか（ピンク系）
  "bg-blue-50/70 border-blue-200",       // 2. 楽しい（ブルー系）
  "bg-emerald-50/70 border-emerald-200", // 3. 心地よい（グリーン系）
  "bg-amber-50/70 border-amber-200",     // 4. 誇らしい（オレンジ・イエロー系）
  "bg-purple-50/70 border-purple-200",   // 5. 安らぐ（パープル系）
  "bg-cyan-50/70 border-cyan-200"        // 6. 充足感（シアン・水色系）
];

// 6つの快の定義
const questions = [
  { id: 'q1', title: '爽やかさ', desc: '気分がすっきりして、清々しさを感じましたか？' },
  { id: 'q2', title: '楽しさ', desc: '心からワクワクし、楽しさを感じましたか？' },
  { id: 'q3', title: '心地よさ', desc: '五感で心地よさや気持ちよさを感じましたか？' },
  { id: 'q4', title: '誇らしさ・達成感', desc: '自分を誇らしく思ったり、やり遂げた感覚がありましたか？' },
  { id: 'q5', title: '安らぎ・安心感', desc: '心が穏やかになり、ホッとする安心感がありましたか？' },
  { id: 'q6', title: '充足感・満たされ感', desc: '満ち足りた気持ちや、感謝の気持ちが湧きましたか？' },
];

export default function SurveyPage({ params }: { params: Promise<{ event_id: string; timing: string }> }) {
  const { event_id: eventId, timing } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // フォーム状態
  const [participantId, setParticipantId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (error) throw error;
        setEvent(data);
      } catch (err) {
        console.error('Event fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleScoreChange = (qId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!participantId.trim()) {
      alert('メールアドレスまたはニックネームを入力してください。');
      return;
    }

    if (Object.keys(answers).length < questions.length) {
      alert('すべての質問にお答えください。');
      return;
    }

    try {
      setSubmitting(true);

      const scores = Object.values(answers);
      const totalSum = scores.reduce((acc, cur) => acc + cur, 0);
      const totalMean = totalSum / scores.length;
      const submissionToken = crypto.randomUUID();

      // 1. user_profiles に登録 / 更新
      const isEmail = participantId.includes('@');
      const emailVal = isEmail ? participantId : null;

      await supabase.from('user_profiles').upsert(
        {
          participant_id: participantId,
          email: emailVal,
          display_name: displayName || participantId.split('@')[0],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'participant_id' }
      );

      // 2. surveys に回答保存
      const { error: surveyErr } = await supabase.from('surveys').insert({
        event_id: eventId,
        participant_id: participantId,
        timing_type: timing,
        scores: answers,
        total_sum: totalSum,
        total_mean: totalMean,
        submission_token: submissionToken,
      });

      if (surveyErr) throw surveyErr;

      // 結果画面へ遷移
      router.push(`/result/${submissionToken}`);
    } catch (err) {
      console.error('Submit error:', err);
      alert('送信に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-orange-500 font-bold animate-pulse">読み込み中... 🌿</div>
      </div>
    );
  }

  const timingText = timing === 'post' ? '事後' : '事前';
  const isPrivate = event?.title?.includes('【プライベート】');
  const displayTitle = event?.title ? event.title.replace('【プライベート】', '') : 'イベント';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-orange-100 shadow-xl">
        
        {/* ヘッダー情報 */}
        <div className="border-b border-orange-100 pb-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isPrivate ? 'bg-purple-100 text-purple-700' : (timing === 'post' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700')
            }`}>
              {isPrivate ? 'プライベート' : `${timingText}アンケート`}
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-800">{displayTitle}</h1>
          <p className="text-xs text-gray-500 mt-1">現在のあなたの状態について教えてください。</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* プロフィール入力欄 */}
          <div className="bg-orange-50/40 p-5 rounded-2xl border border-orange-100/80 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                メールアドレス または ニックネーム <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                placeholder="例: yamada@example.com または ヤマダ"
                className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                表示用のお名前（任意）
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ダッシュボードで表示する名前（空欄可）"
                className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
            </div>
          </div>

          {/* 💡 以前ここにあった「1:全くあてはまらない～5:非常にあてはまる」の不要な注意書きを削除しました！ */}

          {/* 6つの快 質問項目リスト */}
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const colorStyle = itemColors[idx % itemColors.length]; // 💡 質問ごとに色を変更

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border shadow-sm transition-all ${colorStyle}`}
                >
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-white/80 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200">
                        Q{idx + 1}
                      </span>
                      <h3 className="font-bold text-gray-800 text-base">{q.title}</h3>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 font-medium">{q.desc}</p>
                  </div>

                  {/* 1〜5 スケール選択肢 */}
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isSelected = answers[q.id] === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleScoreChange(q.id, num)}
                          className={`py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? 'bg-orange-500 text-white shadow-md scale-105'
                              : 'bg-white text-gray-600 hover:bg-orange-100/50 border border-gray-200/80'
                          }`}
                        >
                          <span className="text-base">{num}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-8"
          >
            {submitting ? '送信中...' : '回答を送信する ✨'}
          </button>
        </form>
      </div>
    </div>
  );
}