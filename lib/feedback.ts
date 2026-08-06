// lib/feedback.ts
// 2HFSの結果を、診断ではなく「気づきのきっかけ」として伝えるための文言生成ロジック。
// 集団平均には言及しない・低い数値を欠点として扱わない、という設計方針に沿って文言を組み立てる。
// 同じテンプレートの繰り返し感を減らすため、パターンごとに複数の言い回しを用意し、
// submission_token等のシード値をもとに決定的に(=同じ記録なら毎回同じ文言に)選ぶ。

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

const strengthTextVariants: Record<DomainKey, string[]> = {
  kaishoku: [
    '『快食』に、しっかりと意識を向けられていたようです。食事を味わう感覚は、あなたを支える資源のひとつかもしれません。',
    '『快食』の充実が、今回のあなたを支えていたようです。食を楽しむ時間は、日々の元気の土台になっているのかもしれません。',
    '『快食』にまつわる豊かさが感じられました。おいしく食べられているというのは、実は大きな強みです。',
  ],
  kaimin: [
    '『快眠』が、今のあなたを支えているようです。しっかり休めていることは、次への活力につながります。',
    '『快眠』の質の良さが、今回のあなたの特徴として表れていました。眠りが整っていることは、見えない土台としてとても大切です。',
    '『快眠』にまつわる感覚が良好だったようです。ぐっすり眠れているというのは、それだけで立派な資源です。',
  ],
  kaido: [
    '『快動』の心地よさが、今回のあなたを特徴づけていました。身体を動かす感覚を、これからも大切にしていきたいですね。',
    '『快動』の充実が感じられました。体を動かせているという実感は、日々の活力の源になっているのかもしれません。',
    '『快動』にまつわる軽やかさが、今回のあなたの持ち味として表れていました。',
  ],
  kaisho: [
    '『快笑』が、あなたらしさとしてよく表れていました。笑いや微笑ましい瞬間が、日々に彩りを添えているようです。',
    '『快笑』の豊かさが感じられました。よく笑えているというのは、心にゆとりがある証かもしれません。',
    '『快笑』にまつわる時間が、今回のあなたを支えていたようです。笑顔でいられることは、それ自体が資源です。',
  ],
  kairaku: [
    '『快楽』の時間を、しっかりと持てていたようです。楽しみや充実感は、あなたを支える大きな力になります。',
    '『快楽』の充実が、今回のあなたの特徴として表れていました。楽しむ時間を持てているのは素敵なことです。',
    '『快楽』にまつわる豊かさが感じられました。好きなことに時間を使えているのは、大切な資源のひとつです。',
  ],
  kaisei: [
    '『快生』の感覚が、今回のあなたを特徴づけていました。自分らしくいられている実感は、かけがえのない資源です。',
    '『快生』の充実が感じられました。自分らしさを保てているというのは、大きな強みです。',
    '『快生』にまつわる前向きさが、今回のあなたの持ち味として表れていました。',
  ],
};

const reflectionTextVariants: Record<DomainKey, string[]> = {
  kaishoku: [
    '『快食』は、他の項目と比べると少し静かな数値でした。次の食事の時間、少しだけ味わってみるのも良いかもしれません。',
    '『快食』に、次はもう少しだけ目を向けてみると、新しい発見があるかもしれません。',
    '『快食』は今回、控えめな数値でした。ふとした食事の時間を、少し楽しんでみるのも良さそうです。',
  ],
  kaimin: [
    '『快眠』に、次はもう少しだけ意識を向けてみると、新しい発見があるかもしれません。',
    '『快眠』は、他の項目と比べると少し静かな数値でした。今夜、いつもより少し早く休んでみるのも良いかもしれません。',
    '『快眠』は今回、控えめでした。眠りの質に、ふと意識を向けてみるのも良さそうです。',
  ],
  kaido: [
    '『快動』は、今回は控えめな数値でした。少し身体を動かす時間を持ってみると、違う感覚に出会えるかもしれません。',
    '『快動』に、次はもう少しだけ目を向けてみると、新しい発見があるかもしれません。',
    '『快動』は他の項目と比べると静かな数値でした。ちょっとした散歩から始めてみるのも良さそうです。',
  ],
  kaisho: [
    '『快笑』は、今回は少し落ち着いていたようです。ふと笑えるような時間を、これから探してみるのも良さそうです。',
    '『快笑』に、次はもう少しだけ意識を向けてみると、新しい発見があるかもしれません。',
    '『快笑』は控えめな数値でした。誰かとの何気ない会話から、笑顔が生まれるかもしれません。',
  ],
  kairaku: [
    '『快楽』は、今回は控えめでした。ほんの少し、自分の楽しみのための時間を作ってみるのも良いかもしれません。',
    '『快楽』に、次はもう少しだけ目を向けてみると、新しい発見があるかもしれません。',
    '『快楽』は他の項目と比べると静かな数値でした。好きなことに少し時間を使ってみるのも良さそうです。',
  ],
  kaisei: [
    '『快生』は、今回は少し静かな数値でした。自分自身に目を向ける時間を、少しだけ増やしてみるのも良さそうです。',
    '『快生』に、次はもう少しだけ意識を向けてみると、新しい発見があるかもしれません。',
    '『快生』は控えめな数値でした。自分を労う時間を、少しだけ持ってみるのも良いかもしれません。',
  ],
};

const BALANCE_TEXT_VARIANTS = [
  '6つの領域が、バランスよく整っているようです。特定の何かに偏らず過ごせた時間だったのかもしれません。',
  '6つの領域に、大きな偏りは見られませんでした。全体として落ち着いたバランスで過ごせていたようです。',
  'どの領域も、まんべんなく整っているようです。特別なことをしていなくても、これは十分素敵なことです。',
];

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

// 領域間の差がこれ未満なら「バランス型」として扱い、reflectionTextは出さない
const DOMAIN_GAP_THRESHOLD = 1.0;
// 事前→事後の変化がこれ未満なら「横ばい」として扱う
const CHANGE_FLAT_THRESHOLD = 0.15;

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
  reflectionText?: string;
  changeText?: string;
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

// salt（用途ごとの識別子）を混ぜることで、同じ記録でも「強み文」「気づき文」「変化文」が
// それぞれ独立してばらけるようにする
function pickVariant(variants: string[], seed: string | undefined, salt: string): string {
  if (variants.length === 0) return '';
  const base = seed ? hashSeed(`${seed}::${salt}`) : Math.floor(Math.random() * 1_000_000);
  return variants[base % variants.length];
}

export function generateFeedback(input: FeedbackInput): FeedbackResult {
  const { domainScores, preDomainScores, totalMean, seed } = input;

  const strengthDomain = pickExtreme(domainScores, 'max');
  const reflectionDomain = pickExtreme(domainScores, 'min');

  const gap = domainScores[strengthDomain] - domainScores[reflectionDomain];
  const hasMeaningfulGap = gap >= DOMAIN_GAP_THRESHOLD;

  const result: FeedbackResult = {
    headline: pickVariant(HEADLINE_VARIANTS, seed, 'headline'),
    strengthText: pickVariant(strengthTextVariants[strengthDomain], seed, 'strength'),
    reflectionText: hasMeaningfulGap
      ? pickVariant(reflectionTextVariants[reflectionDomain], seed, 'reflection')
      : pickVariant(BALANCE_TEXT_VARIANTS, seed, 'balance'),
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

export { domainLabel };
