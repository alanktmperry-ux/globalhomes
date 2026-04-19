/**
 * Simplified Chinese (Mainland China) translations for buyer-facing pages.
 *
 * Mirrors every key in ./en.ts. Terminology follows the project glossary:
 *   stamp duty            → 印花税
 *   FIRB                  → 外国投资审查委员会 (FIRB)
 *   trust accounting      → 信托账户
 *   conveyancing          → 产权转让
 *   pre-market / exclusive → 预售房源
 *   property management   → 物业管理
 *   auction               → 拍卖
 *   make an offer         → 出价
 *   home loan / mortgage  → 房屋贷款
 */
import type { en as EnBase } from './en';

export const zhCN: Record<keyof typeof EnBase, string> = {
  // ──────────────────────────────────────────────────────────────────
  // Homepage hero
  // ──────────────────────────────────────────────────────────────────
  'hero.eyebrow': '澳大利亚AI驱动的房产平台',
  'hero.headline': '寻找您的家。',
  'hero.headline2': '用您的语言。',
  'hero.subheadline': '支持24种语言搜索，以您的货币显示价格，由AI语音搜索驱动。',
  'hero.forSale': '出售',
  'hero.forRent': '出租',
  'hero.search': '搜索',
  'hero.searchHint': '描述您想要的房子——剩下的交给AI',
  'hero.propertiesListed': '已上架房源',
  'hero.activeAgents': '活跃经纪人',
  'hero.languages': '种语言',
  'hero.featuredListings': '精选房源',
  'hero.viewAll': '查看全部',

  // ──────────────────────────────────────────────────────────────────
  // Property search bar + filters
  // ──────────────────────────────────────────────────────────────────
  'search.placeholder': '例如：布里斯班带泳池的家庭住宅',
  'search.button': '搜索',
  'search.voice.listening': '正在聆听...',
  'search.voice.transcribing': '正在转写…',
  'search.voice.error': '语音搜索暂不可用,请重试。',
  'search.results': '搜索结果',
  'search.searching': '正在搜索澳大利亚各地…',

  'filter.header': '筛选',
  'filter.reset': '重置',
  'filter.apply': '应用',
  'filter.priceMin': '最低价格',
  'filter.priceMax': '最高价格',
  'filter.beds': '卧室数',
  'filter.baths': '浴室数',
  'filter.parking': '停车位',
  'filter.propertyType': '房产类型',
  'filter.propertyType.house': '独立屋',
  'filter.propertyType.apartment': '公寓',
  'filter.propertyType.townhouse': '联排别墅',
  'filter.propertyType.land': '土地',
  'filter.features': '特色设施',
  'filter.petFriendly': '允许宠物',
  'filter.furnished': '带家具',
  'filter.availability': '可入住时间',
  'filter.availableNow': '立即可入住',
  'filter.show': '显示 {count} 套房产',
  'filter.empty': '没有符合筛选条件的房源',

  // ──────────────────────────────────────────────────────────────────
  // Stamp Duty Calculator
  // ──────────────────────────────────────────────────────────────────
  'stampDuty.pageTitle': '印花税计算器',
  'stampDuty.pageSubtitle': '估算您在澳大利亚各州及领地需缴纳的印花税。包含2026年首次置业者优惠和补贴。',
  'stampDuty.calculatorTitle': '计算您的印花税',
  'stampDuty.label.price': '房产价格',
  'stampDuty.label.state': '州或领地',
  'stampDuty.label.buyerType': '买家类型',
  'stampDuty.buyerType.ownerOccupier': '自住业主',
  'stampDuty.buyerType.investor': '投资者',
  'stampDuty.label.firstHome': '我是首次置业者',
  'stampDuty.label.foreign': '我是海外买家',
  'stampDuty.placeholder.price': '请输入房产价格',

  'stampDuty.result.total': '印花税总额',
  'stampDuty.result.standardDuty': '标准产权转让税',
  'stampDuty.result.concession': '首次置业者印花税减免',
  'stampDuty.result.grant': '首次置业者补贴',
  'stampDuty.result.foreignSurcharge': '海外投资者附加税',
  'stampDuty.result.firbFee': '外国投资审查委员会 (FIRB) 申请费',
  'stampDuty.result.netCost': '您的实际成本',
  'stampDuty.result.savings': '作为首次置业者,您可节省 {amount}',
  'stampDuty.result.notEligible': '此价格不符合首次置业者优惠条件。',
  'stampDuty.result.disclaimer': '仅供参考估算。最终印花税由您的律师或产权转让师在交割时核算。',

  'stampDuty.error.invalidPrice': '请输入有效的房产价格。',
  'stampDuty.error.priceTooLow': '价格必须大于 $0。',
  'stampDuty.cta.broker': '了解您的贷款额度',
  'stampDuty.cta.brokerSub': '联系房屋贷款经纪人,今天就获得预批。',
  'stampDuty.cta.brokerButton': '联系贷款经纪人',

  // ──────────────────────────────────────────────────────────────────
  // Exclusive landing page
  // ──────────────────────────────────────────────────────────────────
  'exclusive.hero.eyebrow': 'ListHQ 预售房源',
  'exclusive.hero.headline': '抢先获取预售房源。',
  'exclusive.hero.subheadline': '在房源公开上市前抢先查看。会员可优先获取澳大利亚各地的非公开和预售房源。',
  'exclusive.hero.cta': '加入会员 — 每月 $29',
  'exclusive.hero.ctaSub': '可随时取消,无合约绑定。',

  'exclusive.benefits.title': '会员权益',
  'exclusive.benefits.preMarket': '提前 7 天以上查看预售房源',
  'exclusive.benefits.preMarketDesc': '在房源登陆 realestate.com.au 或 Domain 之前抢先查看。',
  'exclusive.benefits.offMarket': '非公开房源机会',
  'exclusive.benefits.offMarketDesc': '获取公众永远看不到的房源。',
  'exclusive.benefits.alerts': '即时提醒',
  'exclusive.benefits.alertsDesc': '匹配房源一上线,您将第一时间收到通知。',
  'exclusive.benefits.concierge': '买家专属顾问',
  'exclusive.benefits.conciergeDesc': '由AI驱动,根据您的需求精准匹配。',

  'exclusive.howItWorks.title': '运作方式',
  'exclusive.howItWorks.step1': '告诉我们您的需求',
  'exclusive.howItWorks.step2': '我们为您匹配非公开房源',
  'exclusive.howItWorks.step3': '直接与经纪人联系',

  'exclusive.faq.title': '常见问题',
  'exclusive.cta.final': '抢先查看心仪房源',
  'exclusive.cta.finalSub': '每月 $29,可随时取消。',

  // ──────────────────────────────────────────────────────────────────
  // Home services page
  // ──────────────────────────────────────────────────────────────────
  'homeServices.pageTitle': '家居服务市场',
  'homeServices.pageSubtitle': '为您的房产寻找值得信赖的专业人士。包括清洁、验房、搬家等服务。',

  'homeServices.search.placeholder': '搜索服务或社区',
  'homeServices.filter.allCategories': '所有类别',
  'homeServices.category.cleaning': '清洁',
  'homeServices.category.inspection': '建筑及虫害检查',
  'homeServices.category.removalist': '搬家服务',
  'homeServices.category.handyman': '维修工',
  'homeServices.category.gardening': '园艺',
  'homeServices.category.electrical': '电工',
  'homeServices.category.plumbing': '水管工',
  'homeServices.category.painting': '油漆',

  'homeServices.card.from': '起价',
  'homeServices.card.viewProfile': '查看资料',
  'homeServices.card.requestQuote': '索取报价',
  'homeServices.card.verified': '已认证',
  'homeServices.card.rating': '评分',
  'homeServices.card.reviews': '评价',

  'homeServices.empty.title': '未找到相关服务',
  'homeServices.empty.subtitle': '请尝试更改筛选条件或搜索其他社区。',
  'homeServices.error.loadFailed': '无法加载服务列表,请刷新页面。',

  'homeServices.cta.becomeProvider': '上架您的业务',
  'homeServices.cta.becomeProviderSub': '触达澳大利亚各地的买家与卖家。',

  // ──────────────────────────────────────────────────────────────────
  // Referral page
  // ──────────────────────────────────────────────────────────────────
  'referral.hero.eyebrow': '推荐计划',
  'referral.hero.headline': '推荐买家或卖家,赚取佣金。',
  'referral.hero.subheadline': '通过 ListHQ 的推荐网络赚取佣金。您推荐客户,我们为他们匹配合适的经纪人,成交后您即可获得奖励。',
  'referral.hero.cta': '加入推荐计划',
  'referral.hero.ctaSecondary': '运作方式',

  'referral.howItWorks.title': '推荐计划如何运作',
  'referral.howItWorks.step1.title': '推荐客户',
  'referral.howItWorks.step1.desc': '通过您的专属推荐链接将买家或卖家推荐给我们。',
  'referral.howItWorks.step2.title': '我们为他们匹配经纪人',
  'referral.howItWorks.step2.desc': '我们的网络会为他们匹配最合适的本地经纪人。',
  'referral.howItWorks.step3.title': '您获得佣金',
  'referral.howItWorks.step3.desc': '交易交割后,您即可获得推荐佣金。',

  'referral.form.title': '推荐联系人',
  'referral.form.name': '对方全名',
  'referral.form.email': '对方邮箱',
  'referral.form.phone': '对方电话(选填)',
  'referral.form.type': '他们是买家还是卖家?',
  'referral.form.type.buying': '买家',
  'referral.form.type.selling': '卖家',
  'referral.form.notes': '还有什么需要告诉我们的?',
  'referral.form.consent': '我确认已获得对方同意分享其信息。',
  'referral.form.submit': '提交推荐',
  'referral.form.submitting': '提交中…',

  'referral.success.title': '推荐已收到',
  'referral.success.subtitle': '我们会在为他们匹配到经纪人后尽快与您联系。',

  'referral.error.required': '请填写所有必填字段。',
  'referral.error.invalidEmail': '请输入有效的邮箱地址。',
  'referral.error.consent': '提交前必须确认已获得对方同意。',
  'referral.error.submitFailed': '推荐提交失败,请重试。',

  'referral.dashboard.title': '您的推荐记录',
  'referral.dashboard.empty': '暂无推荐记录。分享您的链接开始吧。',
  'referral.dashboard.copyLink': '复制推荐链接',
  'referral.dashboard.copied': '链接已复制',
};
