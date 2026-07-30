'use client';

import { useState, use } from 'react';
import { supabase } from '@/lib/supabase';

interface PageProps {
  params: Promise<{
    event_id: string;
    timing: string;
  }>;
}

// 2HFS / SFHS 評価質問項目
const QUESTIONS = [
  { id: 'q1', text: '1. 全般的に見て、あなたの健康状態はいかがですか？' },
  { id: 'q2', text: '2. 普段の活動（家事、仕事、運動など）に支障を感じることがありますか？' },
  { id: 'q3', text: '3. 最近、身体的な問題のためにやりたいことができないことがありましたか？' },
  { id: 'q4', text: '4. 最近、気分や感情の問題（不安や落ち込みなど）のために支障がありましたか？' },
  { id: 'q5', text: '5. 痛みによって、日常の生活や仕事が妨げられることがありましたか？' },
];

// 選択肢（1: 全くない 〜 5: 非常にある / 非常に良い）
const OPTIONS = [
  { label: '1 (該当しない / 非常に良い)', value: 1 },
  { label: '2 (少しある / 良い)', value: 2 },
  { label: '3 (普通)', value: 3 },
  { label: '4 (かなりある / 悪い)', value: 4 },
  { label: '5 (非常にある / 非常に悪い)', value: 5 },
];

export default function SurveyFormPage({ params }: PageProps) {
  const { event_id, timing } = use(params);
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // 各質問の回答を保持（初期値は未選択）
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  // 自由記述用の入力値
  const [comments, setComments] = useState('');

  const isPre = timing === 'pre';
  const pageTitle = isPre ? '事前アンケート（SHFS評価）' : '事後アンケート（SHFS評価）';

  // ラジオボタン変更時の処理
  const handleOptionChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 未回答のチェック
    for (const q of QUESTIONS) {
      if (!answers[q.id]) {
        alert(`${q.text} の回答を選択してください。`);
        return;
      }
    }

    setLoading(true);

    try {
      // データベースに q1, q2, q3... の値を正しく送信
      const { error } = await supabase
        .from('surveys')
        .insert([
          {
            event_id: event_id,
            timing_type: timing,
            q1: answers['q1'],
            q2: answers['q2'],
            q3: answers['q3'],
            q4: answers['q4'],
            q5: answers['q5'],
            content: comments, // 自由記述欄の文字
          }
        ]);

      if (error) throw error;
      
      setSubmitted(true);
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 送信完了画面
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">✓</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">回答ありがとうございました</h2>
          <p className="text-slate-600 text-sm">アンケートの送信が正常に完了いたしました。</p>
        </div>
      </div>
    );
  }

  // アンケートフォーム画面
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-sm border border-slate-200">
        
        <header className="border-b border-slate-100 pb-6 mb-6">
          <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full tracking-wider">
            {isPre ? '事前調査' : '事後調査'}
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-3">{pageTitle}</h1>
          <p className="text-slate-500 text-xs mt-1">
            イベントID: <span className="font-mono">{event_id}</span>
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 評価質問グループ */}
          {QUESTIONS.map((q) => (
            <div key={q.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <label className="block text-sm font-bold text-slate-800 mb-3">
                {q.text} <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${
                      answers[q.id] === opt.value
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.value}
                      checked={answers[q.id] === opt.value}
                      onChange={() => handleOptionChange(q.id, opt.value)}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 mr-3"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* 自由記述欄 */}
          <div className="pt-2">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              その他、ご意見・ご感想（自由記述）
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
              placeholder="気になる点や補足事項があればご記入ください（任意）"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition shadow-md disabled:opacity-50 text-base"
          >
            {loading ? '送信処理中...' : '回答を送信する'}
          </button>
        </form>

      </div>
    </div>
  );
}