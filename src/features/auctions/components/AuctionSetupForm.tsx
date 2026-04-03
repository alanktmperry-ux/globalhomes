import { useState } from 'react';
import { useAuctionAgent } from '../hooks/useAuction';
import { Calendar, Clock, MapPin, Lock, AlertTriangle, Play, Pause, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props { propertyId: string; agentId: string; }

const TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '14:00'];
const TIMEZONES = [
  { value: 'Australia/Melbourne', label: 'AEDT/AEST (Melbourne/Sydney)' },
  { value: 'Australia/Brisbane', label: 'AEST (Brisbane)' },
  { value: 'Australia/Adelaide', label: 'ACDT/ACST (Adelaide)' },
  { value: 'Australia/Perth', label: 'AWST (Perth)' },
];

export function AuctionSetupForm({ propertyId, agentId }: Props) {
  const { auction, loading, createAuction, updateAuction, setLive } = useAuctionAgent(propertyId);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    auction_date: auction?.auction_date ?? '',
    auction_time: auction?.auction_time?.slice(0, 5) ?? '10:00',
    auction_timezone: auction?.auction_timezone ?? 'Australia/Melbourne',
    auction_location: auction?.auction_location ?? 'On-site',
    is_online: auction?.is_online ?? false,
    online_platform_url: auction?.online_platform_url ?? '',
    auctioneer_name: auction?.auctioneer_name ?? '',
    auctioneer_firm: auction?.auctioneer_firm ?? '',
    auctioneer_licence: auction?.auctioneer_licence ?? '',
    reserve_price: auction?.reserve_price?.toString() ?? '',
    opening_bid: auction?.opening_bid?.toString() ?? '',
    vendor_bid_limit: auction?.vendor_bid_limit?.toString() ?? '',
  });

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.auction_date) { toast.error('Please set an auction date'); return; }
    setSaving(true);
    const payload = {
      property_id: propertyId,
      agent_id: agentId,
      auction_date: form.auction_date,
      auction_time: form.auction_time + ':00',
      auction_timezone: form.auction_timezone,
      auction_location: form.auction_location,
      is_online: form.is_online,
      online_platform_url: form.online_platform_url || null,
      auctioneer_name: form.auctioneer_name || null,
      auctioneer_firm: form.auctioneer_firm || null,
      auctioneer_licence: form.auctioneer_licence || null,
      reserve_price: form.reserve_price ? parseFloat(form.reserve_price.replace(/,/g, '')) : null,
      opening_bid: form.opening_bid ? parseFloat(form.opening_bid.replace(/,/g, '')) : null,
      vendor_bid_limit: form.vendor_bid_limit ? parseFloat(form.vendor_bid_limit.replace(/,/g, '')) : null,
    };

    if (auction) {
      const { error } = await updateAuction(auction.id, payload);
      if (error) toast.error(error.message);
      else toast.success('Auction updated');
    } else {
      const { error } = await createAuction(payload);
      if (error) toast.error(error.message);
      else toast.success('Auction created');
    }
    setSaving(false);
  };

  const handleGoLive = async () => {
    if (!auction) return;
    if (!confirm('Start the live auction? This cannot be undone.')) return;
    const { error } = await setLive(auction.id);
    if (error) toast.error(error.message);
    else toast.success('Auction is now LIVE');
  };

  const handleStatusChange = async (status: string) => {
    if (!auction) return;
    if (!confirm(`Change status to "${status}"?`)) return;
    const { error } = await updateAuction(auction.id, { status });
    if (error) toast.error(error.message);
    else toast.success(`Status changed to ${status}`);
  };

  if (loading) return <div className="p-5 text-center text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1"><Calendar size={14} /> Auction date *</label>
          <input type="date" value={form.auction_date} onChange={e => update('auction_date', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1"><Clock size={14} /> Time</label>
          <select value={form.auction_time} onChange={e => update('auction_time', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Timezone</label>
        <select value={form.auction_timezone} onChange={e => update('auction_timezone', e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1"><MapPin size={14} /> Location</label>
          <input value={form.auction_location} onChange={e => update('auction_location', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mt-7 cursor-pointer">
            <input type="checkbox" checked={form.is_online} onChange={e => update('is_online', e.target.checked)} className="rounded border-border" />
            Online auction
          </label>
          {form.is_online && (
            <input value={form.online_platform_url} onChange={e => update('online_platform_url', e.target.value)} placeholder="Online platform URL"
              className="w-full mt-2 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <input value={form.auctioneer_name} onChange={e => update('auctioneer_name', e.target.value)} placeholder="Auctioneer name"
          className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input value={form.auctioneer_firm} onChange={e => update('auctioneer_firm', e.target.value)} placeholder="Firm"
          className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input value={form.auctioneer_licence} onChange={e => update('auctioneer_licence', e.target.value)} placeholder="Licence #"
          className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
        <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Lock size={14} className="text-muted-foreground" /> Confidential pricing</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Reserve price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input value={form.reserve_price} onChange={e => update('reserve_price', e.target.value.replace(/[^0-9,]/g, ''))}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Opening bid</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input value={form.opening_bid} onChange={e => update('opening_bid', e.target.value.replace(/[^0-9,]/g, ''))}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vendor bid limit</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input value={form.vendor_bid_limit} onChange={e => update('vendor_bid_limit', e.target.value.replace(/[^0-9,]/g, ''))}
                className="w-full pl-7 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : auction ? 'Update Auction' : 'Create Auction'}
        </button>
      </div>

      {auction && (
        <div className="flex items-center gap-2 flex-wrap">
          {auction.total_registered > 0 && (
            <span className="text-xs text-muted-foreground">{auction.total_registered} registered bidders</span>
          )}
          <div className="flex-1" />
          {['scheduled', 'open'].includes(auction.status) && (
            <>
              {auction.status === 'scheduled' && (
                <button onClick={() => handleStatusChange('open')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  Open Registrations
                </button>
              )}
              <button onClick={handleGoLive} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 transition-colors flex items-center gap-1">
                <Play size={12} /> Start Live Auction
              </button>
              <button onClick={() => handleStatusChange('postponed')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 transition-colors flex items-center gap-1">
                <Pause size={12} /> Postpone
              </button>
              <button onClick={() => handleStatusChange('withdrawn')} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-1">
                <XCircle size={12} /> Withdraw
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
