'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminExportPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // フィルター用ステート
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [selectedTiming, setSelectedTiming] = useState<string>('all');
  const [excludePrivate, setExcludePrivate] = useState<boolean>(true);

  // 行ごとの選択状態（キーは id または submission_token）
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // ユニークなイベントIDリスト
  const uniqueEventIds = useMemo(() => {
    const ids = surveys
      .map((s) => s.event_id)
      .filter((id): id is string => Boolean(id) && id !== 'private');
    return Array.from(new Set(ids));
  }, [surveys]);

  // フィルタリング処理
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      const isPrivateData = s.timing_type === 'private' || s.event_id === 'private';

      if (excludePrivate && isPrivateData) {
        return false;
      }
      if (selectedEvent !== 'all' && s.event_id !== selectedEvent) {
        return false;
      }
      if (selectedTiming !== 'all' && s.timing_type !== selectedTiming) {
        return false;
      }

      return true;
    });
  }, [surveys, selectedEvent, selectedTiming, excludePrivate]);

  // フィルター条件が変わったら、選択状態を「フィルター結果を全選択」にリセット
  useEffect(() => {
    setSelectedIds(new Set(filteredSurveys.map((s) => s.id || s.submission_token)));
  }, [filteredSurveys]);

  const rowKey = (s: any) => s.id || s.submission_token;

  const toggleRow = (key: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isAllSelected = filteredSurveys.length > 0 && selectedIds.size === filteredSurveys.length;

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSurveys.map(rowKey)));
    }
  };

  // 選択された行のみを出力対象にする
  const selectedSurveys = useMemo(
    () => filteredSurveys.filter((s) => selectedIds.has(rowKey(s))),
    [filteredSurveys, selectedIds]
  );

  // 選択した記録を1つのイベントに束ね、集団平均を出せるようにする（遡及的グループ化）
  const [grouping, setGrouping] = useState(false);

  const handleGroupSelected = async () => {
    if (selectedSurveys.length < 2) return;

    const groupTitle = window.prompt(
      'グループ名（イベント名）を入力してください。\n選択した記録を1つのイベントとしてまとめ、集団平均をマイダッシュボード・結果画面に反映します。',
      ''
    );
    if (!groupTitle || !groupTitle.trim()) return;

    if (!confirm(`選択した${selectedSurveys.length}件を「${groupTitle}」としてグループ化します。よろしいですか？`)) {
      return;
    }

    setGrouping(true);
    try {
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert([{ title: groupTitle.trim(), event_date: new Date().toISOString().split('T')[0] }])
        .select()
        .single();

      if (eventError) throw eventError;

      const ids = selectedSurveys.map((s) => s.id).filter(Boolean);
      const { error: updateError } = await supabase
        .from('surveys')
        .update({ event_id: newEvent.id })
        .in('id', ids);

      if (updateError) throw updateError;

      alert(`グループ化が完了しました（イベントID: ${newEvent.id}）。`);
      await fetchSurveys();
    } catch (err: any) {
      console.error('Group error:', err);
      alert('グループ化に失敗しました: ' + (err.message || '通信エラー'));
    } finally {
      setGrouping(false);
    }
  };

  // CSVダウンロード処理
  const handleDownloadCSV = () => {
    if (selectedSurveys.length === 0) {
      alert('出力するデータを選択してください。');
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

    const rows = selectedSurveys.map((s) => {
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
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ヘッダー */}
        <div className="bg-slate-800/90 p-6 md:p-8 rounded-2xl border border-slate-700/60 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-slate-700 text-slate-300 text-[11px] font-semibold px-2.5 py-1 rounded-md inline-block mb-2">
              ADMIN SYSTEM
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
              回答データ抽出・CSV出力
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              条件を指定して蓄積データをCSV形式で一括出力します。
            </p>
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={loading || selectedSurveys.length === 0}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>📥</span> CSVダウンロード（{selectedSurveys.length}件選択中）
          </button>
        </div>

        {/* フィルターパネル */}
        <div className="bg-slate-800/90 p-5 md:p-6 rounded-2xl border border-slate-700/60 shadow-md space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 pb-2">
            フィルター条件設定
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* イベント選択 */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">イベントID</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">すべてのイベント</option>
                {uniqueEventIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            {/* タイミング選択 */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">回答タイミング</label>
              <select
                value={selectedTiming}
                onChange={(e) => setSelectedTiming(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">すべて（事前・事後・プライベート）</option>
                <option value="pre">事前アンケート (pre)</option>
                <option value="post">事後アンケート (post)</option>
                <option value="private">プライベート記録 (private)</option>
              </select>
            </div>

            {/* プライベート除外チェック */}
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={excludePrivate}
                  onChange={(e) => setExcludePrivate(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>個人プライベート記録を除外する</span>
              </label>
            </div>
          </div>
        </div>

        {/* データ一覧テーブル */}
        <div className="bg-slate-800/90 p-6 rounded-2xl border border-slate-700/60 shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              抽出結果（{filteredSurveys.length} / 全 {surveys.length} 件、選択中 {selectedSurveys.length} 件）
            </h2>
            <div className="flex items-center gap-3">
              {selectedSurveys.length >= 2 && (
                <button
                  onClick={handleGroupSelected}
                  disabled={grouping}
                  className="text-xs font-bold text-purple-300 hover:text-purple-100 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                  title="選択した記録を1つのイベントにまとめ、集団平均を出せるようにします"
                >
                  {grouping ? '処理中...' : `👥 選択中の${selectedSurveys.length}件をグループ化`}
                </button>
              )}
              <button
                onClick={fetchSurveys}
                className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
              >
                🔄 リロード
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">データを読み込み中...</div>
          ) : filteredSurveys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 font-medium">
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                      />
                    </th>
                    <th className="p-3">日時</th>
                    <th className="p-3">種別</th>
                    <th className="p-3">表示名 / ID</th>
                    <th className="p-3">イベントID</th>
                    <th className="p-3 text-right">総合平均</th>
                    <th className="p-3 text-center">詳細</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredSurveys.map((s) => {
                    const isPost = s.timing_type === 'post';
                    const isPrivate = s.timing_type === 'private';
                    const badgeBg = isPrivate ? 'bg-purple-950/60 text-purple-300 border-purple-800/50' : isPost ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50' : 'bg-amber-950/60 text-amber-300 border-amber-800/50';
                    const timingLabel = isPrivate ? 'プライベート' : isPost ? '事後' : '事前';
                    const key = rowKey(s);

                    return (
                      <tr key={key} className="hover:bg-slate-700/30 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(key)}
                            onChange={() => toggleRow(key)}
                            className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                          />
                        </td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString('ja-JP') : '-'}
                        </td>
                        <td className="p-3 font-medium whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${badgeBg}`}>
                            {timingLabel}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-200 font-medium">{s.display_name || 'ゲスト'}</div>
                          <div className="text-[10px] text-slate-500">{s.participant_id}</div>
                        </td>
                        <td className="p-3 text-slate-400">{s.event_id || '-'}</td>
                        <td className="p-3 text-right font-bold text-slate-200">
                          {s.total_mean ? Number(s.total_mean).toFixed(2) : '-'} 点
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            href={`/result/${s.submission_token}`}
                            target="_blank"
                            className="text-indigo-400 hover:text-indigo-300 underline text-[11px]"
                          >
                            開く ↗
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              条件に一致するデータが存在しません。
            </div>
          )}
        </div>

      </div>
    </div>
  );
}