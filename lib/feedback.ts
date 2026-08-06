// lib/feedback.ts
// 2HFSの結果を、診断ではなく「前向きな自己理解と生活への応用」として伝えるための文言生成ロジック。
//
// 鈴木美奈子先生・島内先生「ハッピネスライフ・チェックシート（健康生活行動調査）
// ワンポイント・アドバイス」の考え方を踏まえ、以下を方針とする。
// ・低く出た領域を問題として指摘しない（このファイルは高く出た領域のみを扱う）
// ・高く出た領域を、その人の生活資源・Well-beingの入り口として肯定的に返す
// ・「あなたは〇〇ができる人です」のように、その人の持ち味を認める
// ・そのうえで、日常生活への小さな広げ方を柔らかく提案する
// ・「改善が必要」「不足している」「平均より低い」「問題がある」は使わない
// ・「〇〇生活型」は診断名ではなく、Well-beingの傾向を前向きに表す言葉として使う
//
// 文言は「肯定 → その領域が資源として働く理由 → 日常への小さな提案」の3構成をベースにする。
// 同じ文言の繰り返し感を減らすため、パターンごとに複数の言い回しを用意し、
// シード値（submission_tokenやメールアドレス等）をもとに決定的に選ぶ。

export type DomainKey = 'kaishoku' | 'kaimin' | 'kaido' | 'kaisho' | 'kairaku' | 'kaisei';

export const domainOrder: DomainKey[] = ['kaishoku', 'kaimin', 'kaido', 'kaisho', 'kairaku', 'kaisei'];

const domainLabel: Record<DomainKey, string> = {
  kaishoku: '快食',
  kaimin: '快眠',
  kaido: '快動',
  kaisho: '快笑',
  kairaku: '快楽',
  kaisei: '快生',
};

// 「〇〇生活型」ラベル（診断名ではなく、傾向を表す前向きな呼び方）
const lifestyleLabel: Record<DomainKey, string> = {
  kaishoku: '快食生活型',
  kaimin: '快眠生活型',
  kaido: '快動生活型',
  kaisho: '快笑生活型',
  kairaku: '快楽生活型',
  kaisei: '快生生活型',
};

// ============================================================
// A. イベント直後コメント（短め）：結果画面（事前・事後）で使用
// ============================================================
const shortStrengthVariants: Record<DomainKey, string[]> = {
  kaishoku: [
    '今回のあなたは、快食がWell-beingを支える入り口として表れています。食事を味わい、栄養を大切にする感覚が、あなたらしい心地よさにつながっているのかもしれません。',
    '今回の結果では、快食があなたの資源として表れました。食を楽しみ、味わう力は、日々の暮らしを豊かにしてくれるものです。',
    '快食が、今回のあなたを特徴づける入り口になっています。食事の時間を大切にできることは、それ自体があなたの持ち味です。',
  ],
  kaimin: [
    '今回のあなたは、快眠がWell-beingを支える入り口として表れています。しっかり休み、整えることができる力が、あなたらしい心地よさにつながっているのかもしれません。',
    '今回の結果では、快眠があなたの資源として表れました。眠りを大切にできる力は、次への活力を生み出してくれます。',
    '快眠が、今回のあなたを特徴づける入り口になっています。休むことを大切にできるのは、あなたの持ち味のひとつです。',
  ],
  kaido: [
    '今回のあなたは、快動がWell-beingを支える入り口として表れています。身体を動かし、軽やかに過ごせる力が、あなたらしい心地よさにつながっているのかもしれません。',
    '今回の結果では、快動があなたの資源として表れました。動くことを楽しめる力は、日々の活力の源になります。',
    '快動が、今回のあなたを特徴づける入り口になっています。身体を動かせることは、あなたの持ち味のひとつです。',
  ],
  kaisho: [
    '今回のあなたは、快笑がWell-beingを支える入り口として表れています。人と笑い合う時間や、微笑ましい出来事に気づくことが、あなたらしい心地よさにつながっているのかもしれません。',
    '今回の結果では、快笑があなたの資源として表れました。よく笑い、微笑んでいられる力は、周りにも温かさを届けてくれます。',
    '快笑が、今回のあなたを特徴づける入り口になっています。笑顔でいられることは、あなたの持ち味のひとつです。',
  ],
  kairaku: [
    '今回のあなたは、快楽がWell-beingを支える入り口として表れています。楽しみや、人とのふれあいを大切にできる力が、あなたらしい心地よさにつながっているのかもしれません。',
    '今回の結果では、快楽があなたの資源として表れました。楽しむ力、味わう力は、日々の暮らしを豊かにしてくれます。',
    '快楽が、今回のあなたを特徴づける入り口になっています。楽しみを見つけられることは、あなたの持ち味のひとつです。',
  ],
  kaisei: [
    '今回のあなたは、快生がWell-beingを支える入り口として表れています。自分らしくいられる感覚が、あなたらしい心地よさにつながっているのかもしれません。',
    '今回の結果では、快生があなたの資源として表れました。自分を大切にできる力は、日々を前向きに歩む土台になります。',
    '快生が、今回のあなたを特徴づける入り口になっています。自分らしさを保てることは、あなたの持ち味のひとつです。',
  ],
};

