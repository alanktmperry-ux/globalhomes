import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logApiUsage, costFor } from "../_shared/usageLog.ts";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";

let corsHeaders: Record<string, string> = getCorsHeaders(null);

// ─────────────────────────────────────────────────────────────────────────────
// Real-estate glossary — INLINE COPY of src/shared/lib/i18n/glossary.ts.
// Edge functions cannot import from src/, so this is intentionally duplicated
// for Phase 1B. Keep in sync with the source file.
// ─────────────────────────────────────────────────────────────────────────────
type GlossarySupportedLanguage =
  | 'zh_simplified' | 'zh_traditional' | 'vi' | 'ko' | 'ar' | 'hi' | 'bn'
  | 'pa' | 'ta' | 'ja' | 'id' | 'ms' | 'th' | 'tl' | 'it' | 'es' | 'fr'
  | 'pt' | 'ru' | 'el';

type GlossaryEntry = {
  source: string;
  translations: Partial<Record<GlossarySupportedLanguage, string>>;
};

const REAL_ESTATE_GLOSSARY: GlossaryEntry[] = [
  // Sale process
  { source: 'OFI',                      translations: { zh_simplified: '开放参观', zh_traditional: '開放參觀', vi: 'Mở tham quan', ko: '공개 관람', ar: 'افتح للتفتيش', hi: 'खुला निरीक्षण', bn: 'খোলা পরিদর্শন', ja: '公開内覧', id: 'Buka untuk Inspeksi', ms: 'Buka untuk Pemeriksaan', th: 'เปิดให้ตรวจสอบ', tl: 'Bukas para sa Inspeksiyon', it: 'Apertura per Visita', es: 'Visita Abierta', fr: 'Visite Libre', pt: 'Visita Aberta', ru: 'Открытый осмотр', el: 'Ανοιχτή Επιθεώρηση' } },
  { source: 'open home',                translations: { zh_simplified: '开放参观', zh_traditional: '開放參觀', vi: 'Mở tham quan nhà', ko: '오픈 하우스', ar: 'منزل مفتوح للزيارة', hi: 'खुला घर', bn: 'খোলা বাড়ি', ja: 'オープンハウス', id: 'Open House', ms: 'Open House', th: 'เปิดบ้านให้ชม', tl: 'Open House', it: 'Casa Aperta', es: 'Casa Abierta', fr: 'Portes Ouvertes', pt: 'Casa Aberta', ru: 'День открытых дверей', el: 'Ανοιχτό Σπίτι' } },
  { source: 'off-market',               translations: { zh_simplified: '内部销售', zh_traditional: '內部銷售', vi: 'Bán riêng', ko: '비공개 매물', ar: 'خارج السوق', hi: 'ऑफ-मार्केट', bn: 'অফ-মার্কেট', ja: '非公開物件', id: 'Off-market', ms: 'Off-market', th: 'นอกตลาด', tl: 'Off-market', it: 'Fuori Mercato', es: 'Fuera de Mercado', fr: 'Hors Marché', pt: 'Fora do Mercado', ru: 'Вне рынка', el: 'Εκτός Αγοράς' } },
  { source: 'vendor',                   translations: { zh_simplified: '卖方', zh_traditional: '賣方', vi: 'Người bán', ko: '매도인', ar: 'البائع', hi: 'विक्रेता', bn: 'বিক্রেতা', ja: '売主', id: 'Penjual', ms: 'Penjual', th: 'ผู้ขาย', tl: 'Nagbebenta', it: 'Venditore', es: 'Vendedor', fr: 'Vendeur', pt: 'Vendedor', ru: 'Продавец', el: 'Πωλητής' } },
  { source: 'EOI',                      translations: { zh_simplified: '意向书', zh_traditional: '意向書', vi: 'Bày tỏ quan tâm', ko: '관심표명', ar: 'تعبير عن الاهتمام', hi: 'रुचि की अभिव्यक्ति', bn: 'আগ্রহ প্রকাশ', ja: '関心表明', id: 'Pernyataan Minat', ms: 'Pernyataan Minat', th: 'การแสดงความสนใจ', tl: 'Pagpapahayag ng Interes', it: "Manifestazione d'Interesse", es: 'Expresión de Interés', fr: "Expression d'Intérêt", pt: 'Expressão de Interesse', ru: 'Выражение интереса', el: 'Εκδήλωση Ενδιαφέροντος' } },
  { source: 'expressions of interest',  translations: { zh_simplified: '征求意向书', zh_traditional: '徵求意向書', vi: 'Bày tỏ quan tâm', ko: '관심표명 모집', ar: 'طلب تعابير الاهتمام', hi: 'रुचि की अभिव्यक्ति', bn: 'আগ্রহ প্রকাশ', ja: '関心表明募集', id: 'Pernyataan Minat', ms: 'Pernyataan Minat', th: 'การแสดงความสนใจ', tl: 'Pagpapahayag ng Interes', it: "Manifestazioni d'Interesse", es: 'Expresiones de Interés', fr: "Expressions d'Intérêt", pt: 'Expressões de Interesse', ru: 'Выражение интереса', el: 'Εκδηλώσεις Ενδιαφέροντος' } },
  { source: 'contract of sale',         translations: { zh_simplified: '销售合同', zh_traditional: '銷售合同', vi: 'Hợp đồng mua bán', ko: '매매 계약서', ar: 'عقد البيع', hi: 'बिक्री अनुबंध', bn: 'বিক্রয় চুক্তি', ja: '売買契約書', id: 'Kontrak Jual Beli', ms: 'Kontrak Jualan', th: 'สัญญาซื้อขาย', tl: 'Kontrata sa Pagbebenta', it: 'Contratto di Vendita', es: 'Contrato de Venta', fr: 'Contrat de Vente', pt: 'Contrato de Venda', ru: 'Договор купли-продажи', el: 'Συμβόλαιο Πώλησης' } },
  { source: 'settlement',               translations: { zh_simplified: '过户结算', zh_traditional: '過戶結算', vi: 'Thanh toán bàn giao', ko: '잔금 정산', ar: 'التسوية', hi: 'सेटलमेंट', bn: 'সেটেলমেন্ট', ja: '決済', id: 'Settlement', ms: 'Penyelesaian', th: 'การชำระบัญชี', tl: 'Settlement', it: 'Rogito', es: 'Liquidación', fr: 'Acte Notarié', pt: 'Liquidação', ru: 'Расчёт', el: 'Διακανονισμός' } },
  { source: 'settlement period',        translations: { zh_simplified: '过户期', zh_traditional: '過戶期', vi: 'Thời hạn thanh toán', ko: '잔금 정산 기간', ar: 'فترة التسوية', hi: 'सेटलमेंट अवधि', bn: 'সেটেলমেন্ট সময়কাল', ja: '決済期間', id: 'Periode Settlement', ms: 'Tempoh Penyelesaian', th: 'ระยะเวลาการชำระบัญชี', tl: 'Settlement Period', it: 'Periodo di Rogito', es: 'Período de Liquidación', fr: 'Période de Règlement', pt: 'Período de Liquidação', ru: 'Срок расчёта', el: 'Περίοδος Διακανονισμού' } },
  { source: 'auction',                  translations: { zh_simplified: '拍卖', zh_traditional: '拍賣', vi: 'Đấu giá', ko: '경매', ar: 'مزاد', hi: 'नीलामी', bn: 'নিলাম', ja: 'オークション', id: 'Lelang', ms: 'Lelongan', th: 'ประมูล', tl: 'Auksyon', it: 'Asta', es: 'Subasta', fr: 'Vente aux Enchères', pt: 'Leilão', ru: 'Аукцион', el: 'Δημοπρασία' } },
  { source: 'private sale',             translations: { zh_simplified: '私人销售', zh_traditional: '私人銷售', vi: 'Bán tư nhân', ko: '개인 매매', ar: 'بيع خاص', hi: 'निजी बिक्री', bn: 'প্রাইভেট সেল', ja: '相対取引', id: 'Penjualan Pribadi', ms: 'Jualan Persendirian', th: 'การขายส่วนตัว', tl: 'Pribadong Pagbebenta', it: 'Vendita Privata', es: 'Venta Privada', fr: 'Vente Privée', pt: 'Venda Privada', ru: 'Частная продажа', el: 'Ιδιωτική Πώληση' } },
  { source: 'under offer',              translations: { zh_simplified: '已收到报价', zh_traditional: '已收到報價', vi: 'Đã nhận đề nghị', ko: '제안 접수중', ar: 'قيد العرض', hi: 'ऑफर के तहत', bn: 'অফার অধীনে', ja: '申込検討中', id: 'Sedang Ditawarkan', ms: 'Di Bawah Tawaran', th: 'อยู่ระหว่างข้อเสนอ', tl: 'May Alok', it: 'Sotto Offerta', es: 'En Negociación', fr: 'Sous Offre', pt: 'Sob Oferta', ru: 'В процессе сделки', el: 'Υπό Προσφορά' } },
  { source: 'under contract',           translations: { zh_simplified: '已签约', zh_traditional: '已簽約', vi: 'Đã ký hợp đồng', ko: '계약 체결됨', ar: 'تحت العقد', hi: 'अनुबंध के तहत', bn: 'কন্ট্রাক্টের অধীনে', ja: '契約済み', id: 'Sudah Berkontrak', ms: 'Di Bawah Kontrak', th: 'ทำสัญญาแล้ว', tl: 'May Kontrata Na', it: 'In Contratto', es: 'En Contrato', fr: 'Sous Contrat', pt: 'Sob Contrato', ru: 'По договору', el: 'Σε Συμβόλαιο' } },

  // Strata / legal
  { source: 'strata',                   translations: { zh_simplified: '业主立案法团', zh_traditional: '業主立案法團', vi: 'Quản lý chung cư', ko: '구분소유', ar: 'الملكية المشتركة', hi: 'स्ट्रेटा', bn: 'স্ট্র্যাটা', ja: '区分所有', id: 'Strata', ms: 'Strata', th: 'นิติบุคคลอาคารชุด', tl: 'Strata', it: 'Condominio', es: 'Régimen de Propiedad Horizontal', fr: 'Copropriété', pt: 'Condomínio', ru: 'Общая собственность', el: 'Συγκυριότητα' } },
  { source: 'body corporate',           translations: { zh_simplified: '业主立案法团', zh_traditional: '業主立案法團', vi: 'Hội đồng quản trị chung cư', ko: '관리단', ar: 'الاتحاد العقاري', hi: 'सोसाइटी', bn: 'বডি কর্পোরেট', ja: '管理組合', id: 'Body Corporate', ms: 'Body Corporate', th: 'นิติบุคคล', tl: 'Body Corporate', it: 'Amministrazione Condominiale', es: 'Comunidad de Propietarios', fr: 'Syndicat de Copropriété', pt: 'Condomínio', ru: 'Товарищество собственников', el: 'Διαχείριση Πολυκατοικίας' } },
  { source: 'owners corporation',       translations: { zh_simplified: '业主立案法团', zh_traditional: '業主立案法團', vi: 'Hội đồng chủ sở hữu', ko: '구분소유자 조합', ar: 'اتحاد الملاك', hi: 'मालिक निगम', bn: 'মালিক কর্পোরেশন', ja: '所有者組合', id: 'Owners Corporation', ms: 'Pertubuhan Pemilik', th: 'นิติบุคคลเจ้าของ', tl: 'Owners Corporation', it: 'Amministrazione Condominiale', es: 'Comunidad de Propietarios', fr: 'Syndicat de Copropriété', pt: 'Associação de Proprietários', ru: 'Товарищество собственников', el: 'Σωματείο Ιδιοκτητών' } },
  { source: 'FIRB',                     translations: { zh_simplified: 'FIRB（澳洲外国投资审查委员会）', zh_traditional: 'FIRB（澳洲外國投資審查委員會）', vi: 'FIRB (Hội đồng Xét duyệt Đầu tư Nước ngoài)', ko: 'FIRB (외국인투자심사위원회)', ar: 'FIRB (مجلس مراجعة الاستثمار الأجنبي)', hi: 'FIRB (विदेशी निवेश समीक्षा बोर्ड)', bn: 'FIRB (বিদেশী বিনিয়োগ পর্যালোচনা বোর্ড)', ja: 'FIRB (外国投資審査委員会)', id: 'FIRB (Dewan Tinjauan Investasi Asing)', ms: 'FIRB (Lembaga Kajian Pelaburan Asing)', th: 'FIRB (คณะกรรมการตรวจสอบการลงทุนต่างชาติ)', tl: 'FIRB', it: 'FIRB (Consiglio di Revisione Investimenti Esteri)', es: 'FIRB (Junta de Revisión de Inversión Extranjera)', fr: "FIRB (Conseil d'Examen des Investissements Étrangers)", pt: 'FIRB (Conselho de Revisão de Investimento Estrangeiro)', ru: 'FIRB (Совет по проверке иностранных инвестиций)', el: 'FIRB (Συμβούλιο Ελέγχου Ξένων Επενδύσεων)' } },
  { source: 'conveyancer',              translations: { zh_simplified: '房产过户师', zh_traditional: '房產過戶師', vi: 'Luật sư bất động sản', ko: '부동산 양도 전문가', ar: 'محامي نقل الملكية', hi: 'कन्वेंसर', bn: 'প্রপার্টি কনভেয়েন্সার', ja: 'コンベヤンサー', id: 'Conveyancer', ms: 'Conveyancer', th: 'นักโอนกรรมสิทธิ์', tl: 'Conveyancer', it: 'Notaio', es: 'Gestor de Traspaso', fr: 'Notaire', pt: 'Despachante Imobiliário', ru: 'Специалист по передаче недвижимости', el: 'Συμβολαιογράφος' } },
  { source: 'cooling-off period',       translations: { zh_simplified: '冷静期', zh_traditional: '冷靜期', vi: 'Thời gian chờ', ko: '숙려 기간', ar: 'فترة التراجع', hi: 'कूलिंग ऑफ अवधि', bn: 'কুলিং অফ পিরিয়ড', ja: 'クーリングオフ期間', id: 'Periode Cooling-off', ms: 'Tempoh Cooling-off', th: 'ระยะเวลายกเลิก', tl: 'Cooling-off Period', it: 'Diritto di Recesso', es: 'Período de Reflexión', fr: 'Délai de Rétractation', pt: 'Período de Reflexão', ru: 'Период отзыва', el: 'Περίοδος Υπαναχώρησης' } },

  // Cost / government
  { source: 'stamp duty',               translations: { zh_simplified: '印花税', zh_traditional: '印花稅', vi: 'Thuế trước bạ', ko: '인지세', ar: 'رسم الطابع', hi: 'स्टाम्प शुल्क', bn: 'স্ট্যাম্প ডিউটি', ja: '印紙税', id: 'Bea Materai Properti', ms: 'Duti Setem', th: 'อากรแสตมป์', tl: 'Stamp Duty', it: "Imposta di Registro", es: 'Impuesto de Transmisiones', fr: "Droits d'Enregistrement", pt: 'Imposto de Selo', ru: 'Гербовый сбор', el: 'Φόρος Μεταβίβασης' } },
  { source: 'transfer duty',            translations: { zh_simplified: '过户税', zh_traditional: '過戶稅', vi: 'Thuế chuyển nhượng', ko: '취득세', ar: 'رسم النقل', hi: 'हस्तांतरण शुल्क', bn: 'ট্রান্সফার ডিউটি', ja: '移転税', id: 'Bea Pengalihan', ms: 'Duti Pemindahan', th: 'อากรการโอน', tl: 'Transfer Duty', it: "Imposta di Trasferimento", es: 'Impuesto de Transmisión', fr: 'Droit de Mutation', pt: 'Imposto de Transferência', ru: 'Налог на передачу', el: 'Φόρος Μεταβίβασης' } },
  { source: 'foreign buyer surcharge',  translations: { zh_simplified: '海外买家附加税', zh_traditional: '海外買家附加稅', vi: 'Phụ phí người mua nước ngoài', ko: '외국인 추가세', ar: 'الرسم الإضافي للمشتري الأجنبي', hi: 'विदेशी खरीदार अधिभार', bn: 'বিদেশী ক্রেতা সারচার্জ', ja: '外国人購入者追加税', id: 'Pajak Tambahan Pembeli Asing', ms: 'Caj Tambahan Pembeli Asing', th: 'ค่าธรรมเนียมเพิ่มผู้ซื้อต่างชาติ', tl: 'Foreign Buyer Surcharge', it: "Sovrattassa Acquirente Estero", es: 'Recargo Comprador Extranjero', fr: 'Surtaxe Acheteur Étranger', pt: 'Sobretaxa Comprador Estrangeiro', ru: 'Доплата для иностранных покупателей', el: 'Επιπλέον Φόρος Ξένου Αγοραστή' } },
  { source: 'FHOG',                     translations: { zh_simplified: '首次置业补贴', zh_traditional: '首次置業補貼', vi: 'Trợ cấp Người mua nhà Lần đầu', ko: '첫 주택 구매자 지원금', ar: 'منحة المشتري الأول', hi: 'पहले घर के मालिक का अनुदान', bn: 'প্রথম গৃহকর্তা অনুদান', ja: '初回購入者補助金', id: 'Hibah Pembeli Rumah Pertama', ms: 'Geran Pemilik Rumah Pertama', th: 'เงินช่วยเหลือผู้ซื้อบ้านครั้งแรก', tl: 'First Home Owner Grant', it: "Contributo Primo Acquisto Casa", es: 'Subsidio Primer Comprador', fr: "Aide Premier Acheteur", pt: 'Subsídio Primeiro Comprador', ru: 'Грант первому покупателю жилья', el: 'Επιδότηση Πρώτης Κατοικίας' } },

  // Building / inspection
  { source: 'building inspection',      translations: { zh_simplified: '房屋检查', zh_traditional: '房屋檢查', vi: 'Kiểm tra công trình', ko: '건물 점검', ar: 'فحص البناء', hi: 'भवन निरीक्षण', bn: 'বিল্ডিং পরিদর্শন', ja: '建物検査', id: 'Inspeksi Bangunan', ms: 'Pemeriksaan Bangunan', th: 'ตรวจสอบอาคาร', tl: 'Building Inspection', it: 'Ispezione Edificio', es: 'Inspección de Edificio', fr: 'Inspection du Bâtiment', pt: 'Inspeção do Edifício', ru: 'Осмотр здания', el: 'Επιθεώρηση Κτιρίου' } },
  { source: 'pest inspection',          translations: { zh_simplified: '害虫检查', zh_traditional: '害蟲檢查', vi: 'Kiểm tra mối mọt', ko: '해충 점검', ar: 'فحص الآفات', hi: 'कीट निरीक्षण', bn: 'কীটপতঙ্গ পরিদর্শন', ja: '害虫検査', id: 'Inspeksi Hama', ms: 'Pemeriksaan Perosak', th: 'ตรวจสอบแมลง', tl: 'Pest Inspection', it: 'Ispezione Antiparassitaria', es: 'Inspección de Plagas', fr: 'Inspection des Nuisibles', pt: 'Inspeção de Pragas', ru: 'Осмотр на вредителей', el: 'Επιθεώρηση Παρασίτων' } },
  { source: 'subject to finance',       translations: { zh_simplified: '以贷款审批为条件', zh_traditional: '以貸款審批為條件', vi: 'Tùy thuộc tài chính', ko: '대출 승인 조건부', ar: 'مشروط بالتمويل', hi: 'वित्त के अधीन', bn: 'অর্থায়ন সাপেক্ষে', ja: '融資条件付き', id: 'Tergantung Pembiayaan', ms: 'Tertakluk kepada Pembiayaan', th: 'ขึ้นอยู่กับการเงิน', tl: 'Subject to Finance', it: 'Subordinato a Finanziamento', es: 'Sujeto a Financiación', fr: 'Sous Réserve de Financement', pt: 'Sujeito a Financiamento', ru: 'При условии финансирования', el: 'Υπό Χρηματοδότηση' } },
  { source: 'section 32',               translations: { zh_simplified: '第32条卖方声明', zh_traditional: '第32條賣方聲明', vi: 'Tuyên bố Mục 32', ko: 'Section 32 (매도인 진술서)', ar: 'بيان القسم 32', hi: 'सेक्शन 32 स्टेटमेंट', bn: 'সেকশন 32 স্টেটমেন্ট', ja: 'セクション32（売主開示）', id: 'Pernyataan Section 32', ms: 'Pernyataan Seksyen 32', th: 'แถลงการณ์ Section 32', tl: 'Section 32 Statement', it: 'Dichiarazione Sezione 32', es: 'Declaración Sección 32', fr: 'Déclaration Section 32', pt: 'Declaração Seção 32', ru: 'Декларация Раздел 32', el: 'Δήλωση Άρθρο 32' } },
];

