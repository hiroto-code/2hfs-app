export interface QuestionItem {
  index: number;
  textJa: string;
  textEn: string;
}

export interface DomainGroup {
  domainKey: string;
  domainJa: string;
  domainEn: string;
  items: QuestionItem[];
}

export const domainQuestions: DomainGroup[] = [
  {
    domainKey: 'kaishoku',
    domainJa: '快食',
    domainEn: 'Enjoyable Eating',
    items: [
      { index: 0, textJa: '美味しく食事ができている', textEn: 'I enjoy my meals.' },
      { index: 1, textJa: '毎日の食事に満足している', textEn: 'I am satisfied with my daily meals.' },
      { index: 2, textJa: '食事が楽しみである', textEn: 'I look forward to my meals.' }
    ]
  },
  {
    domainKey: 'kaimin',
    domainJa: '快眠',
    domainEn: 'Restful Sleep',
    items: [
      { index: 3, textJa: 'ぐっすり眠れている', textEn: 'I sleep soundly.' },
      { index: 4, textJa: '朝すっきりと起きられる', textEn: 'I wake up feeling refreshed.' },
      { index: 5, textJa: '睡眠の質に満足している', textEn: 'I am satisfied with the quality of my sleep.' }
    ]
  },
  {
    domainKey: 'kaido',
    domainJa: '快動',
    domainEn: 'Comfortable Movement',
    items: [
      { index: 6, textJa: '体を動かすことが心地よい', textEn: 'Moving my body feels comfortable.' },
      { index: 7, textJa: '軽快に活動できている', textEn: 'I am able to move and act lightly.' },
      { index: 8, textJa: '日中の活動に活気がある', textEn: 'I feel energetic during my daily activities.' }
    ]
  },
  {
    domainKey: 'kaisho',
    domainJa: '快笑',
    domainEn: 'Smiling & Laughter',
    items: [
      { index: 9, textJa: 'よく笑うことがある', textEn: 'I laugh frequently.' },
      { index: 10, textJa: '笑顔で過ごせている', textEn: 'I spend my time smiling.' },
      { index: 11, textJa: '気持ちよく微笑むことができる', textEn: 'I can smile pleasantly.' }
    ]
  },
  {
    domainKey: 'kairaku',
    domainJa: '快楽',
    domainEn: 'Enjoyment',
    items: [
      { index: 12, textJa: '自分の時間を楽しめている', textEn: 'I enjoy my personal time.' },
      { index: 13, textJa: '充実した楽しいひとときがある', textEn: 'I have fulfilling and enjoyable moments.' },
      { index: 14, textJa: '心から楽しいと思えることがある', textEn: 'There are things I truly enjoy from the heart.' }
    ]
  },
  {
    domainKey: 'kaisei',
    domainJa: '快生',
    domainEn: 'Living Well',
    items: [
      { index: 15, textJa: '自分の生活（人生）に満足している', textEn: 'I am satisfied with my life.' },
      { index: 16, textJa: '充実した毎日を送れている', textEn: 'I am living a fulfilling life every day.' },
      { index: 17, textJa: '生き生きと過ごせている', textEn: 'I am living a vibrant and active life.' }
    ]
  },
];

export const scaleOptions = [
  { val: 1, ja: '全くあてはまらない', en: 'Not at all' },
  { val: 2, ja: 'あまりあてはまらない', en: 'Slightly' },
  { val: 3, ja: 'どちらともいえない', en: 'Moderately' },
  { val: 4, ja: 'まああてはまる', en: 'Very much' },
  { val: 5, ja: '非常にあてはまる', en: 'Extremely' },
];