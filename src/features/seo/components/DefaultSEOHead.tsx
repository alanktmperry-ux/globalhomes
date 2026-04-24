import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://listhq.com.au';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export function DefaultSEOHead() {
  return (
    <Helmet defaultTitle="ListHQ — Find Properties Across Australia" titleTemplate="%s | ListHQ">
      <meta name="description" content="ListHQ is Australia's AI-powered property platform. Search houses, apartments and rentals with voice search. Get instant alerts for new listings." />
      <link rel="canonical" href={SITE_URL} />
      <meta property="og:site_name" content="ListHQ" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="robots" content="index, follow" />
    </Helmet>
  );
}
