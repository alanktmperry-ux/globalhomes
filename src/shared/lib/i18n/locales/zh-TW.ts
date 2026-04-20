/**
 * Traditional Chinese (Hong Kong / Taiwan) translations for buyer-facing pages.
 *
 * Mirrors every key in ./en.ts using Traditional characters and HK/TW
 * conventions (e.g. 預售房源, 產權轉讓, 物業管理). Terminology glossary:
 *   stamp duty            → 印花稅
 *   FIRB                  → 外國投資審查委員會 (FIRB)
 *   trust accounting      → 信託賬戶
 *   conveyancing          → 產權轉讓
 *   pre-market / exclusive → 預售房源
 *   property management   → 物業管理
 *   auction               → 拍賣
 *   make an offer         → 出價
 *   home loan / mortgage  → 房屋貸款
 */
import type { en as EnBase } from './en';

export const zhTW: Record<keyof typeof EnBase, string> = {
  // ──────────────────────────────────────────────────────────────────
  // Homepage hero
  // ──────────────────────────────────────────────────────────────────
  'hero.eyebrow': '澳洲AI驅動的房地產平台',
  'hero.headline': '尋找您的家。',
  'hero.headline2': '用您的語言。',
  'hero.subheadline': '支援24種語言搜尋,以您的貨幣顯示價格,由AI語音搜尋驅動。',
  'hero.forSale': '出售',
  'hero.forRent': '出租',
  'hero.search': '搜尋',
  'hero.searchHint': '描述您想要的房子——其餘交給AI',
  'hero.propertiesListed': '已上架房源',
  'hero.activeAgents': '活躍經紀',
  'hero.languages': '種語言',
  'hero.featuredListings': '精選房源',
  'hero.viewAll': '查看全部',

  // ──────────────────────────────────────────────────────────────────
  // Property search bar + filters
  // ──────────────────────────────────────────────────────────────────
  'search.placeholder': '例如:布里斯本附泳池的家庭住宅',
  'search.button': '搜尋',
  'search.voice.listening': '正在聆聽...',
  'search.voice.transcribing': '正在轉錄…',
  'search.voice.error': '語音搜尋暫不可用,請重試。',
  'search.results': '搜尋結果',
  'search.searching': '正在搜尋全澳洲…',

  'filter.header': '篩選',
  'filter.reset': '重設',
  'filter.apply': '套用',
  'filter.priceMin': '最低價格',
  'filter.priceMax': '最高價格',
  'filter.beds': '睡房數',
  'filter.baths': '浴室數',
  'filter.parking': '停車位',
  'filter.propertyType': '物業類型',
  'filter.propertyType.house': '獨立屋',
  'filter.propertyType.apartment': '公寓',
  'filter.propertyType.townhouse': '聯排別墅',
  'filter.propertyType.land': '土地',
  'filter.features': '特色設施',
  'filter.petFriendly': '允許寵物',
  'filter.furnished': '附傢俬',
  'filter.availability': '可入住時間',
  'filter.availableNow': '即可入住',
  'filter.show': '顯示 {count} 套物業',
  'filter.empty': '沒有符合篩選條件的房源',

  // ──────────────────────────────────────────────────────────────────
  // Stamp Duty Calculator
  // ──────────────────────────────────────────────────────────────────
  'stampDuty.pageTitle': '印花稅計算機',
  'stampDuty.pageSubtitle': '估算您在澳洲各州及領地需繳納的印花稅。包含2026年首次置業者優惠及補貼。',
  'stampDuty.calculatorTitle': '計算您的印花稅',
  'stampDuty.label.price': '物業價格',
  'stampDuty.label.state': '州或領地',
  'stampDuty.label.buyerType': '買家類型',
  'stampDuty.buyerType.ownerOccupier': '自住業主',
  'stampDuty.buyerType.investor': '投資者',
  'stampDuty.label.firstHome': '我是首次置業者',
  'stampDuty.label.foreign': '我是海外買家',
  'stampDuty.placeholder.price': '請輸入物業價格',

  'stampDuty.result.total': '印花稅總額',
  'stampDuty.result.standardDuty': '標準產權轉讓稅',
  'stampDuty.result.concession': '首次置業者印花稅減免',
  'stampDuty.result.grant': '首次置業者補貼',
  'stampDuty.result.foreignSurcharge': '海外投資者附加稅',
  'stampDuty.result.firbFee': '外國投資審查委員會 (FIRB) 申請費',
  'stampDuty.result.netCost': '您的實際成本',
  'stampDuty.result.savings': '作為首次置業者,您可節省 {amount}',
  'stampDuty.result.notEligible': '此價格不符合首次置業者優惠條件。',
  'stampDuty.result.disclaimer': '僅供參考估算。最終印花稅由您的律師或產權轉讓師於成交時核算。',
  'stampDuty.result.effectiveRate': '實際稅率',
  'stampDuty.result.upfrontCosts': '預估總前期費用（不含定金）',
  'stampDuty.result.legalFees': '法律/產權轉讓費（預估）',
  'stampDuty.result.inspectionFees': '建築及蟲害檢查費（預估）',
  'stampDuty.result.lenderFees': '貸款機構費用（預估）',
  'stampDuty.result.showBreakdown': '顯示稅率分級明細',
  'stampDuty.result.hideBreakdown': '隱藏稅率分級明細',

  'stampDuty.error.invalidPrice': '請輸入有效的物業價格。',
  'stampDuty.error.priceTooLow': '價格必須大於 $0。',
  'stampDuty.error.enterPrice': '請輸入購買價格以進行計算',
  'stampDuty.cta.broker': '了解您的貸款額度',
  'stampDuty.cta.brokerSub': '聯絡房屋貸款經紀，今日獲得預先批核。',
  'stampDuty.cta.brokerButton': '聯絡貸款經紀',

  'stampDuty.firb.required': '購買前需獲得FIRB批准——請前往申請',

  'stampDuty.seo.howItWorksTitle': '澳洲印花稅如何運作',
  'stampDuty.seo.howItWorksText': '印花稅（亦稱為產權轉讓稅或土地轉讓稅）是您在購買物業時向州政府繳納的稅款。每個州和領地都設定自己的稅率、起徵點和優惠政策。稅率採用累進方式計算——類似於所得稅——價格越高，適用的邊際稅率也越高。',
  'stampDuty.seo.concessionsTitle': '各州首次置業者優惠政策',
  'stampDuty.seo.concessionsText': '大多數州為購買低於特定價格門檻的首次置業者提供顯著的印花稅減免。新南威爾斯州對80萬澳元以下的物業提供全額豁免。維多利亞州對60萬澳元以下的購買免徵印花稅。昆士蘭州為符合條件的買家提供前35萬澳元價格的優惠。',
  'stampDuty.seo.whenPaidTitle': '印花稅何時繳納？',
  'stampDuty.seo.whenPaidText': '在大多數州，印花稅通常在交割後30天內繳納。您的產權轉讓師或律師會代您處理付款事宜。必須在物業轉讓登記到州土地所有權辦公室之前完成繳納。',

  // ──────────────────────────────────────────────────────────────────
  // Exclusive landing page
  // ──────────────────────────────────────────────────────────────────
  'exclusive.hero.eyebrow': 'ListHQ 預售房源',
  'exclusive.hero.headline': '搶先獲取預售房源。',
  'exclusive.hero.subheadline': '在房源公開上市前搶先查看。會員可優先獲取澳洲各地的非公開及預售房源。',
  'exclusive.hero.cta': '加入會員 — 每月 $29',
  'exclusive.hero.ctaSub': '可隨時取消,無合約綁定。',

  'exclusive.benefits.title': '會員權益',
  'exclusive.benefits.preMarket': '提前 7 天以上查看預售房源',
  'exclusive.benefits.preMarketDesc': '在房源登陸 realestate.com.au 或 Domain 之前搶先查看。',
  'exclusive.benefits.offMarket': '非公開房源機會',
  'exclusive.benefits.offMarketDesc': '獲取公眾永遠看不到的房源。',
  'exclusive.benefits.alerts': '即時提醒',
  'exclusive.benefits.alertsDesc': '匹配房源一上線,您將第一時間收到通知。',
  'exclusive.benefits.concierge': '買家專屬顧問',
  'exclusive.benefits.conciergeDesc': '由AI驅動,根據您的需求精準匹配。',

  'exclusive.howItWorks.title': '運作方式',
  'exclusive.howItWorks.step1': '告訴我們您的需求',
  'exclusive.howItWorks.step2': '我們為您匹配非公開房源',
  'exclusive.howItWorks.step3': '直接與經紀聯絡',

  'exclusive.faq.title': '常見問題',
  'exclusive.cta.final': '搶先查看心儀房源',
  'exclusive.cta.finalSub': '每月 $29,可隨時取消。',

  // ──────────────────────────────────────────────────────────────────
  // Home services page
  // ──────────────────────────────────────────────────────────────────
  'homeServices.pageTitle': '家居服務市場',
  'homeServices.pageSubtitle': '為您的物業尋找值得信賴的專業人士。包括清潔、驗樓、搬屋等服務。',

  'homeServices.search.placeholder': '搜尋服務或地區',
  'homeServices.filter.allCategories': '所有類別',
  'homeServices.category.cleaning': '清潔',
  'homeServices.category.inspection': '建築及蟲害檢查',
  'homeServices.category.removalist': '搬屋服務',
  'homeServices.category.handyman': '維修工',
  'homeServices.category.gardening': '園藝',
  'homeServices.category.electrical': '電工',
  'homeServices.category.plumbing': '水管工',
  'homeServices.category.painting': '油漆',

  'homeServices.card.from': '起價',
  'homeServices.card.viewProfile': '查看資料',
  'homeServices.card.requestQuote': '索取報價',
  'homeServices.card.verified': '已認證',
  'homeServices.card.rating': '評分',
  'homeServices.card.reviews': '評價',

  'homeServices.empty.title': '未找到相關服務',
  'homeServices.empty.subtitle': '請嘗試更改篩選條件或搜尋其他地區。',
  'homeServices.error.loadFailed': '無法載入服務列表,請重新整理頁面。',

  'homeServices.cta.becomeProvider': '上架您的業務',
  'homeServices.cta.becomeProviderSub': '觸達澳洲各地的買家與賣家。',

  // ──────────────────────────────────────────────────────────────────
  // Referral page
  // ──────────────────────────────────────────────────────────────────
  'referral.hero.eyebrow': '推薦計劃',
  'referral.hero.headline': '推薦買家或賣家,賺取佣金。',
  'referral.hero.subheadline': '透過 ListHQ 的推薦網絡賺取佣金。您推薦客戶,我們為他們匹配合適的經紀,成交後您即可獲得獎勵。',
  'referral.hero.cta': '加入推薦計劃',
  'referral.hero.ctaSecondary': '運作方式',

  'referral.howItWorks.title': '推薦計劃如何運作',
  'referral.howItWorks.step1.title': '推薦客戶',
  'referral.howItWorks.step1.desc': '透過您的專屬推薦連結將買家或賣家推薦給我們。',
  'referral.howItWorks.step2.title': '我們為他們匹配經紀',
  'referral.howItWorks.step2.desc': '我們的網絡會為他們匹配最合適的本地經紀。',
  'referral.howItWorks.step3.title': '您獲得佣金',
  'referral.howItWorks.step3.desc': '交易成交後,您即可獲得推薦佣金。',

  'referral.form.title': '推薦聯絡人',
  'referral.form.name': '對方全名',
  'referral.form.email': '對方電郵',
  'referral.form.phone': '對方電話(選填)',
  'referral.form.type': '他們是買家還是賣家?',
  'referral.form.type.buying': '買家',
  'referral.form.type.selling': '賣家',
  'referral.form.notes': '還有什麼需要告訴我們的?',
  'referral.form.consent': '我確認已獲得對方同意分享其資料。',
  'referral.form.submit': '提交推薦',
  'referral.form.submitting': '提交中…',

  'referral.success.title': '推薦已收到',
  'referral.success.subtitle': '我們會在為他們匹配到經紀後盡快與您聯絡。',

  'referral.error.required': '請填寫所有必填欄位。',
  'referral.error.invalidEmail': '請輸入有效的電郵地址。',
  'referral.error.consent': '提交前必須確認已獲得對方同意。',
  'referral.error.submitFailed': '推薦提交失敗,請重試。',

  'referral.dashboard.title': '您的推薦記錄',
  'referral.dashboard.empty': '暫無推薦記錄。分享您的連結開始吧。',
  'referral.dashboard.copyLink': '複製推薦連結',
  'referral.dashboard.copied': '連結已複製',

  // Additional referral keys
  'referral.howItWorks.subtitle': '三個簡單步驟即可開始',
  'referral.howItWorks.step': '第 {step} 步',
  'referral.howItWorks.countries': '國家/地區',
  'referral.howItWorks.perReferral': '每筆成交推薦',

  'referral.form.createTitle': '建立您的推薦帳戶',
  'referral.form.createSubtitle': '取得您的專屬推薦代碼,立即開始賺取佣金。',
  'referral.form.password': '密碼',
  'referral.form.passwordHint': '至少 8 個字元。',
  'referral.form.country': '國家/地區',
  'referral.form.selectCountry': '請選擇國家/地區',
  'referral.form.language': '偏好語言',
  'referral.form.agency': '機構 / 公司名稱',
  'referral.form.wechat': '微信號',
  'referral.form.alreadySignedIn': '您已登入。如果您已註冊為推薦代理,',
  'referral.form.goToDashboard': '前往您的儀表板',
  'referral.form.terms': '註冊即表示您同意我們的',
  'referral.form.termsLink': '條款',
  'referral.form.and': '及',
  'referral.form.privacyLink': '隱私政策',

  'referral.success.verifyEmail': '請查收郵件以驗證您的帳戶,然後登入存取您的儀表板。',
  'referral.success.active': '您的推薦帳戶已啟用。開始分享您的連結以賺取佣金。',

  'referral.dashboard.welcomeBack': '歡迎回來',
  'referral.dashboard.hi': '您好,{name}',
  'referral.dashboard.tier': '等級',
  'referral.dashboard.submitReferral': '提交推薦',
  'referral.dashboard.yourCode': '您的推薦代碼',
  'referral.dashboard.code': '代碼',
  'referral.dashboard.copyCode': '複製代碼',
  'referral.dashboard.yourLink': '您的推薦連結',
  'referral.dashboard.link': '連結',
  'referral.dashboard.goToDashboard': '前往儀表板',
  'referral.dashboard.backToHome': '返回首頁',
  'referral.dashboard.realtime': '即時',
  'referral.dashboard.tracking': '追蹤儀表板',
  'referral.dashboard.totalReferrals': '推薦總數',
  'referral.dashboard.converted': '已成交',
  'referral.dashboard.conversionRate': '轉換率',
  'referral.dashboard.totalCommission': '總佣金',
  'referral.dashboard.commissionRates': '佣金費率',
  'referral.dashboard.commissionRatesDesc': '隨著您的推薦成交,等級會自動提升。',
  'referral.dashboard.yourReferrals': '您的推薦記錄',
  'referral.dashboard.noReferrals': '暫無推薦 — 分享您的連結開始吧',
  'referral.dashboard.submitFirst': '提交您的第一筆推薦',
  'referral.dashboard.date': '日期',
  'referral.dashboard.buyer': '買家',
  'referral.dashboard.country': '國家/地區',
  'referral.dashboard.property': '房產',
  'referral.dashboard.status': '狀態',
  'referral.dashboard.commission': '佣金',
};
