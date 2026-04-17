import { useEffect, useRef, useState } from 'react';
import type { PropertyRow } from '@/features/agents/types/listing';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Trash2, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';

const CHECKLIST_ITEMS = [
  { key: 'professional_photos', label: 'Professional photos' },
  { key: 'floor_plan', label: 'Floor plan' },
  { key: 'copywriting', label: 'Copywriting' },
  { key: 'portal_live', label: 'Portal live' },
  { key: 'social_posted', label: 'Social posted' },
  { key: 'signboard_ordered', label: 'Signboard ordered' },
] as const;

interface Props {
  listing: PropertyRow;
}

const ListingPhotoGallery = ({ listing }: Props) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>(listing.images || []);
  const [uploading, setUploading] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    ((listing as any).marketing_checklist || {}) as Record<string, boolean>
  );

  useEffect(() => {
    setImages(listing.images || []);
    setChecklist(((listing as any).marketing_checklist || {}) as Record<string, boolean>);
  }, [listing.id]);

  const daysOnMarket = listing.created_at
    ? differenceInDays(new Date(), parseISO(listing.created_at))
    : 0;
  const completed = CHECKLIST_ITEMS.filter(i => checklist[i.key]).length;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !user) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of files) {
      const path = `${user.id}/${listing.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('property-images')
        .upload(path, file);
      if (upErr) {
        toast.error(`Upload failed — ${upErr.message}`);
        continue;
      }
      const { data } = supabase.storage.from('property-images').getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }
    if (newUrls.length) {
      const updated = [...images, ...newUrls];
      const { error } = await supabase
        .from('properties')
        .update({ images: updated } as any)
        .eq('id', listing.id);
      if (error) {
        toast.error('Failed to save photos');
      } else {
        setImages(updated);
        toast.success(`${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} uploaded`);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (url: string) => {
    const updated = images.filter(u => u !== url);
    const { error } = await supabase
      .from('properties')
      .update({ images: updated } as any)
      .eq('id', listing.id);
    if (error) {
      toast.error('Could not remove photo');
    } else {
      setImages(updated);
      toast.success('Photo removed');
    }
  };

  const toggleChecklist = async (key: string) => {
    const next = { ...checklist, [key]: !checklist[key] };
    setChecklist(next);
    const { error } = await supabase
      .from('properties')
      .update({ marketing_checklist: next } as any)
      .eq('id', listing.id);
    if (error) {
      toast.error('Could not save checklist');
      setChecklist(checklist);
    }
  };

  return (
    <div className="space-y-4">
      {/* Days on Market */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-[10px] uppercase text-muted-foreground">Days on market</p>
          <p className="text-2xl font-bold">{daysOnMarket}</p>
        </div>
      </div>

      {/* Photo Gallery */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Photo Gallery ({images.length})</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-1.5 text-xs h-8"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No photos yet. Upload some to make this listing stand out.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {images.map((url, i) => (
              <div key={url} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDelete(url)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Marketing Checklist */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Marketing Checklist</h3>
          <span className="text-xs text-muted-foreground">{completed} / {CHECKLIST_ITEMS.length} done</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CHECKLIST_ITEMS.map(item => (
            <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md hover:bg-accent/40">
              <Checkbox
                checked={!!checklist[item.key]}
                onCheckedChange={() => toggleChecklist(item.key)}
              />
              <span className={checklist[item.key] ? 'line-through text-muted-foreground' : ''}>{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListingPhotoGallery;