/**
 * Pre-process: replace glossary source terms with sentinels.
 * Returns { processed text, list of replacements }.
 */
function applyGlossarySentinels(
  text: string,
): { text: string; replacements: Array<{ sentinel: string; entry: GlossaryEntry }> } {
  if (!text) return { text: text || '', replacements: [] };
  let out = text;
  const replacements: Array<{ sentinel: string; entry: GlossaryEntry }> = [];
  let counter = 0;
  // Sort by source length descending so longer phrases match first
  // ("settlement period" before "settlement").
  const sortedEntries = [...REAL_ESTATE_GLOSSARY].sort((a, b) => b.source.length - a.source.length);
  for (const entry of sortedEntries) {
    const sentinel = `<<G:${counter}>>`;
    const pattern = new RegExp(
      `\\b${entry.source.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`,
      'gi',
    );
    if (pattern.test(out)) {
      replacements.push({ sentinel, entry });
      out = out.replace(pattern, sentinel);
      counter++;
    }
  }
  return { text: out, replacements };
}

/**
 * Post-process: replace sentinels with curated translations for target language.
 * Falls back to English source if no translation exists for that language.
 */
function restoreGlossarySentinels(
  translatedText: string,
  replacements: Array<{ sentinel: string; entry: GlossaryEntry }>,
  targetLang: string,
): string {
  if (!translatedText) return translatedText;
  let out = translatedText;
  for (const { sentinel, entry } of replacements) {
    const replacement =
      entry.translations[targetLang as GlossarySupportedLanguage] ?? entry.source;
    out = out.split(sentinel).join(replacement);
  }
  if (/<<G:\d+>>/.test(out)) {
    console.warn('Glossary sentinels leaked:', out.match(/<<G:\d+>>/g));
  }
  return out;
}


