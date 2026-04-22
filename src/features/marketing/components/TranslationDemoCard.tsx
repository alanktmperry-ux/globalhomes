import { useEffect, useRef, useState } from 'react';

type LangKey = 'zh' | 'vi' | 'ar' | 'en';

const LANGS: { key: LangKey; label: string }[] = [
  { key: 'zh', label: '中文' },
  { key: 'vi', label: 'Tiếng Việt' },
  { key: 'ar', label: 'العربية' },
  { key: 'en', label: 'English' },
];

const CONTENT: Record<
  LangKey,
  { title: string; address: string; description: string; chips: string[]; rtl?: boolean }
> = {
  zh: {
    title: '宽敞的家庭住宅，步行可达优质学校',
    address: '南墨尔本，维多利亚州',
    description:
      '这套精心设计的住宅融合了现代生活与传统维多利亚风格，位于顶级学区内...',
    chips: ['近优质中学', '步行至亚洲超市', '华人社区活跃'],
  },
  vi: {
    title: 'Ngôi nhà gia đình rộng rãi, đi bộ đến trường tốt',
    address: 'South Melbourne, VIC',
    description:
      'Căn nhà được thiết kế tinh tế này kết hợp cuộc sống hiện đại...',
    chips: ['Gần trường tốt', 'Cộng đồng Việt Nam'],
  },
  ar: {
    title: 'منزل عائلي فسيح، مشياً إلى المدارس الجيدة',
    address: 'جنوب ملبورن، فيكتوريا',
    description: 'منزل مصمم بعناية يجمع بين الحياة العصرية والطراز الفيكتوري الكلاسيكي...',
    chips: ['قريب من المدارس', 'مجتمع عربي نشط'],
    rtl: true,
  },
  en: {
    title: 'Spacious family home, walking distance to top schools',
    address: 'South Melbourne, VIC',
    description:
      'This beautifully designed home combines modern living with classic Victorian style...',
    chips: ['Top school zone', 'Near Asian grocers', 'Active community'],
  },
};

export function TranslationDemoCard() {
  const [active, setActive] = useState<LangKey>('zh');
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const data = CONTENT[active];

  return (
    <section
      ref={sectionRef}
      className="bg-white py-12 px-6"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      <div className="max-w-[720px] mx-auto">
        <div
          className="bg-white border border-slate-200 shadow-sm overflow-hidden"
          style={{ borderRadius: '12px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-700 truncate">
              3 bed House · South Melbourne VIC · $1.85M
            </span>
            <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-blue-500 text-white text-[11px] font-semibold">
              AI Translated
            </span>
          </div>

          {/* Language switcher */}
          <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-slate-100">
            {LANGS.map((l) => {
              const isActive = l.key === active;
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setActive(l.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="flex gap-4 p-5" dir={data.rtl ? 'rtl' : 'ltr'}>
            <div
              className="shrink-0 bg-slate-200 rounded-lg"
              style={{ width: '160px', height: '110px' }}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900 leading-snug mb-1">
                {data.title}
              </h3>
              <p className="text-xs text-slate-500 mb-2">{data.address}</p>
              <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">
                {data.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ backgroundColor: '#f0f9f4', color: '#166534' }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Every listing automatically translated by AI. No agent effort required.
        </p>
      </div>
    </section>
  );
}
