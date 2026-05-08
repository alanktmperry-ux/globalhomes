import { useEffect, useRef, useState } from 'react';
import { Upload, Star, X, ImagePlus, Sparkles, GripVertical, Loader2, Play, Trash2 } from 'lucide-react';
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
  const videoRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [videoDragOver, setVideoDragOver] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const EXT_TO_MIME: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif',
  };

  useEffect(() => {
    const preventWindowDrop = (event: DragEvent) => {
      event.preventDefault();
    };

    window.addEventListener('dragover', preventWindowDrop);
    window.addEventListener('drop', preventWindowDrop);
    return () => {
      window.removeEventListener('dragover', preventWindowDrop);
      window.removeEventListener('drop', preventWindowDrop);
    };
  }, []);

  const fileListFromArray = (files: File[]): FileList => {
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    return dataTransfer.files;
  };

  const extractDroppedFiles = (dataTransfer: DataTransfer): FileList | null => {
    if (dataTransfer.files && dataTransfer.files.length > 0) {
      return dataTransfer.files;
    }

    const files = Array.from(dataTransfer.items ?? [])
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file);

    return files.length > 0 ? fileListFromArray(files) : null;
  };

  const addPhotos = async (files: FileList | null) => {
    if (import.meta.env.DEV) console.log('[StepPhotos] addPhotos called', { count: files?.length, userId: user?.id });
    if (!files || files.length === 0) {
      toast.error('No files received. Try clicking the box and selecting from your computer.');
      return;
    }
    if (!user?.id) {
      toast.error('You must be signed in to upload photos.');
      return;
    }
    setUploading(true);
    const uploadedUrls: string[] = [];
    let skippedTooLarge = 0;
    let skippedUnsupported = 0;
    let failedCount = 0;
    let lastErrorMsg = '';

    const remaining = 20 - draft.photos.length;
    const filesToUpload = Array.from(files).slice(0, remaining);

    for (const file of filesToUpload) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const resolvedType = ALLOWED_MIME.includes(file.type)
        ? file.type
        : EXT_TO_MIME[ext];

      if (!resolvedType) {
        skippedUnsupported++;
        if (import.meta.env.DEV) console.warn('[StepPhotos] unsupported file', { name: file.name, type: file.type });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        skippedTooLarge++;
        continue;
      }
      const safeExt = ext || resolvedType.split('/')[1] || 'jpg';
      const filePath = `${user.id}/${crypto.randomUUID()}.${safeExt}`;
      const { error } = await supabase.storage
        .from('property-images')
        .upload(filePath, file, { upsert: false, contentType: resolvedType });
      if (error) {
        failedCount++;
        lastErrorMsg = error.message;
        console.error('[StepPhotos] upload failed', { filePath, error });
        continue;
      }
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);
      uploadedUrls.push(publicUrl);
    }

    if (fileRef.current) {
      fileRef.current.value = '';
    }

    if (uploadedUrls.length > 0) {
      update({ photos: [...draft.photos, ...uploadedUrls].slice(0, 20) });
      toast.success(`${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} added.`);
    }
    if (skippedUnsupported > 0) {
      toast.error(`${skippedUnsupported} file${skippedUnsupported > 1 ? 's' : ''} skipped — only JPG, PNG, WebP, GIF allowed (HEIC not supported).`, { duration: 12000 });
    }
    if (skippedTooLarge > 0) {
      toast.error(`${skippedTooLarge} photo${skippedTooLarge > 1 ? 's' : ''} skipped — over 10 MB limit.`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} photo${failedCount > 1 ? 's' : ''} failed: ${lastErrorMsg || 'unknown error'}`, { duration: 12000 });
    }
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

  const handleUploadDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = extractDroppedFiles(e.dataTransfer);
    void addPhotos(files);
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold block">Property Photos (up to 20)</Label>
      <p className="text-xs text-muted-foreground -mt-2">
        Drag to reorder — first photo becomes the feature image
      </p>

      {/* Drop zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={handleUploadDrop}
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
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
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
              className={`relative rounded-xl overflow-hidden aspect-[4/3] cursor-grab active:cursor-grabbing transition-all ${
                dragIdx === i ? 'opacity-40 scale-95' : ''
              } ${overIdx === i && dragIdx !== i ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
            >
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />

              {/* Drag handle */}
              <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-background/70 flex items-center justify-center pointer-events-none z-10">
                <GripVertical size={12} className="text-foreground" />
              </div>

              {/* Feature badge */}
              {i === 0 && (
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center gap-1 pointer-events-none z-10">
                  <Star size={8} /> Feature
                </div>
              )}

              {/* Position number — top-left for non-feature photos to avoid overlap with action bar */}
              {i > 0 && (
                <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-background/70 text-foreground text-[10px] font-bold flex items-center justify-center pointer-events-none z-10">
                  {i + 1}
                </div>
              )}

              {/* Always-visible action bar */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-1.5 py-1.5 bg-gradient-to-t from-black/60 to-transparent z-20">
                {i !== 0 ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveToFirst(i); }}
                    title="Make feature photo"
                    className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-amber-500 transition-colors"
                  >
                    <Star size={13} />
                  </button>
                ) : (
                  <div className="w-7" />
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                  className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X size={13} />
                </button>
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

      {/* Walkthrough Video */}
      <div className="space-y-2 pt-2 border-t border-border">
        <Label className="text-sm font-semibold block">Property Walkthrough Video (optional)</Label>
        <p className="text-xs text-muted-foreground -mt-1">
          MP4, MOV, or WebM · max 200 MB · one video per listing
        </p>

        {!draft.video_url ? (
          <div
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setVideoDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; setVideoDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setVideoDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setVideoDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void uploadVideo(f);
            }}
            onClick={() => videoRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
              videoDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            }`}
          >
            {videoUploading ? (
              <Loader2 size={28} className="mx-auto text-primary mb-2 animate-spin" />
            ) : (
              <Play size={28} className="mx-auto text-muted-foreground mb-2" />
            )}
            <p className="text-sm font-medium">{videoUploading ? 'Uploading video…' : 'Drop walkthrough video here'}</p>
            {!videoUploading && <p className="text-xs text-muted-foreground mt-1">or click to browse</p>}
            <input
              ref={videoRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadVideo(f);
              }}
            />
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-muted">
            <video
              src={draft.video_url}
              controls
              className="w-full max-h-72 bg-black"
              preload="metadata"
            />
            <button
              type="button"
              onClick={() => update({ video_url: '' })}
              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-background/90 hover:bg-red-500 hover:text-white text-foreground flex items-center justify-center shadow"
              title="Remove video"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepPhotos;