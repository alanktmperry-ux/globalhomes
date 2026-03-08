import { Users, Search, DollarSign, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import DashboardHeader from './DashboardHeader';

const NETWORK_LISTINGS = [
  { id: '1', address: '99 Chapel St, Prahran', agent: 'James Wilson', agency: 'McGrath', price: '$1.2M – $1.3M', split: '60/40', type: 'Townhouse', beds: 3, baths: 2, desc: 'Beautifully renovated townhouse, walking distance to Chapel St shops.' },
  { id: '2', address: '5 Toorak Rd, South Yarra', agent: 'Sarah Mitchell', agency: 'Ray White', price: '$2.8M+', split: '55/45', type: 'House', beds: 5, baths: 3, desc: 'Grand period home with pool, landscaped gardens.' },
  { id: '3', address: '12 Albert Park, Albert Park', agent: 'Tom Chen', agency: 'Jellis Craig', price: '$1.6M – $1.8M', split: '60/40', type: 'Apartment', beds: 3, baths: 2, desc: 'Penthouse with bay views, premium fittings throughout.' },
  { id: '4', address: '88 Fitzroy St, St Kilda', agent: 'Emma Brown', agency: 'Nelson Alexander', price: '$950K – $1.05M', split: '50/50', type: 'Apartment', beds: 2, baths: 1, desc: 'Art deco charm, beach lifestyle, excellent returns.' },
];

const NetworkPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery
    ? NETWORK_LISTINGS.filter((l) =>
        `${l.address} ${l.type} ${l.desc}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : NETWORK_LISTINGS;

  return (
    <div>
      <DashboardHeader title="Off-Market Network" subtitle="Browse pocket listings from other agents" />

      <div className="p-4 sm:p-6 max-w-5xl space-y-4">
        {/* Search/filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Show me pocket listings in my area..."
              className="pl-9 bg-secondary border-border"
            />
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2 text-xs">
          <Handshake size={14} className="text-primary shrink-0" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">Co-broke opportunity:</strong> Bring your buyer to another agent's listing and split the commission.
          </span>
        </div>

        <div className="space-y-3">
          {filtered.map((l) => (
            <div key={l.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{l.type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{l.beds}B/{l.baths}B</Badge>
                  </div>
                  <h3 className="font-display text-sm font-bold">{l.address}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Agent: <strong className="text-foreground">{l.agent}</strong> · {l.agency}
                  </p>
                </div>

                <div className="shrink-0 text-right space-y-2">
                  <p className="font-display text-lg font-bold text-primary">{l.price}</p>
                  <div className="bg-secondary rounded-lg px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">Commission Split</p>
                    <p className="text-sm font-bold flex items-center justify-end gap-1">
                      <DollarSign size={12} className="text-success" /> {l.split}
                    </p>
                  </div>
                  <Button size="sm" className="w-full text-xs gap-1">
                    <Users size={12} /> Request Introduction
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NetworkPage;
