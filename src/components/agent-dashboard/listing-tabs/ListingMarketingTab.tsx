import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Eye, Share2, Globe, Mail, Megaphone } from 'lucide-react';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface Props {
  listing: any;
}

const ListingMarketingTab = ({ listing }: Props) => {
  const budget = listing.marketing_budget || 0;

  // Mock marketing campaign data
  const campaigns = [
    { channel: 'REA / Domain', status: 'active', spend: 450, impressions: 12400, clicks: 342, icon: <Globe size={14} /> },
    { channel: 'Social Media Ads', status: 'active', spend: 280, impressions: 8900, clicks: 215, icon: <Share2 size={14} /> },
    { channel: 'Email Campaign', status: 'sent', spend: 0, impressions: 1200, clicks: 89, icon: <Mail size={14} /> },
    { channel: 'Print / Signboard', status: 'active', spend: 350, impressions: 0, clicks: 0, icon: <Megaphone size={14} /> },
  ];

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);

  return (
    <div className="space-y-6">
      {/* Marketing Budget Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase">Budget</p>
          <p className="text-lg font-display font-bold">{AUD.format(budget)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase">Spent</p>
          <p className="text-lg font-display font-bold text-destructive">{AUD.format(totalSpend)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase">Total Views</p>
          <p className="text-lg font-display font-bold">{listing.views?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase">Enquiries</p>
          <p className="text-lg font-display font-bold text-primary">{listing.contact_clicks || 0}</p>
        </div>
      </div>

      {/* Campaigns */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> Marketing Campaigns
          </h3>
          <Button size="sm" variant="outline" className="text-xs">+ Add Campaign</Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left p-3">Channel</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Spend</th>
              <th className="text-right p-3">Impressions</th>
              <th className="text-right p-3">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-accent/30">
                <td className="p-3 flex items-center gap-2">{c.icon} {c.channel}</td>
                <td className="p-3">
                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                    {c.status}
                  </Badge>
                </td>
                <td className="p-3 text-right">{AUD.format(c.spend)}</td>
                <td className="p-3 text-right">{c.impressions.toLocaleString()}</td>
                <td className="p-3 text-right">{c.clicks.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListingMarketingTab;
