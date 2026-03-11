import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface Props {
  listing: any;
  onUpdate: (updates: Record<string, any>) => void;
}

const ListingDetailsTab = ({ listing, onUpdate }: Props) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: listing.title || '',
    property_type: listing.property_type || 'House',
    beds: listing.beds || 0,
    baths: listing.baths || 0,
    parking: listing.parking || 0,
    sqm: listing.sqm || 0,
    land_size: listing.land_size || '',
    agency_authority: listing.agency_authority || 'exclusive',
    status: listing.status || 'whisper',
  });

  const handleSave = () => {
    onUpdate({
      ...form,
      land_size: form.land_size ? Number(form.land_size) : null,
    });
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Hero image */}
      {listing.image_url && (
        <img src={listing.image_url} alt="" className="w-full h-48 object-cover rounded-xl" />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">{listing.title}</h2>
          <p className="text-sm text-muted-foreground">{listing.address}</p>
          <p className="text-lg font-display font-bold text-primary mt-1">{listing.price_formatted || AUD.format(listing.price)}</p>
        </div>
        <Button size="sm" variant={editing ? 'default' : 'outline'} onClick={() => editing ? handleSave() : setEditing(true)}>
          {editing ? 'Save' : 'Edit Details'}
        </Button>
      </div>

      {editing ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-card border border-border rounded-xl p-4">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Property Type</Label>
            <Select value={form.property_type} onValueChange={v => setForm(f => ({...f, property_type: v}))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['House', 'Apartment', 'Townhouse', 'Land', 'Commercial', 'Rural'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Agency Authority</Label>
            <Select value={form.agency_authority} onValueChange={v => setForm(f => ({...f, agency_authority: v}))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exclusive">Exclusive</SelectItem>
                <SelectItem value="sole">Sole Agency</SelectItem>
                <SelectItem value="open">Open Listing</SelectItem>
                <SelectItem value="auction">Auction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Beds</Label>
            <Input type="number" value={form.beds} onChange={e => setForm(f => ({...f, beds: Number(e.target.value)}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Baths</Label>
            <Input type="number" value={form.baths} onChange={e => setForm(f => ({...f, baths: Number(e.target.value)}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Parking</Label>
            <Input type="number" value={form.parking} onChange={e => setForm(f => ({...f, parking: Number(e.target.value)}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Floor Area (sqm)</Label>
            <Input type="number" value={form.sqm} onChange={e => setForm(f => ({...f, sqm: Number(e.target.value)}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Land Size (sqm)</Label>
            <Input type="number" value={form.land_size} onChange={e => setForm(f => ({...f, land_size: e.target.value}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whisper">Whisper</SelectItem>
                <SelectItem value="coming-soon">Coming Soon</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Type', value: listing.property_type || 'House' },
            { label: 'Authority', value: (listing.agency_authority || 'exclusive').replace(/^\w/, (c: string) => c.toUpperCase()) },
            { label: 'Beds', value: listing.beds },
            { label: 'Baths', value: listing.baths },
            { label: 'Parking', value: listing.parking },
            { label: 'Floor Area', value: `${listing.sqm} sqm` },
            { label: 'Land Size', value: listing.land_size ? `${listing.land_size} sqm` : '—' },
            { label: 'Status', value: listing.status },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
              <p className="text-sm font-semibold mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {listing.description && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-2">Description</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{listing.description}</p>
        </div>
      )}

      {listing.features?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-2">Features</h3>
          <div className="flex flex-wrap gap-1.5">
            {listing.features.map((f: string) => (
              <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingDetailsTab;
