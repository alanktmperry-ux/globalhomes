import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StrataSchemeCard } from '../components/StrataSchemeCard';

const STATES = ['All', 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const SCORE_BANDS = [
  { label: 'All Scores', value: 'all' },
  { label: 'Healthy (75+)', value: 'healthy' },
  { label: 'Monitor (50–74)', value: 'monitor' },
  { label: 'At Risk (<50)', value: 'risk' },
];

export default function StrataDirectoryPage() {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [scoreBand, setScoreBand] = useState('all');

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ['strata-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strata_schemes')
        .select('id, scheme_name, suburb, state, total_lots, admin_fund_levy_per_lot, capital_works_levy_per_lot, strata_health_score, building_type')
        .order('strata_health_score', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = schemes.filter(s => {
    if (search && !s.scheme_name.toLowerCase().includes(search.toLowerCase()) && !s.suburb.toLowerCase().includes(search.toLowerCase())) return false;
    if (stateFilter !== 'All' && s.state !== stateFilter) return false;
    if (scoreBand === 'healthy' && (s.strata_health_score == null || s.strata_health_score < 75)) return false;
    if (scoreBand === 'monitor' && (s.strata_health_score == null || s.strata_health_score < 50 || s.strata_health_score >= 75)) return false;
    if (scoreBand === 'risk' && (s.strata_health_score == null || s.strata_health_score >= 50)) return false;
    return true;
  });

  return (
    <>
      <Helmet>
        <title>Strata Directory — Building Health Scores | ListHQ</title>
        <meta name="description" content="Browse strata scheme profiles across Australia. View Strata Health Scores, levy data, and building financial health." />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Strata Directory</h1>
          <p className="text-muted-foreground text-sm mt-1">Browse strata scheme financial health across Australia</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or suburb..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={scoreBand} onValueChange={setScoreBand}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SCORE_BANDS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={24} /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No schemes found matching your criteria.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => <StrataSchemeCard key={s.id} scheme={s} />)}
          </div>
        )}
      </div>
    </>
  );
}
