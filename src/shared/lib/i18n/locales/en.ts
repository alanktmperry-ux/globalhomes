/**
 * English base translations for buyer-facing pages.
 *
 * Keys here are consumed by the new useTranslation() hook. They are merged
 * with the legacy translations defined in src/shared/lib/i18n.tsx so that
 * existing pages keep working while new pages can use this file as the
 * canonical source of English copy.
 *
 * Coverage:
 *   - homepage hero
 *   - property search bar + filters
 *   - stamp duty calculator (labels + results)
 *   - exclusive landing page
 *   - home services page
 *   - referral page
 */

export const en = {
  // ──────────────────────────────────────────────────────────────────
  // Homepage hero
  // ──────────────────────────────────────────────────────────────────
  'hero.eyebrow': "Australia's AI-powered property platform",
  'hero.headline': 'Find your home.',
  'hero.headline2': 'In your language.',
  'hero.subheadline': 'Search in 24 languages. See prices in your currency. Powered by AI voice search.',
  'hero.forSale': 'For Sale',
  'hero.forRent': 'For Rent',
  'hero.search': 'Search',
  'hero.searchHint': "Describe what you're looking for — our AI does the rest",
  'hero.propertiesListed': 'Properties listed',
  'hero.activeAgents': 'Active agents',
  'hero.languages': 'Languages',
  'hero.featuredListings': 'Featured listings',
  'hero.viewAll': 'View all',

  // ──────────────────────────────────────────────────────────────────
  // Property search bar + filters
  // ──────────────────────────────────────────────────────────────────
  'search.placeholder': 'e.g. family home with pool in Brisbane',
  'search.button': 'Search',
  'search.voice.listening': 'Listening...',
  'search.voice.transcribing': 'Transcribing…',
  'search.voice.error': 'Voice search unavailable. Please try again.',
  'search.results': 'Search Results',
  'search.searching': 'Searching across Australia…',

  'filter.header': 'Filters',
  'filter.reset': 'Reset',
  'filter.apply': 'Apply',
  'filter.priceMin': 'Min price',
  'filter.priceMax': 'Max price',
  'filter.beds': 'Bedrooms',
  'filter.baths': 'Bathrooms',
  'filter.parking': 'Parking',
  'filter.propertyType': 'Property Type',
  'filter.propertyType.house': 'House',
  'filter.propertyType.apartment': 'Apartment',
  'filter.propertyType.townhouse': 'Townhouse',
  'filter.propertyType.land': 'Land',
  'filter.features': 'Features',
  'filter.petFriendly': 'Pet friendly',
  'filter.furnished': 'Furnished',
  'filter.availability': 'Availability',
  'filter.availableNow': 'Available now',
  'filter.show': 'Show {count} properties',
  'filter.empty': 'No properties match your filters',

  // ──────────────────────────────────────────────────────────────────
  // Stamp Duty Calculator
  // ──────────────────────────────────────────────────────────────────
  'stampDuty.pageTitle': 'Stamp Duty Calculator',
  'stampDuty.pageSubtitle': 'Estimate your stamp duty across all Australian states and territories. Includes first home buyer concessions and grants for 2026.',
  'stampDuty.calculatorTitle': 'Calculate your stamp duty',
  'stampDuty.label.price': 'Property price',
  'stampDuty.label.state': 'State or territory',
  'stampDuty.label.buyerType': 'Buyer type',
  'stampDuty.buyerType.ownerOccupier': 'Owner occupier',
  'stampDuty.buyerType.investor': 'Investor',
  'stampDuty.label.firstHome': "I'm a first home buyer",
  'stampDuty.label.foreign': "I'm a foreign buyer",
  'stampDuty.placeholder.price': 'Enter property price',

  'stampDuty.result.total': 'Total stamp duty',
  'stampDuty.result.standardDuty': 'Standard transfer duty',
  'stampDuty.result.concession': 'First home buyer concession',
  'stampDuty.result.grant': 'First home owner grant',
  'stampDuty.result.foreignSurcharge': 'Foreign investor surcharge',
  'stampDuty.result.firbFee': 'FIRB application fee',
  'stampDuty.result.netCost': 'Net cost to you',
  'stampDuty.result.savings': "You save {amount} as a first home buyer",
  'stampDuty.result.notEligible': 'Not eligible for first home buyer concessions at this price.',
  'stampDuty.result.disclaimer': 'Indicative estimate only. Final stamp duty is calculated by your solicitor or conveyancer at settlement.',

  'stampDuty.error.invalidPrice': 'Please enter a valid property price.',
  'stampDuty.error.priceTooLow': 'Price must be greater than $0.',
  'stampDuty.error.enterPrice': 'Enter a purchase price above to calculate',
  'stampDuty.cta.broker': 'Find out your borrowing power',
  'stampDuty.cta.brokerSub': 'Speak to a broker and get pre-approved today.',
  'stampDuty.cta.brokerButton': 'Speak to a broker',

  'stampDuty.firb.required': 'FIRB approval required before purchasing — apply at',

  'stampDuty.result.effectiveRate': 'Effective rate',
  'stampDuty.result.upfrontCosts': 'Estimated total upfront costs (excl. deposit)',
  'stampDuty.result.legalFees': 'Legal / conveyancing (est.)',
  'stampDuty.result.inspectionFees': 'Building & pest inspection (est.)',
  'stampDuty.result.lenderFees': 'Lender fees (est.)',
  'stampDuty.result.showBreakdown': 'Show bracket breakdown',
  'stampDuty.result.hideBreakdown': 'Hide bracket breakdown',

  'stampDuty.seo.howItWorksTitle': 'How stamp duty works in Australia',
  'stampDuty.seo.howItWorksText': 'Stamp duty (also called transfer duty or land transfer duty) is a state government tax paid when you purchase a property. Each state and territory sets its own rates, thresholds, and concessions. Rates are applied progressively — similar to income tax — with higher marginal rates on higher price brackets.',
  'stampDuty.seo.concessionsTitle': 'First Home Buyer concessions by state',
  'stampDuty.seo.concessionsText': 'Most states offer significant stamp duty relief for first home buyers purchasing below a price threshold. NSW offers full exemption up to $800,000. Victoria waives duty on purchases up to $600,000. Queensland provides concessions on the first $350,000 of the price for eligible buyers.',
  'stampDuty.seo.whenPaidTitle': 'When is stamp duty paid?',
  'stampDuty.seo.whenPaidText': 'Stamp duty is typically due within 30 days of settlement in most states. Your conveyancer or solicitor will handle the payment on your behalf. It must be paid before the property transfer is registered with the state land titles office.',

  // ──────────────────────────────────────────────────────────────────
  // Exclusive landing page
  // ──────────────────────────────────────────────────────────────────
  'exclusive.hero.eyebrow': 'ListHQ Exclusive',
  'exclusive.hero.headline': 'Access pre-market properties first.',
  'exclusive.hero.subheadline': 'See homes before they hit the market. Members get first-look access to off-market and pre-market listings across Australia.',
  'exclusive.hero.cta': 'Join Exclusive — $29/month',
  'exclusive.hero.ctaSub': 'Cancel anytime. No lock-in contract.',

  'exclusive.benefits.title': 'What you get',
  'exclusive.benefits.preMarket': 'Pre-market listings 7+ days early',
  'exclusive.benefits.preMarketDesc': 'See properties before they hit realestate.com.au or Domain.',
  'exclusive.benefits.offMarket': 'Off-market opportunities',
  'exclusive.benefits.offMarketDesc': 'Access listings the public will never see.',
  'exclusive.benefits.alerts': 'Instant alerts',
  'exclusive.benefits.alertsDesc': 'Be the first to know when a matching property goes live.',
  'exclusive.benefits.concierge': 'Buyer concierge',
  'exclusive.benefits.conciergeDesc': 'AI-powered matching tuned to your brief.',

  'exclusive.howItWorks.title': 'How it works',
  'exclusive.howItWorks.step1': 'Tell us what you want',
  'exclusive.howItWorks.step2': 'We match you to off-market homes',
  'exclusive.howItWorks.step3': 'Connect directly with the agent',

  'exclusive.faq.title': 'Frequently asked questions',
  'exclusive.cta.final': 'Start seeing properties first',
  'exclusive.cta.finalSub': '$29/month. Cancel anytime.',

  // ──────────────────────────────────────────────────────────────────
  // Home services page
  // ──────────────────────────────────────────────────────────────────
  'homeServices.pageTitle': 'Home Services Marketplace',
  'homeServices.pageSubtitle': 'Find trusted tradespeople for your property. Cleaners, inspectors, removalists and more.',

  'homeServices.hero.title': 'Get your property market-ready',
  'homeServices.hero.subtitle': 'Book vetted professionals — photography, styling, inspections and more.',

  'homeServices.search.placeholder': 'Search services or suburbs',
  'homeServices.filter.allCategories': 'All categories',
  'homeServices.category.photography': 'Photography',
  'homeServices.category.floorPlans': 'Floor Plans',
  'homeServices.category.virtualStaging': 'Virtual Staging',
  'homeServices.category.pestInspection': 'Pest Inspection',
  'homeServices.category.buildingInspection': 'Building Inspection',
  'homeServices.category.conveyancing': 'Conveyancing',
  'homeServices.category.cleaning': 'Cleaning',
  'homeServices.category.landscaping': 'Landscaping',
  'homeServices.category.removalists': 'Removalists',

  'homeServices.card.from': 'From',
  'homeServices.card.viewProfile': 'View profile',
  'homeServices.card.requestQuote': 'Request quote',
  'homeServices.card.verified': 'Verified',
  'homeServices.card.rating': 'rating',
  'homeServices.card.reviews': 'reviews',
  'homeServices.card.contactForQuote': 'Contact for quote',

  'homeServices.empty.title': 'No services found',
  'homeServices.empty.subtitle': 'Try changing your filters or search a different suburb.',
  'homeServices.empty.noProviders': 'No providers found for this category yet — check back soon.',
  'homeServices.error.loadFailed': 'Could not load services. Please refresh.',

  'homeServices.cta.becomeProvider': 'List your business',
  'homeServices.cta.becomeProviderSub': 'Reach buyers and sellers across Australia.',

  'homeServices.modal.title': 'Request a quote{providerName ? ` — ${providerName}` : \'\'}',
  'homeServices.modal.description': 'Share a few details and the provider will get back to you within 4 hours.',
  'homeServices.modal.nameLabel': 'Your name',
  'homeServices.modal.emailLabel': 'Email',
  'homeServices.modal.phoneLabel': 'Phone',
  'homeServices.modal.addressLabel': 'Property address',
  'homeServices.modal.addressPlaceholder': 'e.g. 12 Smith St, Surry Hills NSW',
  'homeServices.modal.dateLabel': 'Preferred date',
  'homeServices.modal.messageLabel': 'Message',
  'homeServices.modal.messagePlaceholder': 'Anything the provider should know?',
  'homeServices.modal.sending': 'Sending…',
  'homeServices.modal.sendButton': 'Send request',

  'homeServices.footer.disclaimer': 'Providers listed are independent businesses. ListHQ may receive a referral fee on bookings.',

  // ──────────────────────────────────────────────────────────────────
  // Referral page
  // ──────────────────────────────────────────────────────────────────
  'referral.hero.eyebrow': 'Referral Program',
  'referral.hero.headline': 'Refer a buyer or seller. Get paid.',
  'referral.hero.subheadline': "Earn with ListHQ's referral network. Send us a lead, we connect them with the right agent, and you get rewarded when it converts.",
  'referral.hero.cta': 'Join the program',
  'referral.hero.ctaSecondary': 'How it works',

  'referral.howItWorks.title': 'How the program works',
  'referral.howItWorks.subtitle': 'Get started in three simple steps',
  'referral.howItWorks.step': 'Step {step}',
  'referral.howItWorks.step1.title': 'Refer someone',
  'referral.howItWorks.step1.desc': 'Send us a buyer or seller through your unique referral link.',
  'referral.howItWorks.step2.title': 'We match them to an agent',
  'referral.howItWorks.step2.desc': 'Our network connects them with the best-fit local agent.',
  'referral.howItWorks.step3.title': 'You get paid',
  'referral.howItWorks.step3.desc': 'Earn a referral fee when the deal settles.',
  'referral.howItWorks.countries': 'Countries',
  'referral.howItWorks.perReferral': 'Per settled referral',

  'referral.form.title': 'Refer a contact',
  'referral.form.createTitle': 'Create your referral account',
  'referral.form.createSubtitle': 'Get your unique referral code and start earning today.',
  'referral.form.name': 'Their full name',
  'referral.form.email': 'Their email',
  'referral.form.phone': 'Their phone (optional)',
  'referral.form.password': 'Password',
  'referral.form.passwordHint': 'At least 8 characters.',
  'referral.form.country': 'Country',
  'referral.form.selectCountry': 'Select country',
  'referral.form.language': 'Preferred language',
  'referral.form.agency': 'Agency / Company name',
  'referral.form.wechat': 'WeChat ID',
  'referral.form.type': 'Are they buying or selling?',
  'referral.form.type.buying': 'Buying',
  'referral.form.type.selling': 'Selling',
  'referral.form.notes': 'Anything we should know?',
  'referral.form.consent': 'I confirm I have their consent to share these details.',
  'referral.form.submit': 'Send referral',
  'referral.form.submitting': 'Sending…',
  'referral.form.alreadySignedIn': "You're already signed in. If you've already registered as a referral agent,",
  'referral.form.goToDashboard': 'go to your dashboard',
  'referral.form.terms': 'By signing up you agree to our',
  'referral.form.termsLink': 'Terms',
  'referral.form.and': 'and',
  'referral.form.privacyLink': 'Privacy Policy',

  'referral.success.title': "You're in!",
  'referral.success.subtitle': "We'll be in touch as soon as we've matched them with an agent.",
  'referral.success.verifyEmail': 'Check your email to verify your account, then log in to access your dashboard.',
  'referral.success.active': 'Your referral account is active. Start sharing your link to earn commissions.',

  'referral.error.required': 'Please fill in all required fields.',
  'referral.error.invalidEmail': 'Please enter a valid email address.',
  'referral.error.consent': 'You must confirm consent before submitting.',
  'referral.error.submitFailed': 'Could not send your referral. Please try again.',

  'referral.dashboard.title': 'Referral Dashboard',
  'referral.dashboard.welcomeBack': 'Welcome back',
  'referral.dashboard.hi': 'Hi {name}',
  'referral.dashboard.tier': 'tier',
  'referral.dashboard.submitReferral': 'Submit a referral',
  'referral.dashboard.yourCode': 'Your referral code',
  'referral.dashboard.code': 'Code',
  'referral.dashboard.copyCode': 'Copy code',
  'referral.dashboard.yourLink': 'Your referral link',
  'referral.dashboard.link': 'Link',
  'referral.dashboard.copyLink': 'Copy referral link',
  'referral.dashboard.copied': 'Link copied',
  'referral.dashboard.goToDashboard': 'Go to dashboard',
  'referral.dashboard.backToHome': 'Back to home',
  'referral.dashboard.realtime': 'Real-time',
  'referral.dashboard.tracking': 'Tracking dashboard',
  'referral.dashboard.empty': 'No referrals yet. Share your link to get started.',
  'referral.dashboard.totalReferrals': 'Total referrals',
  'referral.dashboard.converted': 'Converted',
  'referral.dashboard.conversionRate': 'Conversion rate',
  'referral.dashboard.totalCommission': 'Total commission',
  'referral.dashboard.commissionRates': 'Commission rates',
  'referral.dashboard.commissionRatesDesc': 'Your tier rises automatically as your referrals settle.',
  'referral.dashboard.yourReferrals': 'Your referrals',
  'referral.dashboard.noReferrals': 'No referrals yet — share your link to get started',
  'referral.dashboard.submitFirst': 'Submit your first referral',
  'referral.dashboard.date': 'Date',
  'referral.dashboard.buyer': 'Buyer',
  'referral.dashboard.country': 'Country',
  'referral.dashboard.property': 'Property',
  'referral.dashboard.status': 'Status',
  'referral.dashboard.commission': 'Commission',
} as const;

export type TranslationKey = keyof typeof en;
