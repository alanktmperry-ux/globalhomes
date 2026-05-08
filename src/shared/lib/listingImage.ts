// Centralised listing image fallback.
// Returns the first usable image URL, or null when nothing is available.
// Components should render a CSS gradient placeholder when this returns null —
// never fall back to a stock photo from Unsplash or anywhere else, since
// displaying a fake photo for a real listing is misleading.
export function getListingImage(
  primary?: string | null,
  gallery?: string[] | null,
): string | null {
  if (primary && primary.length > 0) return primary;
  if (gallery && gallery.length > 0 && gallery[0]) return gallery[0];
  return null;
}

// Tailwind classes for the placeholder div. Use with an <ImageIcon /> child.
export const LISTING_PLACEHOLDER_CLASS =
  'bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center text-muted-foreground';
