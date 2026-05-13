export type LandingLanguage = {
  slug: string;
  nativeName: string;
  englishName: string;
  isoCode: string;
  heroHeadlineNative: string;
  heroHeadlineEnglish: string;
  heroSubheadEnglish: string;
  popularSuburbs: string[];
  culturalNotes: string[];
  metaTitle: string;
  metaDescription: string;
};

export const LANDING_LANGUAGES: LandingLanguage[] = [
  {
    slug: 'mandarin',
    nativeName: '中文',
    englishName: 'Mandarin',
    isoCode: 'zh',
    heroHeadlineNative: '在澳大利亚买房 — 用您的语言',
    heroHeadlineEnglish: 'Find your home in Australia — in Mandarin',
    heroSubheadEnglish:
      "Australia's only property platform built for Mandarin-speaking buyers. Search listings, message agents, and post a buyer brief — all in Chinese.",
    popularSuburbs: ['Box Hill', 'Glen Waverley', 'Chatswood', 'Eastwood', 'Hurstville', 'Burwood', 'Carlingford'],
    culturalNotes: [
      'Feng shui-friendly properties: north-facing aspects, no T-intersection placement',
      'Top-tier school zones: Balwyn High, James Ruse Agricultural High, North Sydney Boys',
      'Close to Asian grocery, transport, and cultural amenities',
    ],
    metaTitle: 'Buy Property in Australia in Mandarin | 在澳大利亚买房 | ListHQ',
    metaDescription:
      "Australia's only property platform with full Mandarin support. Search listings, find Chinese-speaking agents, and post a buyer brief in 中文.",
  },
];

export function findLandingLanguage(slug?: string): LandingLanguage | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  return LANDING_LANGUAGES.find((l) => l.slug === s);
}
