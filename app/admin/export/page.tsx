'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminExportPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 💡 フィルター用ステート
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedTiming, setSelectedTiming] = useState<string>('all');
  const [excludePrivate, setExcludePrivate] = useState<boolean>(true); // 初期設定でプライベート記録を除外

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (err) {
      console.error('Data fetch error:', err);
      alert('データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // 💡 イベントIDのユニークリスト作成（ドロップダウン用）
  const uniqueEventIds = useMemo(() => {
    const ids = surveys
      .map((s) => s.event_id)
      .filter((id): id is string => Boolean(id) && id !== 'private');
    return Array.from(new Set(ids));
  }, [surveys]);

  // 💡 条件に合うデータだけに絞り込み（画面表示・CSV出力の両方に適用）
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      const isPrivateData = s.timing_type === 'private' || s.event_id === 'private';

      // 1. プライベート記録の除外チェック
      if (excludePrivate && isPrivateData) {
        return false;
      }

      // 2. イベント選択の絞り込み
      if (selectedEvent !== 'all' && s.event_id !== selectedEvent) {
        return false;
      }

      // 3. タイミング（事前/事後/プライベート）の絞り込み
      if (selectedTiming !== 'all' && s.timing_type !== selectedTiming) {
        return false;
      }

      return true;
    });
  }, [surveys, selectedEvent, selectedTiming, excludePrivate]);

  // 💡 CSVダウンロード処理（絞り込まれた filteredSurveys のみを出力）
  const handleDownloadCSV = () => {
    if (filteredSurveys.length === 0) {
      alert('該当する出力データがありません。フィルター条件を変更してください。');
      return;
    }

    const headers = [
      '回答日時',
      'イベントID',
      'タイミング',
      'メールアドレス',
      '表示名',
      '総合平均点',
      '総合合計点',
      '快食',
      '快眠',
      '快動',
      '快調',
      '快楽',
      '快生',
      ...Array.from({ length: 18 }, (_, i) => `Q${i + 1}`)
    ];

    const rows = filteredSurveys.map((s) => {
      const createdAt = s.created_at ? new Date(s.created_at).toLocaleString('ja-JP') : '';
      const timingMap: Record<string, string> = { pre: '事前', post: '事後', private: 'プライベート' };
      const timingLabel = timingMap[s.timing_type] || s.timing_type || '';

      const qAnswers = Array.from({ length: 18 }, (_, i) => {
        if (s.answers && s.answers[i] !== undefined) return s.answers[i];
        if (s[`q${i + 1}`] !== undefined) return s[`q${i + 1}`];
        return '';
      });

      return [
        `"${createdAt}"`,
        `"${s.event_id || ''}"`,
        `"${timingLabel}"`,
        `"${s.participant_id || ''}"`,
        `"${s.display_name || ''}"`,
        s.total_mean ? Number(s.total_mean).toFixed(2) : '',
        s.total_sum ?? '',
        s.domain_kaishoku ? Number(s.domain_kaishoku).toFixed(2) : '',
        s.domain_kaimin ? Number(s.domain_kaimin).toFixed(2) : '',
        s.domain_kaido ? Number(s.domain_kaido).toFixed(2) : '',
        s.domain_kaisho ? Number(s.domain_kaisho).toFixed(2) : '',
        s.domain_kairaku ? Number(s.domain_kairaku).toFixed(2) : '',
        s.domain_kaisei ? Number(s.domain_kaisei).toFixed(2) : '',
        ...qAnswers
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wellbeing_data_${selectedEvent}_${selectedTiming}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-amber-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* ヘッダーエリア */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-md mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full inline-block mb-2">
              管理者用管理画面 📊
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
              回答データ抽出・CSV出力
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              フィルターで対象イベントや回答タイミングを指定してCSVファイルを抽出できます。
            </p>
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={loading || filteredSurveys.length === 0}
            className="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>📥</span> 選択したデータ（{filteredSurveys.length}件）を出力
          </button>
        </div>

        {/* 💡 データフィルターパネル */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-200 shadow-md mb-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 border-b pb-2">
            <span>🔍</span> データの絞り込み条件
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. イベント選択 */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">イベント指定</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">🌐 すべてのイベント</option>
                {uniqueEventIds.map((id) => (
                  <option key={id} value={id}>
                    📅 {id}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. タイミング選択 */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">回答タイミング</label>
              <select
                value={selectedTiming}
                onChange={(e) => setSelectedTiming(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">📋 事前・事後・プライベートすべて</option>
                <option value="pre">🟧 事前アンケート (Pre)</option>
                <option value="post">🟩 事後アンケート (Post)</option>
                <option value="private">🟪 プライベート記録 (Private)</option>
              </select>
            </div>

            {/* 3. プライベートデータ除外オプション */}
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={excludePrivate}
                  onChange={(e) => setExcludePrivate(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                />
                <span>🔒 個人のプライベート記録を除外する</span>
              </label>
            </div>
          </div>
        </div>

        {/* プレビューテーブル */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-gray-800">
              抽出結果一覧 （該当 {filteredSurveys.length} 件 / 全 {surveys.length} 件）
            </h2>
            <button
              onClick={fetchSurveys}
              className="text-xs text-amber-600 hover:text-amber-700 font-bold underline"
            >
              🔄 最新情報に更新
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 font-medium">データを読み込み中...</div>
          ) : filteredSurveys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-gray-700 font-bold border-b border-gray-200">
                    <th className="p-3">日時</th>
                    <th className="p-3">種別</th>
                    <th className="p-3">表示名 / メール</th>
                    <th className="p-3">イベントID</th>
                    <th className="p-3 text-right">総合平均</th>
                    <th className="p-3 text-center">結果</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSurveys.map((s) => {
                    const isPost = s.timing_type === 'post';
                    const isPrivate = s.timing_type === 'private';
                    const badgeBg = isPrivate ? 'bg-purple-100 text-purple-700' : isPost ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700';
                    const timingLabel = isPrivate ? 'プライベート' : isPost ? '事後' : '事前';

                    return (
                      <tr key={s.id || s.submission_token} className="hover:bg-slate-50">
                        <td className="p-3 text-gray-500 whitespace-nowrap">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString('ja-JP') : '-'}
                        </td>
                        <td className="p-3 font-bold whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] ${badgeBg}`}>
                            {timingLabel}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-800">
                          <div>{s.display_name || 'ゲスト'}</div>
                          <div className="text-[10px] text-gray-400">{s.participant_id}</div>
                        </td>
                        <td className="p-3 text-gray-500">{s.event_id || '-'}</td>
                        <td className="p-3 text-right font-bold text-gray-800">
                          {s.total_mean ? Number(s.total_mean).toFixed(2) : '-'} 点
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            href={`/result/${s.submission_token}`}
                            target="_blank"
                            className="text-amber-600 hover:underline font-bold text-[11px]"
                          >
                            表示 ↗
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              該当する条件の回答データがありません。フィルターを変更してください。
            </div>
          )}
        </div>

      </div>
    </div>
  );
}