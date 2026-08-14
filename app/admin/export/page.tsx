'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// 閲覧者のタイムゾーンに関わらず、常に日本時間(JST)で「年月日 時:分:秒」まで表示する
const formatDateTimeJST = (dateStr: string) =>
  new Date(dateStr).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export default function AdminExportPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
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

      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title')
        .order('created_at', { ascending: false });
      setEvents(eventsData || []);
    } catch (err) {
      console.error('Data fetch error:', err);
      alert('データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // ユニークなイベントIDリスト（表示名はevents側のtitleを使う）
  const uniqueEventIds = useMemo(() => {
    const ids = surveys
      .map((s) => s.event_id)
      .filter((id): id is string => Boolean(id) && id !== 'private');
    return Array.from(new Set(ids));
  }, [surveys]);

  const eventOptions = useMemo(() => {
    return uniqueEventIds
      .map((id) => {
        const ev = events.find((e) => e.id === id);
        const targetDate = ev?.event_date || ev?.date;
        return {
          id,
          label: ev ? `${ev.title}${targetDate ? `（${targetDate}）` : ''}` : id,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'ja'));
  }, [uniqueEventIds, events]);

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

  // 選択した記録を完全に削除する（元に戻せないため二重確認する）
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSelected = async () => {
    if (selectedSurveys.length === 0) return;

    const firstConfirm = confirm(
      `選択した${selectedSurveys.length}件のデータを完全に削除します。この操作は元に戻せません。よろしいですか？`
    );
    if (!firstConfirm) return;

    const secondConfirm = confirm(
      `最終確認です。本当に${selectedSurveys.length}件を完全に削除してよろしいですか？（削除後の復元はできません）`
    );
    if (!secondConfirm) return;

    setDeleting(true);
    try {
      const ids = selectedSurveys.map((s) => s.id).filter(Boolean);
      const { error } = await supabase.from('surveys').delete().in('id', ids);
      if (error) throw error;

      setSelectedIds(new Set());
      alert(`${ids.length}件を削除しました。`);
      await fetchSurveys();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('削除に失敗しました: ' + (err.message || '通信エラー'));
    } finally {
      setDeleting(false);
    }
  };

  // 選択した記録の中に「同じ人・同じタイミング種別」が重複していないかチェックする。
  // surveys側に (event_id, participant_id, timing_type) の一意制約があるため、
  // 同じ人が同じタイミングで複数回答した記録を同じイベントにまとめようとすると
  // DBエラーになる。事前に検出して、どれが重複しているか分かりやすく伝える。
  const findDuplicateSelections = (rows: any[], overrideTiming?: string) => {
    const seen = new Map<string, any[]>();
    rows.forEach((r) => {
      const timing = overrideTiming || r.timing_type;
      const key = `${r.participant_id}__${timing}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(r);
    });
    return Array.from(seen.values()).filter((list) => list.length > 1);
  };

  const describeDuplicates = (dupeGroups: any[][]) =>
    dupeGroups
      .map((group) => {
        const label = group[0].display_name || group[0].participant_id || 'ゲスト';
        const dates = group.map((r) => formatDateTimeJST(r.created_at)).join(' / ');
        return `・${label}（${group[0].participant_id}）: ${dates}`;
      })
      .join('\n');

  // 選択した記録を1つのイベントに束ね、集団平均を出せるようにする（遡及的グループ化）
  const [grouping, setGrouping] = useState(false);
  const [groupResult, setGroupResult] = useState<{ title: string; eventId: string; count: number } | null>(null);

  const handleGroupSelected = async () => {
    if (selectedSurveys.length < 2) return;

    const dupes = findDuplicateSelections(selectedSurveys);
    if (dupes.length > 0) {
      alert(
        `同じ人が同じ回答タイミング（事前/事後/プライベート）で複数回答している記録が選択に含まれているため、グループ化できません。\n\n` +
        describeDuplicates(dupes) +
        `\n\nどちらか一方だけを選び直してください（同じ人の記録は、1つのイベント内で「タイミング種別」ごとに1件までです）。`
      );
      return;
    }

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

      setGroupResult({ title: groupTitle.trim(), eventId: newEvent.id, count: ids.length });
      await fetchSurveys();
    } catch (err: any) {
      console.error('Group error:', err);
      alert('グループ化に失敗しました: ' + (err.message || '通信エラー'));
    } finally {
      setGrouping(false);
    }
  };

  // 誤って選択した記録をグループから外す（event_idをnullに戻す＝ただの単発記録に戻す）
  const [ungrouping, setUngrouping] = useState(false);

  const groupedSelectedCount = selectedSurveys.filter((s) => !!s.event_id).length;

  const handleUngroupSelected = async () => {
    const targets = selectedSurveys.filter((s) => !!s.event_id);
    if (targets.length === 0) return;

    if (!confirm(`選択した${targets.length}件を、紐づいているイベント（グループ）から外します。個別の単発記録に戻り、集団平均の対象からも外れます。よろしいですか？`)) {
      return;
    }

    setUngrouping(true);
    try {
      const ids = targets.map((s) => s.id).filter(Boolean);
      const { error } = await supabase
        .from('surveys')
        .update({ event_id: null })
        .in('id', ids);

      if (error) throw error;

      alert(`${ids.length}件をグループから外しました。`);
      await fetchSurveys();
    } catch (err: any) {
      console.error('Ungroup error:', err);
      alert('グループ解除に失敗しました: ' + (err.message || '通信エラー'));
    } finally {
      setUngrouping(false);
    }
  };

  // プライベート記録などを、既存イベントの事前/事後回答として組み込む
  const [mergeTargetEvent, setMergeTargetEvent] = useState<string>('');
  const [mergeTargetTiming, setMergeTargetTiming] = useState<'pre' | 'post'>('pre');
  const [merging, setMerging] = useState(false);

  const handleMergeIntoEvent = async () => {
    if (selectedSurveys.length === 0) return;
    if (!mergeTargetEvent) {
      alert('組み込み先のイベントを選択してください。');
      return;
    }

    const targetEventTitle = events.find((e) => e.id === mergeTargetEvent)?.title || mergeTargetEvent;
    const timingText = mergeTargetTiming === 'pre' ? '事前' : '事後';

    // 選択した記録の中に、同じ人が複数いないか（組み込み後は全員同じtiming_typeになるため）
    const dupesInSelection = findDuplicateSelections(selectedSurveys, mergeTargetTiming);
    if (dupesInSelection.length > 0) {
      alert(
        `選択した記録の中に、同じ人の記録が複数含まれているため組み込めません。\n\n` +
        describeDuplicates(dupesInSelection) +
        `\n\nどちらか一方だけを選び直してください。`
      );
      return;
    }

    // 組み込み先イベントに、既に同じ人の同タイミング回答がないか（未選択の既存レコードとの重複）
    const conflictsWithExisting = selectedSurveys.filter((s) =>
      surveys.some(
        (other) =>
          other.event_id === mergeTargetEvent &&
          other.timing_type === mergeTargetTiming &&
          other.participant_id === s.participant_id &&
          !selectedIds.has(rowKey(other))
      )
    );
    if (conflictsWithExisting.length > 0) {
      alert(
        `組み込み先の「${targetEventTitle}」には、既に同じ人の${timingText}回答が存在するため組み込めません。\n\n` +
        conflictsWithExisting.map((s) => `・${s.display_name || 'ゲスト'}（${s.participant_id}）`).join('\n')
      );
      return;
    }

    if (!confirm(`選択した${selectedSurveys.length}件を、「${targetEventTitle}」の${timingText}回答として組み込みます。よろしいですか？`)) {
      return;
    }

    setMerging(true);
    try {
      const ids = selectedSurveys.map((s) => s.id).filter(Boolean);
      const { error } = await supabase
        .from('surveys')
        .update({ event_id: mergeTargetEvent, timing_type: mergeTargetTiming })
        .in('id', ids);

      if (error) throw error;

      alert(`${ids.length}件を「${targetEventTitle}」の${timingText}回答として組み込みました。`);
      await fetchSurveys();
    } catch (err: any) {
      console.error('Merge error:', err);
      alert('組み込みに失敗しました: ' + (err.message || '通信エラー'));
    } finally {
      setMerging(false);
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
      const createdAt = s.created_at ? formatDateTimeJST(s.created_at) : '';
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

        {/* グループ化完了バナー */}
        {groupResult && (
          <div className="bg-purple-950/60 border border-purple-800/50 p-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-purple-200 text-sm font-bold">
                👥 「{groupResult.title}」として{groupResult.count}件をグループ化しました
              </p>
              <p className="text-purple-300 text-xs mt-1">
                管理者ダッシュボードのイベント一覧の一番上に「👥 プライベートグループ」バッジ付きで表示されます。
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition-colors whitespace-nowrap"
              >
                管理者ダッシュボードを開く ↗
              </a>
              <button
                onClick={() => setGroupResult(null)}
                className="text-purple-300 hover:text-purple-200 text-xs underline whitespace-nowrap"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* ヘッダー */}
        <div className="bg-slate-800/90 p-6 md:p-8 rounded-2xl border border-slate-700/60 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-slate-700 text-slate-300 text-[11px] font-semibold px-2.5 py-1 rounded-md inline-block mb-2">
              ADMIN SYSTEM
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight">
              回答データ抽出・CSV出力
            </h1>
            <p className="text-xs text-slate-300 mt-1">
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
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-2">
            フィルター条件設定
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* イベント選択 */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">イベント名</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">すべてのイベント</option>
                {eventOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
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
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
              {groupedSelectedCount > 0 && (
                <button
                  onClick={handleUngroupSelected}
                  disabled={ungrouping}
                  className="text-xs font-bold text-amber-300 hover:text-amber-100 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                  title="誤ってグループに含めてしまった記録を、単発の記録に戻します"
                >
                  {ungrouping ? '処理中...' : `🔓 選択中の${groupedSelectedCount}件をグループから外す`}
                </button>
              )}
              {selectedSurveys.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="text-xs font-bold text-rose-300 hover:text-rose-100 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                  title="選択した記録を完全に削除します（元に戻せません）"
                >
                  {deleting ? '削除中...' : `🗑️ 選択中の${selectedSurveys.length}件を削除`}
                </button>
              )}
              <button
                onClick={fetchSurveys}
                className="text-xs text-slate-300 hover:text-slate-200 underline transition-colors"
              >
                🔄 リロード
              </button>
            </div>
          </div>

          {selectedSurveys.length > 0 && (
            <div className="mb-5 p-4 bg-indigo-950/40 border border-indigo-800/40 rounded-xl flex flex-col md:flex-row md:items-center gap-3">
              <span className="text-xs font-bold text-indigo-300 whitespace-nowrap">
                📥 選択中の{selectedSurveys.length}件を既存イベントの事前/事後として組み込む
              </span>
              <select
                value={mergeTargetEvent}
                onChange={(e) => setMergeTargetEvent(e.target.value)}
                className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 flex-1 min-w-0"
              >
                <option value="">組み込み先のイベントを選択...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
              <select
                value={mergeTargetTiming}
                onChange={(e) => setMergeTargetTiming(e.target.value as 'pre' | 'post')}
                className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="pre">事前として</option>
                <option value="post">事後として</option>
              </select>
              <button
                onClick={handleMergeIntoEvent}
                disabled={merging || !mergeTargetEvent}
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {merging ? '処理中...' : '組み込む'}
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-300 text-xs">データを読み込み中...</div>
          ) : filteredSurveys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300 font-medium">
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
                    <th className="p-3">イベント名</th>
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
                        <td className="p-3 text-slate-300 whitespace-nowrap">
                          {s.created_at ? formatDateTimeJST(s.created_at) : '-'}
                        </td>
                        <td className="p-3 font-medium whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${badgeBg}`}>
                            {timingLabel}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-200 font-medium">{s.display_name || 'ゲスト'}</div>
                          <div className="text-[10px] text-slate-300">{s.participant_id}</div>
                        </td>
                        <td className="p-3 text-slate-300">
                          {s.event_id ? (events.find((e) => e.id === s.event_id)?.title || s.event_id) : '-'}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-200">
                          {s.total_mean ? Number(s.total_mean).toFixed(2) : '-'} 点
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            href={`/result/${s.submission_token}`}
                            target="_blank"
                            className="text-indigo-300 hover:text-indigo-200 underline text-[11px]"
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
            <div className="text-center py-12 text-slate-300 text-xs">
              条件に一致するデータが存在しません。
            </div>
          )}
        </div>

      </div>
    </div>
  );
}