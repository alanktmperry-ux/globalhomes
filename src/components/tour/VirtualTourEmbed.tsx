import { useState } from 'react';
import { Maximize2, Play, Box, ExternalLink } from 'lucide-react';
import { parseTourUrl, isVideoProvider, PROVIDER_ICONS, type TourProvider } from '@/lib/tourUtils';

interface Props {
  url: string;
  title?: string;
  autoExpand?: boolean;
}

const ASPECT_RATIO_CLASSES: Record<string, string> = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
};

const PROVIDER_COLORS: Record<TourProvider, string> = {
  matterport: 'bg-foreground text-background',
  inspectrealestate: 'bg-primary text-primary-foreground',
  iguide: 'bg-primary text-primary-foreground',
  ricoh: 'bg-destructive text-destructive-foreground',
  youtube: 'bg-destructive text-destructive-foreground',
  vimeo: 'bg-primary text-primary-foreground',
  generic: 'bg-muted text-muted-foreground',
};

export function VirtualTourEmbed({ url, title, autoExpand = false }: Props) {
  const [launched, setLaunched] = useState(autoExpand);
  const [fullscreen, setFullscreen] = useState(false);

  const embed = parseTourUrl(url);
  if (!embed) return null;

  const isVideo = isVideoProvider(embed.provider);
  const Icon = isVideo ? Play : Box;
  const aspectClass = ASPECT_RATIO_CLASSES[embed.aspectRatio];

  return (
    <>
      <div className={`relative ${aspectClass} rounded-2xl overflow-hidden bg-muted border border-border`}>
        {!launched ? (
          <button
            onClick={() => setLaunched(true)}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-4 group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/20 to-foreground/10" />
            <span className={`relative z-10 px-3 py-1.5 rounded-full text-xs font-bold ${PROVIDER_COLORS[embed.provider]}`}>
              {PROVIDER_ICONS[embed.provider]} {embed.label}
            </span>
            <div className="relative z-10 w-16 h-16 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Icon className="w-7 h-7" />
            </div>
            <span className="relative z-10 text-sm font-medium text-background/90">
              Click to {isVideo ? 'play video' : 'launch 3D tour'}
            </span>
          </button>
        ) : (
          <>
            <iframe
              src={embed.embedUrl}
              title={title ?? embed.label}
              className="absolute inset-0 w-full h-full border-0"
              allow="xr-spatial-tracking; gyroscope; accelerometer; autoplay; fullscreen"
              allowFullScreen
              loading="lazy"
            />
            <button
              onClick={() => setFullscreen(true)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-lg bg-foreground/50 hover:bg-foreground/70 text-background flex items-center justify-center transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-14 z-10 w-9 h-9 rounded-lg bg-foreground/50 hover:bg-foreground/70 text-background flex items-center justify-center transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </>
        )}
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[9999] bg-foreground flex items-center justify-center">
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/10 hover:bg-background/20 text-background flex items-center justify-center transition-colors"
          >
            ✕
          </button>
          <iframe
            src={embed.embedUrl}
            title={title ?? embed.label}
            className="w-full h-full border-0"
            allow="xr-spatial-tracking; gyroscope; accelerometer; autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      )}
    </>
  );
}
