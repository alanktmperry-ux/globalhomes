import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, EyeOff, Zap, CheckCircle2, Clock, Sparkles, TrendingUp, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';

const LISTINGS = [
  { id: '1', title: 'Modern Family Oasis', address: '42 Panorama Drive, Berwick', price: '$850K – $920K', status: 'whisper', views: 24, leads: 3, days: 4, thumb: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&h=150&fit=crop' },
  { id: '2', title: 'Station Side Living', address: '15 Station St, Narre Warren', price: '$620K – $680K', status: 'coming-soon', views: 67, leads: 5, days: 11, thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=150&fit=crop' },
  { id: '3', title: 'Coastal Elegance', address: '8 Ocean View Rd, Brighton', price: '$1.8M – $2.0M', status: 'public', views: 142, leads: 7, days: 18, thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200&h=150&fit=crop' },
  { id: '4', title: 'Investor Special', address: '22 Market St, CBD', price: '$540K', status: 'sold', views: 89, leads: 12, days: 6, thumb: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=200&h=150&fit=crop' },
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  whisper: { icon: <EyeOff size={12} />, label: 'Whisper', color: 'bg-foreground/10 text-foreground' },
  'coming-soon': { icon: <Clock size={12} />, label: 'Coming Soon', color: 'bg-primary/15 text-primary' },
  public: { icon: <Zap size={12} />, label: 'Public', color: 'bg-success/15 text-success' },
  sold: { icon: <CheckCircle2 size={12} />, label: 'Sold', color: 'bg-success/15 text-success' },
  expired: { icon: <Clock size={12} />, label: 'Expired', color: 'bg-destructive/15 text-destructive' },
};

const ListingsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const filtered = activeTab === 'all' ? LISTINGS : LISTINGS.filter((l) => l.status === activeTab);
  const counts: Record<string, number> = {};
  LISTINGS.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });

  return (
    <div>
      <DashboardHeader
        title="My Listings"
        actions={
          <Button size="sm" onClick={() => navigate('/pocket-listing')} className="gap-1.5 text-xs">
            <Plus size={14} /> New Listing
          </Button>
        }
      />

      <div className="p-4 sm:p-6 max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary mb-4 flex-wrap h-auto gap-1 p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'whisper', label: 'Whisper' },
              { key: 'coming-soon', label: 'Coming Soon' },
              { key: 'public', label: 'Public' },
              { key: 'sold', label: 'Sold' },
            ].map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs gap-1">
                {t.label}
                {t.key !== 'all' && counts[t.key] && (
                  <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-0.5">{counts[t.key]}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          {filtered.map((l) => {
            const s = STATUS_CONFIG[l.status];
            const daysColor = l.days < 7 ? 'text-success' : l.days < 15 ? 'text-primary' : 'text-destructive';
            return (
              <div key={l.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4">
                <img src={l.thumb} alt="" className="w-full sm:w-28 h-20 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`${s.color} text-[10px] gap-0.5 border-0`}>{s.icon} {s.label}</Badge>
                    <span className={`text-xs font-bold ${daysColor}`}>{l.days}d</span>
                  </div>
                  <h3 className="font-display text-sm font-bold truncate">{l.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{l.address}</p>
                  <p className="text-sm font-display font-bold text-primary mt-1">{l.price}</p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye size={10} /> {l.views}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles size={10} /> {l.leads} leads</span>
                  <div className="flex gap-1 mt-1">
                    <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2">Edit</Button>
                    {l.status !== 'public' && l.status !== 'sold' && (
                      <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 gap-0.5">
                        <Rocket size={10} /> Boost
                      </Button>
                    )}
                    {l.status !== 'sold' && (
                      <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-success">Mark Sold</Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ListingsPage;
