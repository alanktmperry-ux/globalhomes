import { useState } from 'react';
import { Box, Play, FileImage, X } from 'lucide-react';
import { VirtualTourEmbed } from './VirtualTourEmbed';
import { parseTourUrl } from '@/lib/tourUtils';

interface Props {
  virtualTourUrl: string | null;
  videoUrl: string | null;
  floorPlanUrl: string | null;
  propertyAddress: string;
}

type ActiveTab = 'tour' | 'video' | 'floorplan';

function getDefaultTab(hasTour: boolean, hasVideo: boolean): ActiveTab {
  if (hasTour) return 'tour';
  if (hasVideo) return 'video';
  return 'floorplan';
}

export function TourTabStrip({ virtualTourUrl, videoUrl, floorPlanUrl, propertyAddress }: Props) {
  const hasTour = !!virtualTourUrl && !!parseTourUrl(virtualTourUrl);
  const hasVideo = !!videoUrl && !!parseTourUrl(videoUrl);
  const hasFloorPlan = !!floorPlanUrl;
  const tabCount = [hasTour, hasVideo, hasFloorPlan].filter(Boolean).length;

  const [active, setActive] = useState<ActiveTab>(getDefaultTab(hasTour, hasVideo));

  if (tabCount === 0) return null;

  if (tabCount === 1) {
    if (hasTour) return <VirtualTourEmbed url={virtualTourUrl!} title={propertyAddress} />;
    if (hasVideo) return <VirtualTourEmbed url={videoUrl!} title={propertyAddress} />;
    if (hasFloorPlan) return <FloorPlanView url={floorPlanUrl!} />;
    return null;
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card">
      <div className="flex border-b border-border">
        {hasTour && (
          <TabButton active={active === 'tour'} onClick={() => setActive('tour')} icon={<Box className="w-4 h-4" />} label="3D Tour" />
        )}
        {hasVideo && (
          <TabButton active={active === 'video'} onClick={() => setActive('video')} icon={<Play className="w-4 h-4" />} label="Video" />
        )}
        {hasFloorPlan && (
          <TabButton active={active === 'floorplan'} onClick={() => setActive('floorplan')} icon={<FileImage className="w-4 h-4" />} label="Floor Plan" />
        )}
      </div>
      <div className="p-0">
        {active === 'tour' && hasTour && <VirtualTourEmbed url={virtualTourUrl!} title={propertyAddress} />}
        {active === 'video' && hasVideo && <VirtualTourEmbed url={videoUrl!} title={propertyAddress} />}
        {active === 'floorplan' && hasFloorPlan && <FloorPlanView url={floorPlanUrl!} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FloorPlanView({ url }: { url: string }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <div className="relative aspect-[4/3] bg-muted cursor-zoom-in" onClick={() => setZoomed(true)}>
        <img src={url} alt="Floor plan" className="w-full h-full object-contain p-4" />
        <span className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur-sm text-xs font-medium text-foreground">
          Click to zoom
        </span>
      </div>
      {zoomed && (
        <div className="fixed inset-0 z-[9999] bg-foreground/90 flex items-center justify-center cursor-zoom-out p-8" onClick={() => setZoomed(false)}>
          <button onClick={() => setZoomed(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/10 hover:bg-background/20 text-background flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
          <img src={url} alt="Floor plan" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}