// ============================================================
// B. 経時記録コメント（長め・「〇〇生活型」）：マイダッシュボードで使用
// ============================================================
const longStrengthVariants: Record<DomainKey, string[]> = {
  kaishoku: [
    'これまでの記録では、あなたは快食生活型の傾向が見られます。日々の暮らしの中で、食べることに楽しみや喜びを見出せるあなたは、食を通して人とのつながりや、気持ちの切り替えを得意とする人なのかもしれません。栄養バランスを意識できる力は、自分自身を大切にする細やかさの表れでもあります。次の食事では、新しい美味しさを見つけるつもりで、少し丁寧に味わってみてはいかがでしょうか。',
    'これまでの記録から、快食生活型としてのあなたの傾向が見えてきました。食事の時間を楽しめる力は、日々のストレスと上手につきあい、身近な人との時間を豊かにしてくれる資源です。新しいメニューや味との出会いを楽しみながら、あなたらしい食の時間を育てていけるかもしれません。',
  ],
  kaimin: [
    'これまでの記録では、あなたは快眠生活型の傾向が見られます。自分なりのリズムで眠りを整えられるあなたは、気持ちを一日ごとにリセットし、身体の余分な力を抜くことが得意な人なのかもしれません。その力は、次の日を軽やかに迎える活力につながっています。心地よい眠りの時間を、少し意識して大切にしてみてはいかがでしょうか。',
    'これまでの記録から、快眠生活型としてのあなたの傾向が見えてきました。しっかり休み、自分を整えられる力は、あなたを支える大きな資源です。眠る前のひとときに、心地よい空間や小さな工夫を取り入れてみると、さらに快適な休息につながるかもしれません。',
  ],
  kaido: [
    'これまでの記録では、あなたは快動生活型の傾向が見られます。身体を動かすことが気持ちの活力にもなるあなたは、自ら進んで動くことを得意とする、行動的な人なのかもしれません。動くことを通して周りの人との交流が深まったり、心が軽やかになったりすることもあるでしょう。遊び心を忘れずに、無理のない範囲で身体を動かす時間を持ってみてはいかがでしょうか。',
    'これまでの記録から、快動生活型としてのあなたの傾向が見えてきました。動くことを楽しめる力は、あなたを支える大切な資源のひとつです。次は少し歩いてみる、軽く身体を動かしてみるなど、小さな一歩から、あなたらしい活力を育てていけるかもしれません。',
  ],
  kaisho: [
    'これまでの記録では、あなたは快笑生活型の傾向が見られます。物事を前向きに受け止められるあなたは、人との交流を好み、喜びや優しさを周りに分けられる人なのかもしれません。日常のささやかな幸せに気づく力は、あなた自身だけでなく、周りの人の気持ちも明るくしてくれるでしょう。その「素敵」と思えた気持ちを、周りの人にも伝えてみてはいかがでしょうか。',
    'これまでの記録から、快笑生活型としてのあなたの傾向が見えてきました。よく笑い、微笑んでいられる力は、あなたを支える大切な資源です。誰かとの何気ない会話や、ふとした出来事の中にある小さな幸せを、これからも大切にしてみてください。',
  ],
  kairaku: [
    'これまでの記録では、あなたは快楽生活型の傾向が見られます。好奇心が豊かで、楽しむことが得意なあなたは、自分を高める方法をよく知っている人なのかもしれません。その力は趣味だけでなく、仕事や日常のさまざまな場面でも活かせる応用力でもあります。その力を発揮できる場に、少し勇気を出して参加してみてはいかがでしょうか。',
    'これまでの記録から、快楽生活型としてのあなたの傾向が見えてきました。楽しむ力、味わう力は、あなたを支える大切な資源です。その楽しみを周りの人と分かち合うことで、あなたらしい楽しみの輪がさらに広がっていくかもしれません。',
  ],
  kaisei: [
    'これまでの記録では、あなたは快生生活型の傾向が見られます。ありのままの自分を受け入れられるあなたは、しっかりとした主体性を持つ人なのかもしれません。大切な人々に囲まれ、生きている実感を持てていることは、周りからも頼られる存在である証でもあるでしょう。新しい自分と出会う時間も楽しみながら、日々を充実させていってはいかがでしょうか。',
    'これまでの記録から、快生生活型としてのあなたの傾向が見えてきました。自分を大切にできる力は、あなたを支える大切な資源です。その前向きな力を、周りの人にもそっと分けてあげることで、あなたらしいWell-beingがさらに広がっていくかもしれません。',
  ],
};

const HEADLINE_VARIANTS = [
  'これは診断や評価ではなく、"今のあなた"を映す一枚のスナップショットです。数字の高い・低いに一喜一憂せず、気づきのきっかけとして眺めてみてください。',
  'この結果は、あなたを評価するものではありません。今のあなたの状態を切り取った、いわば「心と体の天気予報」のようなものです。気軽に眺めてみてください。',
  '点数の高さや低さに意味はありません。これは"今この瞬間のあなた"をそのまま映した記録です。日々のちょっとした振り返りとして役立ててみてください。',
];

