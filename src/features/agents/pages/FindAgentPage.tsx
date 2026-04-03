import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAgentSearch } from '@/features/agents/hooks/useAgentSearch';
import { AgentSearchCard } from '@/features/agents/components/AgentSearchCard';
import { AgentSearchFilters } from '@/features/agents/components/AgentSearchFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/shared/components/layout/BottomNav';
import type { AgentFilters } from '@/features/agents/types';

export default function FindAgentPage() {
  const [filters, setFilters] = useState<AgentFilters>({});
  const [page, setPage] = useState(0);
  const { results, total, loading } = useAgentSearch(filters, page);

  return (
    <>
      <Helmet>
        <title>Find a Real Estate Agent in Australia</title>
        <meta name="description" content="Compare real estate agents by reviews, sales history, and suburb expertise across Australia." />
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        {/* Hero */}
        <div className="bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90 text-background">
          <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
            <h1 className="text-3xl sm:text-4xl font-bold">Find the right agent for your property</h1>
            <p className="text-background/70 mt-2 max-w-xl">
              Browse agents across Australia. Read real reviews, compare sales history, and connect directly.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          <AgentSearchFilters filters={filters} onChange={f => { setFilters(f); setPage(0); }} resultCount={total} />
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto px-4 pb-8">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg font-medium text-foreground">No agents found</p>
              <p className="text-sm text-muted-foreground mt-1">Try widening your search filters.</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map(agent => (
                  <AgentSearchCard key={agent.agent_id} agent={agent} />
                ))}
              </div>

              {/* Pagination */}
              {total > 24 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 border border-border rounded-xl text-sm font-medium disabled:opacity-30"
                  >
                    ← Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-muted-foreground">
                    Page {page + 1} of {Math.ceil(total / 24)}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * 24 >= total}
                    className="px-4 py-2 border border-border rounded-xl text-sm font-medium disabled:opacity-30"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <BottomNav />
      </div>
    </>
  );
}
