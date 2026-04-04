import { Helmet } from 'react-helmet-async';

export function DefaultSEOHead() {
  return (
    <Helmet defaultTitle="ListHQ — Find Properties Across Australia" titleTemplate="%s | ListHQ">
      <meta name="description" content="ListHQ is Australia's AI-powered property platform. Search houses, apartments and rentals with voice search. Get instant alerts for new listings." />
      <meta property="og:site_name" content="ListHQ" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e03445df-ae8d-4409-ad19-f79bb31f115f/id-preview-f7448776--e9567c16-58f4-471e-a308-10aa6a28e781.lovable.app-1772935204685.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="robots" content="index, follow" />
    </Helmet>
  );
}
