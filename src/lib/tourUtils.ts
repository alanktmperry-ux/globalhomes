export type TourProvider =
  | 'matterport'
  | 'inspectrealestate'
  | 'iguide'
  | 'ricoh'
  | 'youtube'
  | 'vimeo'
  | 'generic';

export interface TourEmbed {
  provider: TourProvider;
  embedUrl: string;
  label: string;
  aspectRatio: '16/9' | '4/3' | '1/1';
}

function matterportEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('matterport.com')) return null;
    u.searchParams.set('play', '1');
    u.searchParams.set('qs', '1');
    u.searchParams.set('applicationKey', '');
    return u.toString();
  } catch { return null; }
}

function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1);
    } else if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? null;
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`;
  } catch { return null; }
}

function vimeoEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('vimeo.com')) return null;
    const videoId = u.pathname.split('/').filter(Boolean).pop();
    if (!videoId || !/^\d+$/.test(videoId)) return null;
    return `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0`;
  } catch { return null; }
}

function inspectrealestate(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('inspectrealestate.com.au')) return null;
    return url;
  } catch { return null; }
}

function iguideEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('iguide.to')) return null;
    return url;
  } catch { return null; }
}

function ricohEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('ricoh360.com')) return null;
    return url;
  } catch { return null; }
}

export function parseTourUrl(url: string): TourEmbed | null {
  if (!url) return null;
  const lower = url.toLowerCase();

  if (lower.includes('matterport.com')) {
    const embedUrl = matterportEmbed(url);
    if (!embedUrl) return null;
    return { provider: 'matterport', embedUrl, label: 'Matterport 3D Tour', aspectRatio: '16/9' };
  }
  if (lower.includes('inspectrealestate.com.au')) {
    const embedUrl = inspectrealestate(url);
    if (!embedUrl) return null;
    return { provider: 'inspectrealestate', embedUrl, label: 'Virtual Inspection', aspectRatio: '16/9' };
  }
  if (lower.includes('iguide.to')) {
    const embedUrl = iguideEmbed(url);
    if (!embedUrl) return null;
    return { provider: 'iguide', embedUrl, label: 'iGUIDE 3D Tour', aspectRatio: '4/3' };
  }
  if (lower.includes('ricoh360.com')) {
    const embedUrl = ricohEmbed(url);
    if (!embedUrl) return null;
    return { provider: 'ricoh', embedUrl, label: 'Ricoh 360° Tour', aspectRatio: '16/9' };
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    const embedUrl = youtubeEmbed(url);
    if (!embedUrl) return null;
    return { provider: 'youtube', embedUrl, label: 'Video Walkthrough', aspectRatio: '16/9' };
  }
  if (lower.includes('vimeo.com')) {
    const embedUrl = vimeoEmbed(url);
    if (!embedUrl) return null;
    return { provider: 'vimeo', embedUrl, label: 'Video Walkthrough', aspectRatio: '16/9' };
  }

  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    return { provider: 'generic', embedUrl: url, label: 'Virtual Tour', aspectRatio: '16/9' };
  } catch { return null; }
}

export function isVideoProvider(provider: TourProvider): boolean {
  return provider === 'youtube' || provider === 'vimeo';
}

export const PROVIDER_ICONS: Record<TourProvider, string> = {
  matterport: '🏠',
  inspectrealestate: '🔍',
  iguide: '📐',
  ricoh: '📷',
  youtube: '▶️',
  vimeo: '🎬',
  generic: '🌐',
};
