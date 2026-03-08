import { motion } from 'framer-motion';
import { Mic, Phone, Send, Calendar, Flame, Thermometer, Snowflake, Sparkles, Eye, MessageSquare, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardHeader from './DashboardHeader';

const URGENCY_CONFIG = {
  hot: { icon: <Flame size={12} />, color: 'bg-destructive/15 text-destructive', label: 'Hot' },
  warm: { icon: <Thermometer size={12} />, color: 'bg-primary/15 text-primary', label: 'Warm' },
  cold: { icon: <Snowflake size={12} />, color: 'bg-muted text-muted-foreground', label: 'Cold' },
};

const MOCK_MATCHES = [
  {
    id: '1',
    transcript: '3 bed house in Berwick with pool under $900k',
    buyerLocation: 'Melbourne CBD',
    urgency: 'hot' as const,
    time: '12 min ago',
    matchedListing: '42 Panorama Drive',
  },
  {
    id: '2',
    transcript: 'Investment property near train station, 2 bed apartment',
    buyerLocation: 'Sydney (relocating)',
    urgency: 'warm' as const,
    time: '1h ago',
    matchedListing: '15 Station Street',
  },
  {
    id: '3',
    transcript: 'Looking for land in officer area, 600sqm minimum',
    buyerLocation: 'Pakenham',
    urgency: 'cold' as const,
    time: '3h ago',
    matchedListing: 'Lot 12 Officer South',
  },
];

const MOCK_LISTINGS = [
  { id: '1', thumb: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=80&h=60&fit=crop', address: '42 Panorama Drive, Berwick', status: 'whisper', views: 24, voiceInquiries: 3, qualifiedLeads: 2, daysListed: 4 },
  { id: '2', thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=80&h=60&fit=crop', address: '15 Station St, Narre Warren', status: 'coming-soon', views: 67, voiceInquiries: 8, qualifiedLeads: 5, daysListed: 11 },
  { id: '3', thumb: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=80&h=60&fit=crop', address: '8 Ocean View Rd, Brighton', status: 'public', views: 142, voiceInquiries: 12, qualifiedLeads: 7, daysListed: 18 },
];

const MOCK_NETWORK = [
  { id: '1', address: '99 Chapel St, Prahran', agent: 'James W.', price: '$1.2M – $1.3M', split: '60/40', type: 'Townhouse', beds: 3 },
  { id: '2', address: '5 Toorak Rd, South Yarra', agent: 'Sarah M.', price: '$2.8M+', split: '55/45', type: 'House', beds: 5 },
];

const DashboardOverview = () => {
  const stats = [
    { label: 'Active Listings', value: '12', icon: <Zap size={16} />, color: 'text-primary' },
    { label: 'Voice Matches Today', value: '7', icon: <Mic size={16} />, color: 'text-success' },
    { label: 'Qualified Leads', value: '14', icon: <MessageSquare size={16} />, color: 'text-primary' },
    { label: 'Offers Pending', value: '2', icon: <TrendingUp size={16} />, color: 'text-destructive' },
  ];

  return (
    <div>
      <DashboardHeader title="Dashboard" subtitle="Welcome back, Agent" />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <span className={s.color}>{s.icon}</span>
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="font-display text-2xl font-extrabold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Voice Matches */}
        <section>
          <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2">
            <Mic size={16} className="text-success" /> Today's Voice Matches
          </h2>
          <div className="space-y-2">
            {MOCK_MATCHES.map((m) => {
              const u = URGENCY_CONFIG[m.urgency];
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${u.color} text-[10px] gap-0.5 border-0`}>
                        {u.icon} {u.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{m.time}</span>
                    </div>
                    <p className="text-sm font-medium truncate">"{m.transcript}"</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      📍 {m.buyerLocation} → Matched: <strong>{m.matchedListing}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 gap-1">
                      <Phone size={10} /> Call
                    </Button>
                    <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 gap-1">
                      <Send size={10} /> Info
                    </Button>
                    <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 gap-1">
                      <Calendar size={10} /> View
                    </Button>
                    <Button size="sm" className="text-[10px] h-7 px-2 gap-1">
                      <Sparkles size={10} /> AI Reply
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Listing Performance */}
        <section>
          <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2">
            <Eye size={16} className="text-primary" /> Listing Performance
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left p-3">Property</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-center p-3">Views</th>
                  <th className="text-center p-3">Voice</th>
                  <th className="text-center p-3">Leads</th>
                  <th className="text-center p-3">Days</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_LISTINGS.map((l) => {
                  const daysColor = l.daysListed < 7 ? 'text-success' : l.daysListed < 15 ? 'text-primary' : 'text-destructive';
                  const statusLabel = l.status === 'whisper' ? '🤫 Whisper' : l.status === 'coming-soon' ? '🔜 Soon' : '🟢 Live';
                  return (
                    <tr key={l.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <img src={l.thumb} alt="" className="w-10 h-8 rounded-md object-cover shrink-0" />
                          <span className="text-xs font-medium truncate max-w-[180px]">{l.address}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-semibold">{statusLabel}</span>
                      </td>
                      <td className="p-3 text-center font-medium">{l.views}</td>
                      <td className="p-3 text-center font-medium">{l.voiceInquiries}</td>
                      <td className="p-3 text-center font-medium">{l.qualifiedLeads}</td>
                      <td className={`p-3 text-center font-bold ${daysColor}`}>{l.daysListed}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2">Edit</Button>
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2">Boost</Button>
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-success">Sold</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Whisper Network */}
        <section>
          <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" /> Whisper Network
            <span className="text-xs text-muted-foreground font-normal">— Off-market listings from other agents</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {MOCK_NETWORK.map((n) => (
              <div key={n.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-semibold">{n.address}</p>
                    <p className="text-xs text-muted-foreground">{n.type} · {n.beds} bed · Agent: {n.agent}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Split: {n.split}</Badge>
                </div>
                <p className="text-base font-display font-bold text-primary mb-3">{n.price}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7">View Details</Button>
                  <Button size="sm" className="flex-1 text-[10px] h-7">Request Introduction</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardOverview;