const CHANGE_INCREASED_VARIANTS = [
  '事前から事後にかけて、全体の数値が上向きに変化していました。今日の時間が、あなたの中に何か前向きなものを残したのかもしれません。',
  '事前と比べて、事後の数値が上向いていました。今日の体験が、あなたにとって良い時間だったのかもしれません。',
  '事前から事後で、数値に上向きの変化が見られました。何か心に残るものがあったのかもしれませんね。',
];

const CHANGE_DECREASED_VARIANTS = [
  '事前から事後にかけて、数値は少し違う形で表れていました。数値の上下は自然な波であり、優劣を示すものではありません。今日一日、どんな時間を過ごされたか、ふと振り返ってみるのも良いかもしれません。',
  '事前と事後で、数値は異なる形になりました。これは良い悪いではなく、その日その日の自然な波です。今日の時間を、ゆっくり振り返ってみるのも良さそうです。',
  '事前から事後にかけて、数値に変化が見られました。数値の増減に優劣はありません。今日という一日を、そのまま受け止めてみてください。',
];

const CHANGE_FLAT_VARIANTS = [
  '事前と事後で、落ち着いた変化でした。安定して過ごせた一日だったのかもしれません。',
  '事前と事後で、数値は大きく変わりませんでした。落ち着いたペースで過ごせていたのかもしれません。',
  '事前から事後にかけて、穏やかな推移でした。安定感のある一日だったようです。',
];

// 事前→事後の変化がこれ未満なら「横ばい」として扱う
const CHANGE_FLAT_THRESHOLD = 0.15;
// 経時記録コメント(生活型)を出すために必要な最低記録数
export const LIFESTYLE_ADVICE_MIN_RECORDS = 3;

export interface FeedbackInput {
  domainScores: Record<DomainKey, number>;
  preDomainScores?: Record<DomainKey, number>;
  totalMean: number;
  /** 文言バリエーションの決定的な選択に使うシード（例: submission_token）。指定なしならランダム */
  seed?: string;
}

export interface FeedbackResult {
  headline: string;
  strengthText: string;
  changeText?: string;
}

export interface LifestyleAdviceResult {
  domain: DomainKey;
  label: string; // 例: 「快動生活型」
  advice: string;
}

function pickExtreme(domainScores: Record<DomainKey, number>, mode: 'max' | 'min'): DomainKey {
  let picked = domainOrder[0];
  let pickedScore = domainScores[picked];

  for (const key of domainOrder) {
    const score = domainScores[key];
    if (mode === 'max' ? score > pickedScore : score < pickedScore) {
      picked = key;
      pickedScore = score;
    }
  }
  return picked;
}

// シード文字列から0以上の整数を作る、簡易な決定的ハッシュ
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// salt（用途ごとの識別子）を混ぜることで、同じ記録でも「見出し」「強み」「変化」が
// それぞれ独立してばらけるようにする
function pickVariant(variants: string[], seed: string | undefined, salt: string): string {
  if (variants.length === 0) return '';
  const base = seed ? hashSeed(`${seed}::${salt}`) : Math.floor(Math.random() * 1_000_000);
  return variants[base % variants.length];
}

// A. イベント直後コメント（結果画面で使用）
export function generateFeedback(input: FeedbackInput): FeedbackResult {
  const { domainScores, preDomainScores, totalMean, seed } = input;

  const strengthDomain = pickExtreme(domainScores, 'max');

  const result: FeedbackResult = {
    headline: pickVariant(HEADLINE_VARIANTS, seed, 'headline'),
    strengthText: pickVariant(shortStrengthVariants[strengthDomain], seed, 'strength'),
  };

  if (preDomainScores) {
    const preValues = domainOrder.map((key) => preDomainScores[key] ?? 0);
    const preTotalMean = preValues.reduce((sum, v) => sum + v, 0) / preValues.length;
    const diff = totalMean - preTotalMean;

    if (diff > CHANGE_FLAT_THRESHOLD) {
      result.changeText = pickVariant(CHANGE_INCREASED_VARIANTS, seed, 'change');
    } else if (diff < -CHANGE_FLAT_THRESHOLD) {
      result.changeText = pickVariant(CHANGE_DECREASED_VARIANTS, seed, 'change');
    } else {
      result.changeText = pickVariant(CHANGE_FLAT_VARIANTS, seed, 'change');
    }
  }

  return result;
}

// B. 経時記録コメント（マイダッシュボードで使用）。
// domainScoresには、これまでの記録の平均値などを渡す想定。
export function generateLifestyleAdvice(
  domainScores: Record<DomainKey, number>,
  seed?: string
): LifestyleAdviceResult {
  const domain = pickExtreme(domainScores, 'max');
  return {
    domain,
    label: lifestyleLabel[domain],
    advice: pickVariant(longStrengthVariants[domain], seed, 'lifestyle'),
  };
}

export { domainLabel, lifestyleLabel };
