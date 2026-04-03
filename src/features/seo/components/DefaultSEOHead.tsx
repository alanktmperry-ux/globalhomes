import { Helmet } from 'react-helmet-async';

export function DefaultSEOHead() {
  return (
    <Helmet defaultTitle="ListHQ — Find Properties Across Australia" titleTemplate="%s | ListHQ">
      <meta name="description" content="ListHQ is Australia's AI-powered property platform. Search houses, apartments and rentals with voice search. Get instant alerts for new listings." />
      <meta property="og:site_name" content="ListHQ" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/og-default.svg" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="robots" content="index, follow" />
    </Helmet>
  );
}
