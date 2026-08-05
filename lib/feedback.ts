// lib/feedback.ts
// 2HFSの結果を、診断ではなく「気づきのきっかけ」として伝えるための文言生成ロジック。
// 集団平均には言及しない・低い数値を欠点として扱わない、という設計方針に沿って文言を組み立てる。

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

const strengthText: Record<DomainKey, string> = {
  kaishoku: '『快食』に、しっかりと意識を向けられていたようです。食事を味わう感覚は、あなたを支える資源のひとつかもしれません。',
  kaimin: '『快眠』が、今のあなたを支えているようです。しっかり休めていることは、次への活力につながります。',
  kaido: '『快動』の心地よさが、今回のあなたを特徴づけていました。身体を動かす感覚を、これからも大切にしていきたいですね。',
  kaisho: '『快笑』が、あなたらしさとしてよく表れていました。笑いや微笑ましい瞬間が、日々に彩りを添えているようです。',
  kairaku: '『快楽』の時間を、しっかりと持てていたようです。楽しみや充実感は、あなたを支える大きな力になります。',
  kaisei: '『快生』の感覚が、今回のあなたを特徴づけていました。自分らしくいられている実感は、かけがえのない資源です。',
};

const reflectionText: Record<DomainKey, string> = {
  kaishoku: '『快食』は、他の項目と比べると少し静かな数値でした。次の食事の時間、少しだけ味わってみるのも良いかもしれません。',
  kaimin: '『快眠』に、次はもう少しだけ意識を向けてみると、新しい発見があるかもしれません。',
  kaido: '『快動』は、今回は控えめな数値でした。少し身体を動かす時間を持ってみると、違う感覚に出会えるかもしれません。',
  kaisho: '『快笑』は、今回は少し落ち着いていたようです。ふと笑えるような時間を、これから探してみるのも良さそうです。',
  kairaku: '『快楽』は、今回は控えめでした。ほんの少し、自分の楽しみのための時間を作ってみるのも良いかもしれません。',
  kaisei: '『快生』は、今回は少し静かな数値でした。自分自身に目を向ける時間を、少しだけ増やしてみるのも良さそうです。',
};

const BALANCE_TEXT =
  '6つの領域が、バランスよく整っているようです。特定の何かに偏らず過ごせた時間だったのかもしれません。';

const HEADLINE =
  'これは診断や評価ではなく、"今のあなた"を映す一枚のスナップショットです。数字の高い・低いに一喜一憂せず、気づきのきっかけとして眺めてみてください。';

// 領域間の差がこれ未満なら「バランス型」として扱い、reflectionTextは出さない
const DOMAIN_GAP_THRESHOLD = 1.0;
// 事前→事後の変化がこれ未満なら「横ばい」として扱う
const CHANGE_FLAT_THRESHOLD = 0.15;

export interface FeedbackInput {
  domainScores: Record<DomainKey, number>;
  preDomainScores?: Record<DomainKey, number>;
  totalMean: number;
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

export function generateFeedback(input: FeedbackInput): FeedbackResult {
  const { domainScores, preDomainScores, totalMean } = input;

  const strengthDomain = pickExtreme(domainScores, 'max');
  const reflectionDomain = pickExtreme(domainScores, 'min');

  const gap = domainScores[strengthDomain] - domainScores[reflectionDomain];
  const hasMeaningfulGap = gap >= DOMAIN_GAP_THRESHOLD;

  const result: FeedbackResult = {
    headline: HEADLINE,
    strengthText: strengthText[strengthDomain],
    reflectionText: hasMeaningfulGap ? reflectionText[reflectionDomain] : BALANCE_TEXT,
  };

  if (preDomainScores) {
    const preValues = domainOrder.map((key) => preDomainScores[key] ?? 0);
    const preTotalMean = preValues.reduce((sum, v) => sum + v, 0) / preValues.length;
    const diff = totalMean - preTotalMean;

    if (diff > CHANGE_FLAT_THRESHOLD) {
      result.changeText =
        '事前から事後にかけて、全体の数値が上向きに変化していました。今日の時間が、あなたの中に何か前向きなものを残したのかもしれません。';
    } else if (diff < -CHANGE_FLAT_THRESHOLD) {
      result.changeText =
        '事前から事後にかけて、数値は少し違う形で表れていました。数値の上下は自然な波であり、優劣を示すものではありません。今日一日、どんな時間を過ごされたか、ふと振り返ってみるのも良いかもしれません。';
    } else {
      result.changeText = '事前と事後で、落ち着いた変化でした。安定して過ごせた一日だったのかもしれません。';
    }
  }

  return result;
}

export { domainLabel };
