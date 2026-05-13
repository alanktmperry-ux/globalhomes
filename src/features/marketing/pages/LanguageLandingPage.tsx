import { useParams, Navigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';

type LanguageConfig = {
  englishName: string;
  nativeName: string;
  nativeHeadline: string;
  nativeSubhead: string;
  hreflang: string;
  suburbs: string[];
};

const LANGUAGES: Record<string, LanguageConfig> = {
  mandarin: { englishName: 'Mandarin', nativeName: '普通话', nativeHeadline: '在澳大利亚用普通话搜索房产', nativeSubhead: '澳大利亚首个真正多语言房地产平台', hreflang: 'zh-CN', suburbs: ['Chatswood', 'Hurstville', 'Box Hill', 'Glen Waverley', 'Doncaster'] },
  cantonese: { englishName: 'Cantonese', nativeName: '廣東話', nativeHeadline: '用廣東話喺澳洲搵樓', nativeSubhead: '澳洲第一個真正多語言房地產平台', hreflang: 'zh-HK', suburbs: ['Hurstville', 'Chatswood', 'Box Hill', 'Burwood', 'Cabramatta'] },
  vietnamese: { englishName: 'Vietnamese', nativeName: 'Tiếng Việt', nativeHeadline: 'Tìm kiếm bất động sản Úc bằng tiếng Việt', nativeSubhead: 'Nền tảng bất động sản đa ngôn ngữ đầu tiên tại Úc', hreflang: 'vi', suburbs: ['Cabramatta', 'Bankstown', 'Springvale', 'Richmond', 'Footscray'] },
  korean: { englishName: 'Korean', nativeName: '한국어', nativeHeadline: '한국어로 호주 부동산 검색하기', nativeSubhead: '호주 최초의 진정한 다국어 부동산 플랫폼', hreflang: 'ko', suburbs: ['Strathfield', 'Eastwood', 'Docklands', 'Box Hill', 'Rhodes'] },
  arabic: { englishName: 'Arabic', nativeName: 'العربية', nativeHeadline: 'ابحث عن العقارات في أستراليا باللغة العربية', nativeSubhead: 'أول منصة عقارية متعددة اللغات في أستراليا', hreflang: 'ar', suburbs: ['Lakemba', 'Auburn', 'Bankstown', 'Broadmeadows', 'Dandenong'] },
  hindi: { englishName: 'Hindi', nativeName: 'हिन्दी', nativeHeadline: 'हिंदी में ऑस्ट्रेलिया में संपत्ति खोजें', nativeSubhead: 'ऑस्ट्रेलिया का पहला बहुभाषी संपत्ति मंच', hreflang: 'hi', suburbs: ['Parramatta', 'Truganina', 'Point Cook', 'Blacktown', 'Harris Park'] },
  punjabi: { englishName: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', nativeHeadline: 'ਪੰਜਾਬੀ ਵਿੱਚ ਆਸਟ੍ਰੇਲੀਆ ਵਿੱਚ ਜਾਇਦਾਦ ਲੱਭੋ', nativeSubhead: 'ਆਸਟ੍ਰੇਲੀਆ ਦਾ ਪਹਿਲਾ ਬਹੁਭਾਸ਼ੀ ਪ੍ਰਾਪਰਟੀ ਪਲੇਟਫਾਰਮ', hreflang: 'pa', suburbs: ['Dandenong', 'Truganina', 'Blacktown', 'Werribee', 'Parramatta'] },
  tamil: { englishName: 'Tamil', nativeName: 'தமிழ்', nativeHeadline: 'தமிழில் ஆஸ்திரேலியாவில் சொத்து தேடுங்கள்', nativeSubhead: 'ஆஸ்திரேலியாவின் முதல் பலமொழி சொத்து தளம்', hreflang: 'ta', suburbs: ['Parramatta', 'Blacktown', 'Dandenong', 'Springvale', 'Harris Park'] },
  indonesian: { englishName: 'Indonesian', nativeName: 'Bahasa Indonesia', nativeHeadline: 'Cari properti di Australia dalam Bahasa Indonesia', nativeSubhead: 'Platform properti multibahasa pertama di Australia', hreflang: 'id', suburbs: ['Sydney CBD', 'Melbourne CBD', 'North Sydney', 'Southbank', 'Docklands'] },
  malay: { englishName: 'Malay', nativeName: 'Bahasa Melayu', nativeHeadline: 'Cari hartanah di Australia dalam Bahasa Melayu', nativeSubhead: 'Platform hartanah pelbagai bahasa pertama di Australia', hreflang: 'ms', suburbs: ['Sydney CBD', 'Melbourne CBD', 'Docklands', 'Southbank', 'Chatswood'] },
  thai: { englishName: 'Thai', nativeName: 'ภาษาไทย', nativeHeadline: 'ค้นหาอสังหาริมทรัพย์ในออสเตรเลียเป็นภาษาไทย', nativeSubhead: 'แพลตฟอร์มอสังหาริมทรัพย์หลายภาษาแห่งแรกในออสเตรเลีย', hreflang: 'th', suburbs: ['Sydney CBD', 'Melbourne CBD', 'Surfers Paradise', 'Docklands', 'North Sydney'] },
  filipino: { englishName: 'Filipino', nativeName: 'Filipino', nativeHeadline: 'Maghanap ng ari-arian sa Australia sa Filipino', nativeSubhead: 'Ang unang multilingual na property platform sa Australia', hreflang: 'fil', suburbs: ['Blacktown', 'Parramatta', 'Docklands', 'Dandenong', 'Liverpool'] },
  japanese: { englishName: 'Japanese', nativeName: '日本語', nativeHeadline: '日本語でオーストラリアの不動産を検索', nativeSubhead: 'オーストラリア初の本格的な多言語不動産プラットフォーム', hreflang: 'ja', suburbs: ['Sydney CBD', 'North Sydney', 'Melbourne CBD', 'Docklands', 'Chatswood'] },
  spanish: { englishName: 'Spanish', nativeName: 'Español', nativeHeadline: 'Busca propiedades en Australia en español', nativeSubhead: 'La primera plataforma inmobiliaria multilingüe de Australia', hreflang: 'es', suburbs: ['Sydney CBD', 'Melbourne CBD', 'Brisbane CBD', 'Surfers Paradise', 'Adelaide CBD'] },
  french: { englishName: 'French', nativeName: 'Français', nativeHeadline: 'Recherchez des propriétés en Australie en français', nativeSubhead: "La première plateforme immobilière multilingue d'Australie", hreflang: 'fr', suburbs: ['Sydney CBD', 'Melbourne CBD', 'Double Bay', 'Toorak', 'Brisbane CBD'] },
  portuguese: { englishName: 'Portuguese', nativeName: 'Português', nativeHeadline: 'Pesquise imóveis na Austrália em português', nativeSubhead: 'A primeira plataforma imobiliária multilíngue da Austrália', hreflang: 'pt', suburbs: ['Sydney CBD', 'Melbourne CBD', 'Dandenong', 'Footscray', 'Springvale'] },
  italian: { englishName: 'Italian', nativeName: 'Italiano', nativeHeadline: 'Cerca proprietà in Australia in italiano', nativeSubhead: 'La prima vera piattaforma immobiliare multilingue in Australia', hreflang: 'it', suburbs: ['Carlton', 'Hawthorn', 'Leichhardt', 'Fairfield', 'Thomastown'] },
  greek: { englishName: 'Greek', nativeName: 'Ελληνικά', nativeHeadline: 'Αναζητήστε ακίνητα στην Αυστραλία στα ελληνικά', nativeSubhead: 'Η πρώτη πολύγλωσση πλατφόρμα ακινήτων στην Αυστραλία', hreflang: 'el', suburbs: ['Oakleigh', 'South Yarra', 'Doncaster', 'Marrickville', 'Rockdale'] },
  urdu: { englishName: 'Urdu', nativeName: 'اردو', nativeHeadline: 'اردو میں آسٹریلیا میں جائیداد تلاش کریں', nativeSubhead: 'آسٹریلیا کا پہلا کثیر لسانی پراپرٹی پلیٹ فارم', hreflang: 'ur', suburbs: ['Parramatta', 'Blacktown', 'Auburn', 'Dandenong', 'Lakemba'] },
  bengali: { englishName: 'Bengali', nativeName: 'বাংলা', nativeHeadline: 'বাংলায় অস্ট্রেলিয়ায় সম্পত্তি অনুসন্ধান করুন', nativeSubhead: 'অস্ট্রেলিয়ার প্রথম বহুভাষিক সম্পত্তি প্ল্যাটফর্ম', hreflang: 'bn', suburbs: ['Parramatta', 'Granville', 'Dandenong', 'Blacktown', 'Harris Park'] },
};

export default function LanguageLandingPage() {
  const { lang: slug } = useParams<{ lang: string }>();
  const lang = slug ? LANGUAGES[slug.toLowerCase()] : undefined;

  if (!lang || !slug) return <Navigate to="/" replace />;

  const pageUrl = `https://listhq.com.au/find-property-in-australia/${slug}`;
  const title = `Find Property in Australia in ${lang.englishName} | ListHQ`;
  const description = `Search Australian property listings in ${lang.englishName}. ListHQ is Australia's only property platform built for multicultural buyers — search, save, and connect with multilingual agents in ${lang.englishName}.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Find Property in Australia in ${lang.englishName}`,
    inLanguage: lang.hreflang,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'ListHQ',
      url: 'https://listhq.com.au',
    },
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Hero */}
      <section className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-4xl text-foreground" lang={lang.hreflang}>
            {lang.nativeHeadline}
          </h1>
          <h2 className="text-2xl font-semibold text-primary mt-2">
            Find Property in Australia in {lang.englishName}
          </h2>
          <p className="text-lg text-muted-foreground mt-3" lang={lang.hreflang}>
            {lang.nativeSubhead}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Button asChild size="lg">
              <Link to={`/?lang=${lang.hreflang}`}>Search in {lang.englishName}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/halo/new">Post a Buyer Brief</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Facts */}
      <section className="bg-blue-50 py-16">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="font-bold text-lg text-foreground">30 Languages</div>
            <p className="text-muted-foreground mt-2 text-sm">
              Search, save and enquire in {lang.englishName} — and 29 other languages.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="font-bold text-lg text-foreground">Halo Buyer Briefs</div>
            <p className="text-muted-foreground mt-2 text-sm">
              Post what you want in {lang.englishName}. Matched multilingual agents come to you.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="font-bold text-lg text-foreground">Verified Agents</div>
            <p className="text-muted-foreground mt-2 text-sm">
              Every agent on ListHQ serves multicultural Australian buyers.
            </p>
          </div>
        </div>
      </section>

      {/* Suburbs */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h3 className="font-semibold text-xl mb-6 text-foreground">
            Popular suburbs for {lang.englishName}-speaking buyers
          </h3>
          <div className="flex flex-wrap gap-2">
            {lang.suburbs.map((suburb) => (
              <Link
                key={suburb}
                to={`/?suburb=${encodeURIComponent(suburb)}&lang=${lang.hreflang}`}
                className="inline-flex rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                {suburb}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-primary text-white py-16 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold">Ready to find your home?</h2>
          <div className="mt-6">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white hover:text-primary"
            >
              <Link to={`/?lang=${lang.hreflang}`}>Start searching in {lang.englishName}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
