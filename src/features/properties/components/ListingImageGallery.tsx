import { useState, useEffect, useCallback, ReactNode } from 'react';
import { X, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
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

  return (
    <>
      {/* Hero image */}
      <div
        className="group relative rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[2.4/1] cursor-pointer bg-muted"
        onClick={() => openLightbox(activeIndex)}
      >
        <img
          src={safeImages[activeIndex]}
          alt={`${address} — photo ${activeIndex + 1}`}
          className="w-full h-full object-cover"
        />

        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((i) => (i + 1) % safeImages.length);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={18} />
            </button>

            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
              {activeIndex + 1} / {safeImages.length}
            </div>
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              View all photos
            </div>
          </>
        )}

        {overlay}
      </div>

      {/* Thumbnail strip */}
      {safeImages.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {safeImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                'shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors',
                activeIndex === i ? 'border-primary' : 'border-transparent hover:border-border',
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

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
