'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  type ExtraQuestion,
  type ExtraQuestionType,
  DEFAULT_EXTRA_QUESTIONS,
  EXTRA_QUESTION_TYPE_LABEL,
  createBlankExtraQuestion,
} from '@/lib/extraQuestions';

export default function EditExtraQuestionsPage({ params }: { params: Promise<{ event_id: string }> }) {
  const { event_id } = use(params);
  const [eventTitle, setEventTitle] = useState('');
  const [questions, setQuestions] = useState<ExtraQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [responses, setResponses] = useState<{ id: string; display_name: string | null; answers: any; created_at: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('events')
        .select('title, extra_questions')
        .eq('id', event_id)
        .maybeSingle();

      if (data) {
        setEventTitle(data.title || '');
        setQuestions(Array.isArray(data.extra_questions) ? data.extra_questions : []);
      }

      const { data: responseData } = await supabase
        .from('extra_question_responses')
        .select('id, display_name, answers, created_at')
        .eq('event_id', event_id)
        .order('created_at', { ascending: false });
      setResponses(responseData || []);

      setLoading(false);
    };
    fetchData();
  }, [event_id]);

  const updateQuestion = (id: string, patch: Partial<ExtraQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    setSaved(false);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setSaved(false);
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  };

  const addQuestion = (type: ExtraQuestionType) => {
    setQuestions((prev) => [...prev, createBlankExtraQuestion(type)]);
    setSaved(false);
  };

  const loadDefaultSet = () => {
    if (questions.length > 0) {
      if (!confirm('現在の追加質問リストを、SUPwellデフォルトセットで上書きします。よろしいですか？')) return;
    }
    setQuestions(DEFAULT_EXTRA_QUESTIONS.map((q) => ({ ...q, options: q.options ? [...q.options] : undefined })));
    setSaved(false);
  };

  const clearAll = () => {
    if (!confirm('追加質問をすべて削除します（このイベントの事後アンケートはSection 2なしになります）。よろしいですか？')) return;
    setQuestions([]);
    setSaved(false);
  };

  const updateOption = (qId: string, optIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || !q.options) return q;
        const nextOptions = [...q.options];
        nextOptions[optIndex] = value;
        return { ...q, options: nextOptions };
      })
    );
    setSaved(false);
  };

  const addOption = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? { ...q, options: [...(q.options || []), `選択肢${(q.options?.length || 0) + 1}`] } : q
      )
    );
    setSaved(false);
  };

  const removeOption = (qId: string, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId && q.options ? { ...q, options: q.options.filter((_, i) => i !== optIndex) } : q
      )
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('events')
      .update({ extra_questions: questions })
      .eq('id', event_id)
      .select();
    setSaving(false);
    if (error) {
      alert('保存に失敗しました: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      alert('保存できませんでした（0件更新）。\n\nエラーは出ていませんが、実際には保存が行われていません。Supabase側の権限設定（RLS）で、eventsテーブルへの更新がブロックされている可能性があります。');
      return;
    }
    setSaved(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-300 font-bold animate-pulse text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-xs text-slate-300 hover:text-slate-200 underline">
            ← 管理者ダッシュボードに戻る
          </Link>
        </div>

        <div className="bg-slate-800/90 p-6 md:p-8 rounded-2xl border border-slate-700/60 shadow-lg">
          <span className="bg-slate-700 text-slate-300 text-[11px] font-semibold px-2.5 py-1 rounded-md inline-block mb-2">
            ADMIN SYSTEM
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
            {eventTitle || '(イベント名なし)'} の追加質問を編集
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            事後アンケート（/post）の2HFS 18問のあとに表示される、イベント独自の質問セクションです。<br />
            未設定（0件）の場合、このイベントの事後アンケートには追加質問セクションは表示されません。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadDefaultSet}
            className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-xl transition-colors"
          >
            📋 SUPwellデフォルトセットを読み込む
          </button>
          <button
            onClick={() => addQuestion('likert')}
            className="text-xs font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl transition-colors"
          >
            ＋ 5段階評価
          </button>
          <button
            onClick={() => addQuestion('text')}
            className="text-xs font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl transition-colors"
          >
            ＋ 自由記述
          </button>
          <button
            onClick={() => addQuestion('choice')}
            className="text-xs font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl transition-colors"
          >
            ＋ 単一選択
          </button>
          <button
            onClick={() => addQuestion('name')}
            className="text-xs font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl transition-colors"
          >
            ＋ 一行テキスト
          </button>
          {questions.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/50 px-3 py-2 rounded-xl transition-colors ml-auto"
            >
              全て削除
            </button>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="bg-slate-800/90 p-8 rounded-2xl border border-slate-700/60 text-center text-slate-400 text-sm">
            追加質問はまだ設定されていません。上のボタンから追加するか、デフォルトセットを読み込んでください。
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700/60 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      onClick={() => moveQuestion(index, -1)}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-slate-200 disabled:opacity-20 text-xs"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveQuestion(index, 1)}
                      disabled={index === questions.length - 1}
                      className="text-slate-400 hover:text-slate-200 disabled:opacity-20 text-xs"
                    >
                      ▼
                    </button>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-md">
                        {EXTRA_QUESTION_TYPE_LABEL[q.type]}
                      </span>
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-400 ml-auto">
                        <input
                          type="checkbox"
                          checked={q.required ?? true}
                          onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                        />
                        必須
                      </label>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300"
                      >
                        削除
                      </button>
                    </div>

                    <textarea
                      value={q.textJa}
                      onChange={(e) => updateQuestion(q.id, { textJa: e.target.value })}
                      placeholder="質問文を入力"
                      rows={q.type === 'text' ? 2 : 1}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />

                    {q.type === 'likert' && (
                      <p className="text-[11px] text-slate-500">
                        回答選択肢: まったく思わない / あまり思わない / ふつう / 少しそう思う / 大変そう思う（固定）
                      </p>
                    )}

                    {q.type === 'choice' && (
                      <div className="space-y-2">
                        {(q.options || []).map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => removeOption(q.id, optIndex)}
                              disabled={(q.options?.length || 0) <= 2}
                              className="text-rose-400 hover:text-rose-300 disabled:opacity-20 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(q.id)}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                        >
                          ＋ 選択肢を追加
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? '保存中...' : saved ? '✓ 保存しました' : '保存する'}
          </button>
        </div>

        <div className="bg-slate-800/90 p-6 rounded-2xl border border-slate-700/60 shadow-md">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
            回答状況（追加質問のみURL経由の回答, {responses.length}件）
          </h2>
          {responses.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">まだ回答がありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300 font-medium">
                    <th className="p-3">氏名 / 表示名</th>
                    <th className="p-3">回答日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {responses.map((r) => (
                    <tr key={r.id}>
                      <td className="p-3 text-slate-200 font-medium">{r.display_name || '(未記入)'}</td>
                      <td className="p-3 text-slate-400">
                        {new Date(r.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
