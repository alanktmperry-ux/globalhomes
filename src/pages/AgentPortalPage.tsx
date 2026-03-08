import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, MousePointerClick, TrendingUp, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { mockProperties } from '@/lib/mock-data';

const AgentPortalPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'dashboard' | 'subscribe'>('dashboard');

  // Mock agent data
  const agentListings = mockProperties.filter(p => p.agent.id === 'a1');
  const totalViews = agentListings.reduce((s, p) => s + p.views, 0);
  const totalClicks = agentListings.reduce((s, p) => s + p.contactClicks, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">{t('agent.portal')}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['dashboard', 'subscribe'] as const).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === tabKey ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {tabKey === 'dashboard' ? t('agent.dashboard') : t('agent.subscribe')}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={16} className="text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">{t('agent.views')}</span>
                </div>
                <p className="font-display text-2xl font-bold text-foreground">{totalViews}</p>
                <p className="text-xs text-success flex items-center gap-1 mt-1">
                  <TrendingUp size={12} /> +12% this week
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointerClick size={16} className="text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">{t('agent.clicks')}</span>
                </div>
                <p className="font-display text-2xl font-bold text-foreground">{totalClicks}</p>
                <p className="text-xs text-success flex items-center gap-1 mt-1">
                  <TrendingUp size={12} /> +8% this week
                </p>
              </div>
            </div>

            {/* Listings */}
            <div>
              <h3 className="font-display font-semibold text-foreground mb-3">Your Listings</h3>
              <div className="space-y-3">
                {agentListings.map(listing => (
                  <div key={listing.id} className="flex gap-3 p-3 rounded-xl bg-card border border-border">
                    <img src={listing.imageUrl} alt={listing.title} className="w-16 h-16 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">{listing.priceFormatted}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye size={11} /> {listing.views}</span>
                        <span className="flex items-center gap-1"><MousePointerClick size={11} /> {listing.contactClicks}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'subscribe' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Crown size={24} className="text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Pro Agent</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Unlock direct leads, show your contact details to property seekers, and get analytics on your listings.
              </p>
              <p className="font-display text-3xl font-bold text-foreground mb-1">$49<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground mb-5">Cancel anytime</p>
              <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-transform active:scale-[0.98]">
                {t('agent.subscribe')}
              </button>
              <ul className="mt-5 space-y-2 text-sm text-left">
                {[
                  'Full contact details visible to seekers',
                  'Direct call button on your listings',
                  'Lead analytics & view tracking',
                  'Priority listing placement',
                  'Monthly performance reports',
                ].map(feature => (
                  <li key={feature} className="flex items-start gap-2 text-muted-foreground">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default AgentPortalPage;
