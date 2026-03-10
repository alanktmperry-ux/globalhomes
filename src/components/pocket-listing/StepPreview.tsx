import { Smartphone, Monitor, Bed, Bath, Car, MapPin, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  onPublish: () => void;
  publishing?: boolean;
}

const formatPrice = (d: ListingDraft) => {
  const fmt = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`;
  switch (d.priceDisplay) {
    case 'exact': return fmt(d.priceMax);
    case 'range': return `${fmt(d.priceMin)} – ${fmt(d.priceMax)}`;
    case 'eoi': return 'Expressions of Interest';
    case 'contact': return 'Contact Agent';
  }
};

const StepPreview = ({ draft, onPublish, publishing }: Props) => {
  const [view, setView] = useState<'mobile' | 'desktop'>('mobile');
  const mainPhoto = draft.photos[draft.primaryPhoto] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop';

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setView('mobile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            view === 'mobile' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
          }`}
        >
          <Smartphone size={14} /> Mobile
        </button>
        <button
          type="button"
          onClick={() => setView('desktop')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            view === 'desktop' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
          }`}
        >
          <Monitor size={14} /> Desktop
        </button>
      </div>

      {/* Preview card */}
      <div className={`mx-auto border border-border rounded-2xl overflow-hidden bg-card shadow-elevated ${
        view === 'mobile' ? 'max-w-[320px]' : 'max-w-full'
      }`}>
        <div className={`relative ${view === 'mobile' ? 'aspect-[4/3]' : 'aspect-[16/7]'}`}>
          <img src={mainPhoto} alt="Property" className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              draft.visibility === 'whisper'
                ? 'bg-foreground/80 text-background'
                : draft.visibility === 'coming-soon'
                ? 'bg-primary text-primary-foreground'
                : 'bg-success text-success-foreground'
            }`}>
              {draft.visibility === 'whisper' ? '🤫 Whisper' : draft.visibility === 'coming-soon' ? '🔜 Coming Soon' : '🟢 Live'}
            </span>
          </div>
          <div className="absolute bottom-3 left-3">
            <p className="font-display text-xl font-extrabold text-primary-foreground drop-shadow-lg">
              {formatPrice(draft)}
            </p>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-display text-base font-bold mb-1 line-clamp-1">
            {draft.generatedTitle || `${draft.propertyType} in ${draft.suburb || 'Location'}`}
          </h3>
          <p className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <MapPin size={12} /> {draft.address || 'Address'}
          </p>

          <div className="flex gap-4 text-sm mb-3">
            <span className="flex items-center gap-1"><Bed size={14} /> {draft.beds}</span>
            <span className="flex items-center gap-1"><Bath size={14} /> {draft.baths}</span>
            <span className="flex items-center gap-1"><Car size={14} /> {draft.cars}</span>
          </div>

          {draft.generatedBullets.length > 0 && (
            <ul className="space-y-1 mb-3">
              {draft.generatedBullets.slice(0, 3).map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 size={12} className="text-success mt-0.5 shrink-0" /> {b}
                </li>
              ))}
            </ul>
          )}

          {draft.features.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {draft.features.map((f) => (
                <span key={f} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-medium flex items-center gap-1">
                  <Sparkles size={8} /> {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Publish */}
      <div className="pt-2">
        <Button
          size="lg"
          onClick={onPublish}
          disabled={publishing}
          className="w-full py-5 rounded-xl text-base font-bold bg-success hover:bg-success/90 text-success-foreground relative"
        >
          {publishing ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" /> Saving to database…
            </>
          ) : (
            <>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse shadow-lg" />
              Publish Off-Market Listing
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default StepPreview;