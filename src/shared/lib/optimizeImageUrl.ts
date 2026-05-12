// Lightweight Unsplash URL transformer. Unsplash supports inline resizing,
// format negotiation, and quality controls via query params — we use that to
// avoid shipping 1500px wide JPEGs to a 320px-wide card.
export function optimizeUnsplashUrl(url: string, width = 640, quality = 70): string {
  if (!url) return url;
  if (!url.includes("unsplash.com")) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    u.searchParams.set("auto", "format,compress");
    u.searchParams.set("q", String(quality));
    u.searchParams.set("fm", "avif");
    return u.toString();
  } catch {
    return url;
  }
}

export function unsplashSrcSet(url: string): string {
  if (!url || !url.includes("unsplash.com")) return "";
  return [320, 640, 960, 1280]
    .map((w) => `${optimizeUnsplashUrl(url, w)} ${w}w`)
    .join(", ");
}
