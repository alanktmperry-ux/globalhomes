import { useRef, useState } from 'react';
import { Upload, Star, X, ImagePlus, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

// Demo placeholder images
const DEMO_PHOTOS = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop',
];

const StepPhotos = ({ draft, update }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    update({ photos: [...draft.photos, ...urls].slice(0, 10) });
  };

  const removePhoto = (i: number) => {
    const newPhotos = draft.photos.filter((_, idx) => idx !== i);
    update({
      photos: newPhotos,
      primaryPhoto: draft.primaryPhoto >= newPhotos.length ? 0 : draft.primaryPhoto,
    });
  };

  const useDemoPhotos = () => {
    update({ photos: DEMO_PHOTOS, features: ['Pool', 'Renovated Kitchen', 'Garden'] });
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold block">Property Photos (3-10)</Label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addPhotos(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
        }`}
      >
        <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Drop 3-10 photos here</p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addPhotos(e.target.files)}
        />
      </div>

      {/* Demo photos button */}
      {draft.photos.length === 0 && (
        <button
          type="button"
          onClick={useDemoPhotos}
          className="flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <ImagePlus size={14} /> Use demo photos for preview
        </button>
      )}

      {/* Photo grid */}
      {draft.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {draft.photos.map((url, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden aspect-[4/3]">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => update({ primaryPhoto: i })}
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    draft.primaryPhoto === i ? 'bg-primary text-primary-foreground' : 'bg-card/80 text-foreground'
                  }`}
                >
                  <Star size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="w-7 h-7 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
              {draft.primaryPhoto === i && (
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI-detected features */}
      {draft.features.length > 0 && (
        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-2">
            <Sparkles size={12} /> AI-Detected Features
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.features.map((f) => (
              <span key={f} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepPhotos;
