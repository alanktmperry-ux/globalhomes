export type DetectedLanguage = 'en' | 'zh' | 'ko' | 'ar' | 'hi' | 'th' | 'unknown';

const RANGES: Array<{ lang: Exclude<DetectedLanguage, 'en' | 'unknown'>; re: RegExp }> = [
  { lang: 'zh', re: /[\u3400-\u4dbf\u4e00-\u9fff]/g },
  { lang: 'ko', re: /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g },
  { lang: 'ar', re: /[\u0600-\u06ff\u0750-\u077f]/g },
  { lang: 'hi', re: /[\u0900-\u097f]/g },
  { lang: 'th', re: /[\u0e00-\u0e7f]/g },
];

export function detectLanguage(input: string): DetectedLanguage {
  if (!input || !input.trim()) return 'unknown';

  const nonSpace = input.replace(/\s/g, '');
  const total = nonSpace.length;
  if (total === 0) return 'unknown';

  let best: { lang: DetectedLanguage; ratio: number } = { lang: 'en', ratio: 0 };
  for (const { lang, re } of RANGES) {
    const matches = nonSpace.match(re);
    const ratio = matches ? matches.length / total : 0;
    if (ratio > best.ratio) best = { lang, ratio };
  }

  return best.ratio >= 0.1 ? best.lang : 'en';
}
