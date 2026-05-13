import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://listhq.com.au';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ListHQ",
  "url": "https://listhq.com.au",
  "logo": "https://listhq.com.au/og-image.png",
  "description": "Australia's multilingual property platform — listings auto-translated into 30+ languages. One platform for every buyer and every agent.",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "support@listhq.com.au",
    "availableLanguage": ["English", "Chinese", "Vietnamese", "Arabic", "Hindi"],
  },
  "areaServed": {
    "@type": "Country",
    "name": "Australia",
  },
  "sameAs": [
    "https://www.linkedin.com/company/listhq",
    "https://www.facebook.com/listhq",
    "https://www.instagram.com/listhq",
  ],
};

export function DefaultSEOHead() {
  const { pathname } = useLocation();
  const canonical =
    pathname === '/' ? `${SITE_URL}/` : `${SITE_URL}${pathname.replace(/\/$/, '')}`;
  const isHome = pathname === '/';

  return (
    <Helmet defaultTitle="ListHQ — Australia's multilingual property platform" titleTemplate="%s | ListHQ">
      <meta name="description" content="Australia's multilingual property platform. Search listings in any language. Free for buyers, 60-day free trial for agents." />
      <link rel="canonical" href={canonical} />
      <meta property="og:site_name" content="ListHQ" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ListHQAU" />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="robots" content="index, follow" />
      {isHome && (
        <script type="application/ld+json">{JSON.stringify(ORG_SCHEMA)}</script>
      )}
    </Helmet>
  );
}
