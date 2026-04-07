import { useState } from 'react';
import { Link, Loader2, CheckCircle2, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface ImportedListing {
  address: string;
  suburb: string;
  state: string;
  listingType: string;
  priceMin: number;
  priceMax: number;
  priceFormatted: string;
  priceDisplay: string;
  propertyType: string;
  beds: number;
  baths: number;
  cars: number;
  sqm: number;
  landSize: number;
  description: string;
  features: string[];
  photos: string[];
  sourceUrl: string;
  portal: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (listing: ImportedListing) => void;
}

const PORTAL_LABELS: Record<string, { name: string; color: string }> = {
  rea: { name: 'realestate.com.au', color: '#E8001C' },
  domain: { name: 'Domain', color: '#1A1A1A' },
  homely: { name: 'Homely', color: '#00A699' },
  allhomes: { name: 'AllHomes', color: '#2962FF' },
};

export function ImportListingDialog({ open, onClose, onImport }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportedListing | null>(null);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('import-listing', { body: { url: url.trim() } });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (!data?.listing) throw new Error('No listing data returned');
      setPreview(data.listing);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to import listing. Check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;
    onImport(preview);
    toast.success('Listing imported — review and publish when ready');
    onClose();
    setUrl('');
    setPreview(null);
  };

  const handleClose = () => {
    onClose();
    setUrl('');
    setPreview(null);
    setError('');
  };

  const portalInfo = preview?.portal ? PORTAL_LABELS[preview.portal] : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link size={18} className="text-primary" />
            Import from REA or Domain
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Paste the URL of your own listing from realestate.com.au, domain.com.au, homely.com.au, or allhomes.com.au. We'll pull the details straight into your listing wizard so you only need to review and publish.
          </p>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Listing URL</Label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={e => { setUrl(e.target.value); setError(''); setPreview(null); }}
                placeholder="https://www.realestate.com.au/property-house-..."
                className="h-10 text-xs font-mono"
                onKeyDown={e => { if (e.key === 'Enter' && url.trim()) handleFetch(); }}
              />
              <Button size="sm" onClick={handleFetch} disabled={loading || !url.trim()} className="h-10 px-4">
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Import'}
              </Button>
            </div>
            {loading && <p className="text-xs text-muted-foreground animate-pulse">Fetching listing details…</p>}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertCircle size={14} className="text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {preview && (
            <div className="rounded-xl border border-border overflow-hidden">
              {preview.photos.length > 0 ? (
                <div className="relative h-40 bg-secondary">
                  <img src={preview.photos[0]} alt="listing" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {portalInfo && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: portalInfo.color }}>
                      {portalInfo.name}
                    </span>
                  )}
                  <div className="absolute bottom-2 left-3">
                    <p className="text-white font-bold text-sm">{preview.priceFormatted || 'Contact Agent'}</p>
                  </div>
                </div>
              ) : (
                <div className="h-20 bg-secondary flex items-center justify-center">
                  {portalInfo && <span className="text-xs font-medium text-muted-foreground">{portalInfo.name}</span>}
                  <span className="text-xs text-muted-foreground ml-2">No photos detected</span>
                </div>
              )}

              <div className="p-3 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{preview.address || 'Address not detected'}</p>
                  <p className="text-xs text-muted-foreground">{[preview.suburb, preview.state].filter(Boolean).join(', ')}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {preview.propertyType && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">{preview.propertyType}</span>}
                  {preview.beds > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{preview.beds} bed</span>}
                  {preview.baths > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{preview.baths} bath</span>}
                  {preview.cars > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{preview.cars} car</span>}
                  {preview.sqm > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{preview.sqm} sqm</span>}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {preview.listingType === 'rent' ? 'For Rent' : 'For Sale'}
                  </span>
                </div>

                {preview.description && <p className="text-xs text-muted-foreground line-clamp-3">{preview.description}</p>}
                {preview.photos.length > 1 && <p className="text-[10px] text-muted-foreground">{preview.photos.length} photos detected</p>}

                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 size={12} />
                  Address, price, beds/baths, description{preview.photos.length > 0 ? ', and photos' : ''} ready to import
                </div>

                <a href={preview.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                  <ExternalLink size={10} />
                  View original listing
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          {preview && (
            <Button size="sm" onClick={handleImport} className="gap-1.5">
              Use these details
              <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
