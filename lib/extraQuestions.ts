// lib/extraQuestions.ts
// イベントごとに管理者が自由に編集できる「追加質問」（2HFS18項目とは別の、事後アンケートSection 2相当）。
// 2HFSの設問文・因子とは完全に独立した仕組みで、events.extra_questions (jsonb) に保存する。

export type ExtraQuestionType = 'likert' | 'text' | 'choice' | 'name';

export interface ExtraQuestion {
  id: string;
  type: ExtraQuestionType;
  textJa: string;
  /** type: 'choice' の場合の選択肢一覧 */
  options?: string[];
  required?: boolean;
}

export const EXTRA_LIKERT_SCALE = [
  { val: 1, ja: 'まったく思わない' },
  { val: 2, ja: 'あまり思わない' },
  { val: 3, ja: 'ふつう' },
  { val: 4, ja: '少しそう思う' },
  { val: 5, ja: '大変そう思う' },
];

// SUPwellイベント用のデフォルトセット（Googleフォーム「事後アンケート」Section 2をベースにした初期値）。
// 管理画面で「デフォルトセットを読み込む」を押したときの初期値として使う。SUPをしないイベントでは
// 管理者側で該当項目（SUPを扱う技術が向上した、等）を編集・削除できる想定。
export const DEFAULT_EXTRA_QUESTIONS: ExtraQuestion[] = [
  { id: 'name', type: 'name', textJa: '氏名', required: true },
  { id: 'q_satisfaction', type: 'likert', textJa: 'イベント全体に満足した', required: true },
  { id: 'q_wellbeing', type: 'likert', textJa: '自身のウェルビーイングは向上した', required: true },
  { id: 'q_sup_skill', type: 'likert', textJa: 'SUPを扱う技術が向上した', required: true },
  { id: 'q_exchange', type: 'likert', textJa: '学内・OBおよびその他の参加者や地域住民（印旛沼土地改良区の職員さんなど）との交流が図れた', required: true },
  { id: 'q_attachment', type: 'likert', textJa: '地域への愛着度は向上した', required: true },
  { id: 'q_environment', type: 'likert', textJa: '環境問題への関心や、自然への理解が向上した', required: true },
  { id: 'q_community', type: 'likert', textJa: '本取組によって地域コミュニティは活性化する', required: true },
  { id: 'q_bbq', type: 'likert', textJa: '交流会（BBQ）は必要だった', required: true },
  { id: 'q_good_points', type: 'text', textJa: '今回のイベントの良かった点、改善すべき点について教えてください', required: true },
  { id: 'q_local_interest', type: 'text', textJa: '日頃感じている地域課題、取り組んでみたいアウトドアスポーツ、地域活性化に向けて大学に期待することなど、些細なことでもかまいませんので教えてください。', required: true },
  { id: 'q_participation_count', type: 'choice', textJa: 'SUPwellイベントへの参加回数を教えてください。', options: ['初めて', '１－２回', '３－５回', '５回以上'], required: true },
];

export const EXTRA_QUESTION_TYPE_LABEL: Record<ExtraQuestionType, string> = {
  likert: '5段階評価',
  text: '自由記述',
  choice: '単一選択',
  name: '一行テキスト（氏名など）',
};

export function createBlankExtraQuestion(type: ExtraQuestionType): ExtraQuestion {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    type,
    textJa: '',
    required: true,
    ...(type === 'choice' ? { options: ['選択肢1', '選択肢2'] } : {}),
  };
}
