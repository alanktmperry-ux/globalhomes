import { Helmet } from "react-helmet-async";

const SITE_URL = "https://listhq.com.au";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOProps {
  /** Full page title — will be rendered as-is. Should be unique per page. */
  title: string;
  /** Meta description (~50–160 chars). */
  description: string;
  /** Path-relative URL ("/privacy") or full URL. Used for og:url + canonical. */
  path?: string;
  /** Override the OG image (full URL preferred). */
  image?: string;
  /** Default "website". Use "article" for property listings, profiles. */
  type?: "website" | "article" | "profile";
  /** Set to true to mark page as noindex (e.g. auth pages). */
  noindex?: boolean;
}

/**
 * Centralised SEO/OG meta block. Use on every public page.
 * Domain is hardcoded to https://listhq.com.au.
 */
export function SEO({
  title,
  description,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
}: SEOProps) {
  const url = path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="ListHQ" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}

export default SEO;
