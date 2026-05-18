import { useState, useEffect, useCallback, ReactNode } from 'react';
import { X, ChevronLeft, ChevronRight, ImageOff, Images } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  images: string[];
  address: string;
  /** Optional overlay rendered on top of the hero (e.g. badges). */
  overlay?: ReactNode;
  /**
   * 'grid' (default): classic Airbnb-style 1 big + 4 thumbnail grid.
   * 'hero-rail': big hero with a vertical thumbnail rail on the right.
   *   Clicking a thumb swaps the hero in-place (no lightbox).
   *   Use this when the gallery sits next to other content (e.g. a map).
   */
  layout?: 'grid' | 'hero-rail';
  /** Height class for the hero area. Defaults to a sensible value per layout. */
  heightClass?: string;
}

export function ListingImageGallery({ images, address, overlay, layout = 'grid', heightClass }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const safeImages = images?.length ? images : [];

  // Reset active index if the images list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [images?.length]);

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

  // ─── hero-rail layout (used when sitting next to a sticky map column) ───
  if (layout === 'hero-rail') {
    const heroHeight = heightClass ?? 'h-[420px] md:h-[520px]';
    const thumbs = safeImages; // include all so user can swap to any
    const hasRail = thumbs.length > 1;

    return (
      <>
        <div className={cn('relative grid grid-cols-1 gap-2 rounded-3xl overflow-hidden', heroHeight, hasRail ? 'sm:grid-cols-[1fr_96px] md:grid-cols-[1fr_112px]' : 'grid-cols-1')}>
          {/* Hero */}
          <button
            type="button"
            onClick={() => openLightbox(activeIndex)}
            className="relative w-full h-full overflow-hidden group/hero rounded-2xl sm:rounded-none"
          >
            <img
              src={safeImages[activeIndex]}
              alt={`${address} — photo ${activeIndex + 1}`}
              className="w-full h-full object-cover cursor-zoom-in group-hover/hero:opacity-95 transition-opacity"
            />
            {overlay}
            {totalCount > 1 && (
              <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur text-white text-[11px] font-semibold pointer-events-none">
                {activeIndex + 1} / {totalCount}
              </span>
            )}
          </button>

          {/* Vertical thumbnail rail */}
          {hasRail && (
            <div className="hidden sm:flex flex-col gap-2 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
              {thumbs.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    'relative shrink-0 w-full aspect-square rounded-lg overflow-hidden transition-all',
                    i === activeIndex
                      ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                      : 'opacity-80 hover:opacity-100',
                  )}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === activeIndex}
                >
                  <img
                    src={img}
                    alt={`${address} — thumbnail ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Mobile thumb strip overlay */}
          {hasRail && (
            <div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur max-w-[calc(100%-1.5rem)] overflow-x-auto">
              {thumbs.slice(0, 8).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === activeIndex ? 'bg-white w-6' : 'bg-white/50',
                  )}
                  aria-label={`Show photo ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* View all photos button */}
          {totalCount > 1 && (
            <button
              type="button"
              onClick={() => openLightbox(activeIndex)}
              className="absolute bottom-3 right-[104px] md:right-[120px] hidden sm:inline-flex bg-white text-[#0a0f1e] px-3 py-2 rounded-full text-[12px] font-bold shadow-md items-center gap-1.5 hover:scale-[1.02] transition-transform"
            >
              <Images size={14} />
              View all {totalCount}
            </button>
          )}
        </div>

        {renderLightbox()}
      </>
    );
  }

  // ─── default grid layout ───
  const sideImages = safeImages.slice(1, 5);
  const hasSideImages = sideImages.length > 0;
  const heroColClass = hasSideImages ? 'md:col-span-2' : 'md:col-span-4';
  const gridColsClass = hasSideImages ? 'md:grid-cols-4' : 'md:grid-cols-1';
  const gridRowsClass = hasSideImages ? 'md:grid-rows-2' : 'md:grid-rows-1';

  return (
    <>
      <div className={cn('relative grid grid-cols-1 grid-rows-1 gap-2 h-[420px] md:h-[520px] rounded-3xl overflow-hidden', gridColsClass, gridRowsClass)}>
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className={cn('relative col-span-1 row-span-1 md:row-span-2 w-full h-full overflow-hidden group/hero', heroColClass)}
        >
          <img
            src={safeImages[0]}
            alt={`${address} — photo 1`}
            className="w-full h-full object-cover cursor-pointer group-hover/hero:opacity-95 transition-opacity"
          />
        </button>

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

        {totalCount > 1 && (
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="md:hidden absolute bottom-5 right-5 px-3.5 py-2 rounded-full bg-black/70 backdrop-blur text-white text-[12px] font-bold"
          >
            +{totalCount - 1} more
          </button>
        )}

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

      {renderLightbox()}
    </>
  );

  function renderLightbox() {
    if (!lightboxOpen) return null;
    return (
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
    );
  }
}
