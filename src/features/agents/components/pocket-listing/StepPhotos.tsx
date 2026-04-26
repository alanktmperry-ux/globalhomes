import { useRef, useState } from 'react';
import { Upload, Star, X, ImagePlus, Sparkles, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

const DEMO_PHOTOS = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop',
];

const StepPhotos = ({ draft, update }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploadedUrls: string[] = [];

    const remaining = 20 - draft.photos.length;
    const filesToUpload = Array.from(files).slice(0, remaining);

    for (const file of filesToUpload) {
      if (file.size > 10 * 1024 * 1024) {
        continue; // Skip files > 10 MB
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const folder = user?.id || 'anonymous';
      const filePath = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('property-images')
        .upload(filePath, file, { upsert: false, contentType: file.type });
      if (error) continue;
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);
      uploadedUrls.push(publicUrl);
    }

    update({ photos: [...draft.photos, ...uploadedUrls].slice(0, 20) });
    setUploading(false);
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

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const newPhotos = [...draft.photos];
    const [moved] = newPhotos.splice(dragIdx, 1);
    newPhotos.splice(targetIdx, 0, moved);

    update({ photos: newPhotos, primaryPhoto: 0 });
    setDragIdx(null);
    setOverIdx(null);
  };

  const moveToFirst = (idx: number) => {
    if (idx === 0) return;
    const newPhotos = [...draft.photos];
    const [moved] = newPhotos.splice(idx, 1);
    newPhotos.unshift(moved);
    update({ photos: newPhotos, primaryPhoto: 0 });
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold block">Property Photos (up to 20)</Label>
      <p className="text-xs text-muted-foreground -mt-2">
        Drag to reorder — first photo becomes the feature image
      </p>

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
        {uploading ? (
          <Loader2 size={32} className="mx-auto text-primary mb-3 animate-spin" />
        ) : (
          <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
        )}
        <p className="text-sm font-medium">{uploading ? 'Uploading…' : 'Drop photos here'}</p>
        <p className="text-xs text-muted-foreground mt-1">{uploading ? '' : 'JPG, PNG, WebP · max 10 MB each'}</p>
        <p className="text-xs text-muted-foreground mt-1">{uploading ? '' : 'or click to browse'}</p>
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

      {/* Photo grid — draggable */}
      {draft.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {draft.photos.map((url, i) => (
            <div
              key={`${url}-${i}`}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              onDrop={(e) => handleDrop(e, i)}
              className={`relative group rounded-xl overflow-hidden aspect-[4/3] cursor-grab active:cursor-grabbing transition-all ${
                dragIdx === i ? 'opacity-40 scale-95' : ''
              } ${overIdx === i && dragIdx !== i ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
            >
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />

              {/* Drag handle */}
              <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-background/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={12} className="text-foreground" />
              </div>

              {/* Hover actions */}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveToFirst(i); }}
                    title="Make feature photo"
                    className="w-7 h-7 rounded-full bg-card/80 text-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                  className="w-7 h-7 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Feature badge */}
              {i === 0 && (
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center gap-1">
                  <Star size={8} /> Feature
                </div>
              )}
              {/* Position number */}
              <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full bg-background/70 text-foreground text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </div>
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