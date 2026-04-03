import { Box, Play } from 'lucide-react';
import { parseTourUrl, isVideoProvider } from '@/lib/tourUtils';

interface Props {
  virtualTourUrl: string | null;
  videoUrl: string | null;
}

export function TourBadge({ virtualTourUrl, videoUrl }: Props) {
  const hasTour = !!virtualTourUrl && !!parseTourUrl(virtualTourUrl);
  const hasVideo = !!videoUrl && !!parseTourUrl(videoUrl);

  if (!hasTour && !hasVideo) return null;

  return (
    <div className="absolute bottom-3 right-3 flex gap-1.5 z-10">
      {hasTour && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card/90 backdrop-blur-sm text-[10px] font-bold text-foreground shadow-sm">
          <Box className="w-3 h-3" /> 3D Tour
        </span>
      )}
      {hasVideo && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card/90 backdrop-blur-sm text-[10px] font-bold text-foreground shadow-sm">
          <Play className="w-3 h-3" /> Video
        </span>
      )}
    </div>
  );
}
