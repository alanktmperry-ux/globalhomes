import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSavedSearchesDB } from '../hooks/useSavedSearchesDB';
import { SavedSearchCard } from '../components/SavedSearchCard';
import { WatchlistPanel } from '../components/WatchlistPanel';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import { Bell, Heart } from 'lucide-react';

export default function SavedSearchesPage() {
  const {
    searches, loading, deleteSearch, clearBadge, updateSearch
  } = useSavedSearchesDB();
  const [tab, setTab] = useState<'searches' | 'watchlist'>('watchlist');

  return (
    <>
      <Helmet>
        <title>My Searches & Watchlist — ListHQ</title>
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
          <div className="max-w-lg mx-auto px-4 py-4">
            <h1 className="font-display text-xl font-bold text-foreground">
              Searches & Watchlist
            </h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-2xl mb-4">
            {[
              { value: 'watchlist' as const, label: 'Watchlist', icon: <Heart className="w-4 h-4" /> },
              { value: 'searches' as const, label: 'Saved Searches', icon: <Bell className="w-4 h-4" /> },
            ].map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                           text-sm font-medium transition
                  ${tab === t.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {t.icon}
                {t.label}
                {t.value === 'searches' &&
                  searches.reduce((s, r) => s + r.new_match_count, 0) > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {searches.reduce((s, r) => s + r.new_match_count, 0)}
                    </span>
                  )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'searches' && (
            <div>
              {loading && (
                <div className="space-y-4">
                  {[1, 2].map(i => <div key={i} className="h-32 bg-muted/50 rounded-2xl animate-pulse" />)}
                </div>
              )}
              {!loading && searches.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Bell className="w-10 h-10 mb-3 text-border" strokeWidth={1.2} />
                  <p className="text-sm font-medium text-foreground mb-1">No saved searches yet</p>
                  <p className="text-xs text-muted-foreground text-center max-w-[220px]">
                    Run a search and click "Save Search" to get alerts
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {searches.map(s => (
                  <SavedSearchCard
                    key={s.id}
                    search={s}
                    onDelete={deleteSearch}
                    onClearBadge={clearBadge}
                    onUpdateFreq={(id, freq) =>
                      updateSearch(id, { alert_frequency: freq as any })}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === 'watchlist' && <WatchlistPanel />}
        </main>

        <BottomNav />
      </div>
    </>
  );
}
