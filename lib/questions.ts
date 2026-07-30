// lib/questions.ts

// 5段階評価の選択肢（ご指定の文言で固定）
export const scaleOptions = [
  { val: 1, ja: '全くあてはまらない', en: 'Not at all applicable' },
  { val: 2, ja: 'あまりあてはまらない', en: 'Not very applicable' },
  { val: 3, ja: 'どちらともいえない', en: 'Neither' },
  { val: 4, ja: 'まああてはまる', en: 'Somewhat applicable' },
  { val: 5, ja: '非常にあてはまる', en: 'Very applicable' },
];

// 2HFS 6領域・18質問（2HFS正式版として固定・意訳禁止）
export const domainQuestions = [
  {
    domainKey: 'kaishoku',
    domainJa: '快食',
    domainEn: 'Diet',
    items: [
      { index: 0, textJa: '満足感を得られた', textEn: 'I felt satisfied.' },
      { index: 1, textJa: '食事が美味しく楽しく感じた', textEn: 'I found the meals delicious and enjoyable.' },
      { index: 2, textJa: '食事は栄養バランスを心がけた', textEn: 'I kept nutritional balance in mind for my meals.' },
    ]
  },
  {
    domainKey: 'kaimin',
    domainJa: '快眠',
    domainEn: 'Sleep',
    items: [
      { index: 3, textJa: '昨夜は寝つきが良かった', textEn: 'I fell asleep easily last night.' },
      { index: 4, textJa: '朝、気持ちよく目が覚めた', textEn: 'I woke up feeling refreshed this morning.' },
      { index: 5, textJa: '疲れが残らずやる気があった', textEn: 'I felt motivated without lingering fatigue.' },
    ]
  },
  {
    domainKey: 'kaido',
    domainJa: '快動',
    domainEn: 'Activity',
    items: [
      { index: 6, textJa: '三十分程度歩いた', textEn: 'I walked for about thirty minutes.' },
      { index: 7, textJa: '身軽に動くことができた', textEn: 'I was able to move lightly.' },
      { index: 8, textJa: '気持ちのいい汗をかいた', textEn: 'I broke a pleasant sweat.' },
    ]
  },
  {
    domainKey: 'kaisho',
    domainJa: '快笑',
    domainEn: 'Laughter',
    items: [
      { index: 9, textJa: 'よく笑った', textEn: 'I laughed a lot.' },
      { index: 10, textJa: '笑顔でいられた', textEn: 'I was able to keep a smile on my face.' },
      { index: 11, textJa: '微笑ましい出来事があった', textEn: 'There was a heartwarming event.' },
    ]
  },
  {
    domainKey: 'kairaku',
    domainJa: '快楽',
    domainEn: 'Pleasure',
    items: [
      { index: 12, textJa: '趣味・遊びを楽しむ時間を持てた', textEn: 'I had time to enjoy hobbies or play.' },
      { index: 13, textJa: '家族や親しい人との交流があった', textEn: 'I interacted with family or close friends.' },
      { index: 14, textJa: '一日の生活の中で充実感を感じた', textEn: 'I felt a sense of fulfillment in my daily life.' },
    ]
  },
  {
    domainKey: 'kaisei',
    domainJa: '快生',
    domainEn: 'Purpose',
    items: [
      { index: 15, textJa: '自分が好き', textEn: 'I like myself.' },
      { index: 16, textJa: '人に認められて、ほめられて嬉しかった', textEn: 'I was happy to be recognized and praised by others.' },
      { index: 17, textJa: 'よい人生や生活を営んでいると感じた', textEn: 'I felt I was leading a good life.' },
    ]
  }
];