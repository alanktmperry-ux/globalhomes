// Universal image transform helper.
// Handles Unsplash query params, Supabase Storage render transforms, and
// passes through local/static URLs unchanged.
const SUPABASE_HOST = 'ngrkbohpmkzjonaofgbb.supabase.co';

export function optimizeImageUrl(url: string, width = 640, quality = 70): string {
  if (!url) return url;

  // Unsplash — query params
  if (url.includes('unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('w', String(width));
      u.searchParams.set('auto', 'format,compress');
      u.searchParams.set('q', String(quality));
      u.searchParams.set('fm', 'avif');
      return u.toString();
    } catch {
      return url;
    }
  }

  // Supabase Storage — render transform path
  if (url.includes(SUPABASE_HOST) && url.includes('/storage/v1/object/')) {
    try {
      const transformed = url.replace('/storage/v1/object/', '/storage/v1/render/image/');
      const u = new URL(transformed);
      u.searchParams.set('width', String(width));
      u.searchParams.set('quality', String(quality));
      // Supabase auto-picks AVIF/WebP based on Accept header when format=origin
      u.searchParams.set('format', 'origin');
      return u.toString();
    } catch {
      return url;
    }
  }

  // Local /public assets and 3rd-party CDNs — return as-is.
  // For /hero/* we pre-generate 480/960/1440 variants in HeroSearchPreview.
  return url;
}

export function imageSrcSet(url: string, sizes = [320, 640, 960, 1280]): string {
  if (!url) return '';
  // Only emit srcset for sources we can actually transform — otherwise the
  // browser fetches the same untransformed URL N times.
  const transformable =
    url.includes('unsplash.com') ||
    (url.includes(SUPABASE_HOST) && url.includes('/storage/v1/object/'));
  if (!transformable) return '';
  return sizes.map((w) => `${optimizeImageUrl(url, w)} ${w}w`).join(', ');
}

// Convenience helper for typical card-sized below-the-fold images.
export function cardImageProps(url: string, alt: string) {
  return {
    src: optimizeImageUrl(url, 640),
    srcSet: imageSrcSet(url, [320, 640, 1280]),
    sizes: '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw',
    alt,
    width: 640,
    height: 480,
    loading: 'lazy' as const,
    fetchPriority: 'low' as const,
    decoding: 'async' as const,
  };
}

// ── Backward-compat wrappers — existing callers continue to work ──
export function optimizeUnsplashUrl(url: string, width = 640, quality = 70): string {
  return optimizeImageUrl(url, width, quality);
}

export function unsplashSrcSet(url: string): string {
  return imageSrcSet(url);
}
