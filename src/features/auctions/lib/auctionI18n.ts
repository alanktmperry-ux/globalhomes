export type AuctionLang = 'en' | 'zh_simplified' | 'zh_traditional' | 'vi';

const translations = {
  new_bid: {
    en: 'New bid:',
    zh_simplified: '新出价：',
    zh_traditional: '新出價：',
    vi: 'Giá thầu mới:',
  },
  reserve_met: {
    en: 'Reserve met — On the Market!',
    zh_simplified: '底价已达到 — 正式上市！',
    zh_traditional: '底價已達到 — 正式上市！',
    vi: 'Giá sàn đã đạt — Đang bán thị trường!',
  },
  sold: {
    en: 'SOLD:',
    zh_simplified: '已售出：',
    zh_traditional: '已售出：',
    vi: 'Đã bán:',
  },
  upcoming: { en: 'Upcoming', zh_simplified: '即将开始', zh_traditional: '即將開始', vi: 'Sắp diễn ra' },
  live_now: { en: 'Live Now 🔴', zh_simplified: '正在直播 🔴', zh_traditional: '正在直播 🔴', vi: 'Đang diễn ra 🔴' },
  sold_status: { en: 'Sold', zh_simplified: '已售出', zh_traditional: '已售出', vi: 'Đã bán' },
  passed_in: { en: 'Passed In', zh_simplified: '流拍', zh_traditional: '流拍', vi: 'Không bán được' },
  register_to_bid: { en: 'Register to Bid', zh_simplified: '注册竞标', zh_traditional: '註冊競標', vi: 'Đăng ký đấu giá' },
  searching_english: { en: 'Searching in English', zh_simplified: '以英语搜索', zh_traditional: '以英語搜索', vi: 'Tìm kiếm bằng tiếng Anh' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang?: string): string {
  const l = (lang || getPreferredLang()) as AuctionLang;
  return translations[key][l] ?? translations[key].en;
}

export function getPreferredLang(): AuctionLang {
  try {
    const v = localStorage.getItem('preferred_language');
    if (v && ['en', 'zh_simplified', 'zh_traditional', 'vi'].includes(v)) return v as AuctionLang;
  } catch {}
  return 'en';
}

export function setPreferredLang(lang: AuctionLang) {
  try { localStorage.setItem('preferred_language', lang); } catch {}
}

export const LANG_OPTIONS: { value: AuctionLang; flag: string; label: string }[] = [
  { value: 'en', flag: '🇦🇺', label: 'EN' },
  { value: 'zh_simplified', flag: '🇨🇳', label: '普通话' },
  { value: 'zh_traditional', flag: '🇭🇰', label: '廣東話' },
  { value: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
];
