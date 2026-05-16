import { useState, useEffect, useCallback, ReactNode } from 'react';
import { X, ChevronLeft, ChevronRight, ImageOff, Images } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  images: string[];
  address: string;
  /** Optional overlay rendered on top of the hero (e.g. badges). */
  overlay?: ReactNode;
}

export function ListingImageGallery({ images, address, overlay }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const safeImages = images?.length ? images : [];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  }, []);

  const prev = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.stopPropagation?.();
      setLightboxIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
    },
    [safeImages.length],
  );

  const next = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.stopPropagation?.();
      setLightboxIndex((i) => (i + 1) % safeImages.length);
    },
    [safeImages.length],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, prev, next, closeLightbox]);

  // Cleanup body overflow if component unmounts while lightbox is open
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (safeImages.length === 0) {
    return (
      <div className="relative rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[2.4/1] bg-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOff size={28} />
          <p className="text-sm">No photos available</p>
        </div>
      </div>
    );
  }

  const totalCount = safeImages.length;
  const sideImages = safeImages.slice(1, 5);

  return (
    <>
      {/* 5-image grid hero */}
      <div className="relative grid grid-cols-1 md:grid-cols-4 grid-rows-1 md:grid-rows-2 gap-2 h-[420px] md:h-[520px] rounded-3xl overflow-hidden">
        {/* Main image */}
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className="relative col-span-1 md:col-span-2 row-span-1 md:row-span-2 w-full h-full overflow-hidden group/hero"
        >
          <img
            src={safeImages[0]}
            alt={`${address} — photo 1`}
            className="w-full h-full object-cover cursor-pointer group-hover/hero:opacity-95 transition-opacity"
          />
        </button>

        {/* Side images (desktop only) */}
        {sideImages.map((img, i) => (
          <button
            key={i + 1}
            type="button"
            onClick={() => openLightbox(i + 1)}
            className="hidden md:block col-span-1 row-span-1 w-full h-full overflow-hidden"
          >
            <img
              src={img}
              alt={`${address} — photo ${i + 2}`}
              className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
              loading="lazy"
            />
          </button>
        ))}

        {/* Mobile "+N more" pill */}
        {totalCount > 1 && (
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="md:hidden absolute bottom-5 right-5 px-3.5 py-2 rounded-full bg-black/70 backdrop-blur text-white text-[12px] font-bold"
          >
            +{totalCount - 1} more
          </button>
        )}

        {/* Desktop "View all photos" button */}
        {totalCount > 1 && (
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="hidden md:inline-flex absolute bottom-5 right-5 bg-white text-[#0a0f1e] px-4 py-2.5 rounded-full text-[13px] font-bold shadow-md items-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Images size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
            View all {totalCount} photos
          </button>
        )}

        {overlay}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X size={20} />
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">
            {lightboxIndex + 1} of {safeImages.length}
          </div>

          <img
            src={safeImages[lightboxIndex]}
            alt={`${address} — photo ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {safeImages.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Lightbox thumbnail strip */}
          {safeImages.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto px-2"
              onClick={(e) => e.stopPropagation()}
            >
              {safeImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(i);
                  }}
                  className={cn(
                    'shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors',
                    lightboxIndex === i ? 'border-white' : 'border-white/30',
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