async function checkIpRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  ip: string,
  action: string,
  maxPerMinute: number,
  maxPerDay: number
): Promise<{ allowed: boolean; reason?: string }> {
  const nowMinuteBucket = Math.floor(Date.now() / 60000);
  const nowDayBucket = Math.floor(Date.now() / 86400000);

  const { count: minuteCount } = await supabaseAdmin
    .from('api_usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('action', action)
    .eq('metadata->>ip', ip)
    .gte('created_at', new Date(nowMinuteBucket * 60000).toISOString());
  if ((minuteCount ?? 0) >= maxPerMinute) {
    return { allowed: false, reason: 'minute_limit' };
  }

  const { count: dayCount } = await supabaseAdmin
    .from('api_usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('action', action)
    .eq('metadata->>ip', ip)
    .gte('created_at', new Date(nowDayBucket * 86400000).toISOString());
  if ((dayCount ?? 0) >= maxPerDay) {
    return { allowed: false, reason: 'day_limit' };
  }

  return { allowed: true };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAI(systemPrompt: string, userPrompt: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [],
      response_format: { type: "json_object" },
    }),
  });

  if (resp.status === 429) throw new Error("RATE_LIMITED");
  if (resp.status === 402) throw new Error("CREDITS_EXHAUSTED");
  if (!resp.ok) {
    const text = await resp.text();
    console.error("AI gateway error:", resp.status, text);
    throw new Error(`AI gateway returned ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in AI response");

  const promptTokens = Number(data?.usage?.prompt_tokens ?? 0);
  const completionTokens = Number(data?.usage?.completion_tokens ?? 0);
  const totalTokens =
    Number(data?.usage?.total_tokens ?? promptTokens + completionTokens) ||
    Math.ceil((systemPrompt.length + userPrompt.length + content.length) / 4);

  await logApiUsage({
    service: "gemini",
    action: "listing_translate",
    units: totalTokens,
    cost_estimate: costFor.gemini(totalTokens),
    metadata: { model: MODEL, prompt_tokens: promptTokens, completion_tokens: completionTokens },
  });

  return JSON.parse(content);
}

async function handleListingTranslation(listingId: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: listing, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", listingId)
    .single();

  if (error || !listing) {
    return jsonResponse({ error: "Listing not found" }, 404);
  }

  // ── Glossary pre-processing: replace AU real-estate terms with sentinels ──
  // The AI sees `<<G:0>>` instead of "OFI" / "settlement" etc. and is told
  // to copy them verbatim. After translation we restore them per-language
  // with curated terminology.
  const titleSent = applyGlossarySentinels(listing.title || "");
  const descSent = applyGlossarySentinels(listing.description || "");
  // Combined replacements list for restoration (sentinels are unique across both).
  const allReplacements = [...titleSent.replacements, ...descSent.replacements];

  const systemPrompt = `You are a multilingual real estate translation specialist for the Australian property market. You produce culturally sensitive, accurate translations. Return valid JSON only.

GLOSSARY SENTINELS: The input may contain placeholder tokens of the form <<G:N>> (where N is a digit). These are sentinels for domain-specific real-estate terms. You MUST copy each sentinel verbatim into every translated field — do not translate, modify, drop, or reformat them. They will be replaced post-process with curated translations.`;

  const userPrompt = `Translate and analyse this Australian property listing. Return a single JSON object with two top-level keys: "translations" and "agent_insights".

LISTING DATA:
- Title: ${titleSent.text || "N/A"}
- Address: ${listing.address || "N/A"}, ${listing.suburb || ""} ${listing.state || ""} ${listing.postcode || ""}
- Description: ${descSent.text || "No description"}
- Property Type: ${listing.property_type || "House"}
- Beds: ${listing.beds || 0}, Baths: ${listing.baths || 0}, Parking: ${listing.parking || 0}
- Price: ${listing.price ? `$${listing.price.toLocaleString()}` : "Contact agent"}
- Land Size: ${listing.land_size ? `${listing.land_size}sqm` : "N/A"}
- Features: ${listing.features ? JSON.stringify(listing.features) : "None listed"}
- Year Built: ${listing.year_built || "N/A"}

TRANSLATIONS — provide for each of these language keys: "zh_simplified" (Simplified Chinese), "zh_traditional" (Traditional Chinese), "vi" (Vietnamese), "ko" (Korean), "ar" (Arabic), "ja" (Japanese), "hi" (Hindi), "pa" (Punjabi - Gurmukhi script), "ta" (Tamil), "bn" (Bengali), "tl" (Tagalog/Filipino), "id" (Indonesian), "ms" (Malay), "th" (Thai), "ne" (Nepali - Devanagari script), "si" (Sinhala), "el" (Greek), "it" (Italian), "es" (Spanish - Australian/international context), "fa" (Farsi/Persian - right-to-left)
Each language must contain:
- title: translated property title
- description: full translated description (natural, not word-for-word)
- summary: 1-2 sentence highlight summary
- cultural_highlights: array of strings noting culturally relevant features ONLY if genuinely applicable (e.g. feng shui orientation, school proximity, multigenerational layout, garden space). Never fabricate cultural relevance.
For Indian-buyer-relevant features specifically, consider noting (only when genuinely applicable):
- Vastu-compliant orientation (north or east-facing entrance)
- Multigenerational layout potential (separate living wings, granny flat, ground-floor bedroom)
- Proximity to Hindu temples, Sikh gurdwaras, Indian grocers, sweet shops, or Indian restaurants
- Proximity to high-performing schools and tutoring/coaching centres (a major Indian-Australian buyer priority)
- Vegetarian-friendly kitchen layout (separate stove space, large pantry)
- Distance to Indian community centres or cultural associations
For Tamil buyers specifically, also consider proximity to South Indian temples and Carnatic music/dance schools where genuinely nearby.

CRITICAL: All 20 language keys MUST be present in the "translations" object. For Arabic, ensure right-to-left natural phrasing. For Hindi, Punjabi, Tamil, and Bengali, use natural Indian-Australian property terminology where appropriate. Use 'lakh' and 'crore' phrasing for Indian buyers when prices fit those denominations, alongside the AUD figure.
REMINDER: Preserve every <<G:N>> sentinel verbatim in every translated title, description, and summary.

AGENT INSIGHTS — in English, under key "agent_insights":
- multicultural_appeal: string describing the property's appeal to multicultural buyers
- suggested_buyer_profiles: array of strings (e.g. "Young Mandarin-speaking professionals", "Vietnamese families seeking school catchments", "Punjabi-Sikh families seeking western Sydney/Melbourne growth corridors", "Hindi-speaking IT professionals in Sydney North Shore or Melbourne south-east", "Tamil families prioritising school catchments", "Bengali-speaking professional couples")
- key_selling_points_for_diverse_buyers: array of strings

Return ONLY valid JSON. No markdown, no code fences.`;

  const result = await callAI(systemPrompt, userPrompt);

  // ── Glossary post-processing: restore sentinels per language ──
  if (result.translations && typeof result.translations === "object" && allReplacements.length > 0) {
    for (const [langCode, langBlock] of Object.entries(result.translations as Record<string, any>)) {
      if (!langBlock || typeof langBlock !== "object") continue;
      for (const field of ["title", "description", "summary"]) {
        if (typeof langBlock[field] === "string") {
          langBlock[field] = restoreGlossarySentinels(langBlock[field], allReplacements, langCode);
        }
      }
      if (Array.isArray(langBlock.cultural_highlights)) {
        langBlock.cultural_highlights = langBlock.cultural_highlights.map((s: unknown) =>
          typeof s === "string" ? restoreGlossarySentinels(s, allReplacements, langCode) : s,
        );
      }
    }
  }

  // Read existing translations so manually-entered ones are not overwritten
  const { data: existing } = await supabase
    .from("properties")
    .select("translations")
    .eq("id", listingId)
    .maybeSingle();
  const existingTrans = (existing?.translations as Record<string, unknown> | null) ?? {};
  // Merge: existing keys take priority (agent's manual entries win over AI)
  const mergedTranslations = { ...result.translations, ...existingTrans };

  const { error: updateError } = await supabase
    .from("properties")
    .update({
      translations: mergedTranslations,
      agent_insights: result.agent_insights,
      translation_status: "complete",
      translations_generated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (updateError) {
    console.error("DB update error:", updateError);
    return jsonResponse({ error: "Failed to save translations" }, 500);
  }

  return jsonResponse({
    success: true,
    listing_id: listingId,
    translations: result.translations,
    agent_insights: result.agent_insights,
  });
}

const LANGUAGE_LABELS: Record<string, string> = {
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  "ja": "Japanese",
  "ko": "Korean",
};

async function handleTextTranslation(input: {
  title: string;
  description: string;
  bullets: string[];
  target_language: string;
}) {
  const langLabel = LANGUAGE_LABELS[input.target_language] || input.target_language;
  const systemPrompt = `You are a multilingual real estate translation specialist for the Australian property market. You produce culturally sensitive, natural translations (not word-for-word). Return valid JSON only.`;
  const userPrompt = `Translate the following Australian property listing fields into ${langLabel}.

ENGLISH TITLE: ${input.title || "(empty)"}
ENGLISH DESCRIPTION: ${input.description || "(empty)"}
${input.bullets.length > 0 ? `KEY BULLETS:\n${input.bullets.map((b) => `- ${b}`).join("\n")}` : ""}

Return JSON with exactly these keys:
- "title": translated title (concise, max 120 chars)
- "description": translated description (natural prose, preserve key features)

Return ONLY valid JSON. No markdown, no code fences.`;

  const result = await callAI(systemPrompt, userPrompt);
  return jsonResponse({
    title: result.title || "",
    description: result.description || "",
    target_language: input.target_language,
  });
}

async function handleTemplateTranslation(input: {
  source_text: string;
  source_subject?: string | null;
  target_languages: string[];
}) {
  // Map our app language codes -> human labels for prompt
  const LABELS: Record<string, string> = {
    zh_simplified: "Chinese (Simplified)",
    zh_traditional: "Chinese (Traditional)",
    vi: "Vietnamese",
  };
  const targets = (input.target_languages || []).filter((l) => LABELS[l]);
  if (targets.length === 0) {
    return jsonResponse({ error: "No supported target_languages provided" }, 400);
  }

  const systemPrompt = `You are a multilingual translator for an Australian real estate CRM. Translate short marketing/communication templates while PRESERVING any merge tags exactly as written, including the double curly braces (e.g. {{contact.first_name}}, {{property.address}}). Do not translate, alter, or wrap merge tags. Keep tone friendly and professional. Return valid JSON only.`;

  const langList = targets.map((l) => `- ${l}: ${LABELS[l]}`).join("\n");
  const userPrompt = `Translate the following message template${input.source_subject ? " (with subject)" : ""} from English into the languages below. Preserve all {{merge.tags}} verbatim.

LANGUAGES:
${langList}

ENGLISH BODY:
"""
${input.source_text}
"""
${input.source_subject ? `\nENGLISH SUBJECT: "${input.source_subject}"\n` : ""}

Return JSON with exactly these top-level keys:
- "bodies": object keyed by the language codes above, value = translated body
${input.source_subject ? `- "subjects": object keyed by the language codes above, value = translated subject` : ""}

Return ONLY valid JSON.`;

  const result = await callAI(systemPrompt, userPrompt);
  return jsonResponse({
    bodies: result.bodies || {},
    subjects: result.subjects || {},
  });
}

async function handleSearchTranslation(searchQuery: string, ip: string) {
  const systemPrompt = `You are a multilingual search query translator for an Australian real estate platform. Detect the input language, translate to English, and identify search intent. Return valid JSON only.`;

  const userPrompt = `Translate this property search query to English and analyse it:

"${searchQuery}"

Return JSON with:
- english_query: the query translated to natural English
- detected_language: ISO language code (e.g. "zh", "vi", "en", "ko", "ja", "ar")
- search_intent: object with optional keys: location, property_type, min_beds, max_price, features (array), other_criteria

Return ONLY valid JSON.`;

  const result = await callAI(systemPrompt, userPrompt);

  await logApiUsage({
    service: 'gemini',
    action: 'translate_search',
    units: 1,
    cost_estimate: 0,
    metadata: { ip, query_length: searchQuery.length, detected_language: result.detected_language },
  });

  return jsonResponse({
    english_query: result.english_query,
    detected_language: result.detected_language,
    search_intent: result.search_intent,
  });
}

Deno.serve(async (req) => {
  corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // PUBLIC PATH: translate_search is unauthenticated but rate-limited per IP
    if (body.type === "translate_search" && body.search_query) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('cf-connecting-ip')
        || 'unknown';
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const rate = await checkIpRateLimit(supabaseAdmin, ip, 'translate_search', 10, 200);
      if (!rate.allowed) {
        return jsonResponse({ error: `Rate limit exceeded (${rate.reason}). Please try again shortly.` }, 429);
      }
      return await handleSearchTranslation(body.search_query, ip);
    }

    // --- Authentication check (required for all other modes) ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = token === SERVICE_ROLE;

    let caller: { id: string } | null = null;
    if (!isServiceRole) {
      const supabaseAnon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );
      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
      if (authError || !user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      caller = { id: user.id };
    }
    // --- End authentication check ---

    if (body.type === "translate_template" && typeof body.source_text === "string") {
      // Translate a message-template body (and optional subject) into agent CRM languages.
      // Auth is sufficient — no per-row ownership check needed; this is a stateless helper.
      return await handleTemplateTranslation({
        source_text: body.source_text,
        source_subject: typeof body.source_subject === "string" ? body.source_subject : null,
        target_languages: Array.isArray(body.target_languages)
          ? body.target_languages.map(String)
          : ["zh_simplified", "zh_traditional", "vi"],
      });
    }

    if (body.type === "translate_text" && body.target_language) {
      // Translate ad-hoc title/description text (used by the listing wizard before
      // a property has been persisted). No DB writes — returns translated fields.
      return await handleTextTranslation({
        title: typeof body.title === "string" ? body.title : "",
        description: typeof body.description === "string" ? body.description : "",
        bullets: Array.isArray(body.bullets) ? body.bullets : [],
        target_language: String(body.target_language),
      });
    }

    if (body.listing_id) {
      // --- Ownership / admin authorization check (skipped for service role) ---
      if (!isServiceRole && caller) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: ownedListing } = await supabaseAdmin
          .from("properties")
          .select("id, agents!inner(user_id)")
          .eq("id", body.listing_id)
          .eq("agents.user_id", caller.id)
          .maybeSingle();

        if (!ownedListing) {
          const { data: adminRole } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", caller.id)
            .eq("role", "admin")
            .maybeSingle();

          if (!adminRole) {
            return jsonResponse({ error: "You do not have permission to translate this listing" }, 403);
          }
        }
      }
      // --- End authorization check ---

      return await handleListingTranslation(body.listing_id);
    }

    return jsonResponse({ error: "Invalid request. Provide listing_id or { type: 'translate_search', search_query: '...' }" }, 400);
  } catch (e) {
    console.error("generate-translations error:", e);

    if (e instanceof Error) {
      if (e.message === "RATE_LIMITED") {
        return jsonResponse({ error: "AI rate limit exceeded. Please try again shortly." }, 429);
      }
      if (e.message === "CREDITS_EXHAUSTED") {
        return jsonResponse({ error: "AI credits exhausted. Please add funds." }, 402);
      }
    }

    return jsonResponse(
      { error: e instanceof Error ? e.message : "Internal server error" },
      500
    );
  }
});
