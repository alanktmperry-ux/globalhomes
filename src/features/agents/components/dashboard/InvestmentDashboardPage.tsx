import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  TrendingUp, CheckCircle2, XCircle, AlertTriangle, DollarSign, Home,
  BarChart3, Users, Shield, Landmark,
} from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface InvestmentProperty {
  id: string;
  title: string;
  address: string;
  suburb: string;
  state: string;
  country: string;
  price: number;
  rental_yield_pct: number | null;
  str_permitted: boolean | null;
  rental_weekly: number | null;
  property_type: string | null;
  beds: number;
  baths: number;
  sqm: number;
  agent_specialization: string | null;
  lead_count: number;
  trust_deposit_total: number;
  trust_pending_total: number;
}

type InvestmentGrade = 'A' | 'B' | 'C';

function calcInvestmentScore(p: InvestmentProperty): { grade: InvestmentGrade; score: number } {
  let score = 0;

  // Yield scoring (0-40 pts)
  const yld = p.rental_yield_pct || 0;
  if (yld >= 8) score += 40;
  else if (yld >= 6) score += 30;
  else if (yld >= 4) score += 20;
  else if (yld > 0) score += 10;

  // STR status (0-30 pts)
  if (p.str_permitted === true) score += 30;
  else if (p.str_permitted === null) score += 10;

  // Foreign buyer (country != 'Australia' means international market appeal) (0-20 pts)
  if (p.country !== 'Australia') score += 20;
  else score += 10; // domestic still gets partial credit

  // Lead activity (0-10 pts)
  if (p.lead_count >= 5) score += 10;
  else if (p.lead_count >= 2) score += 5;

  const grade: InvestmentGrade = score >= 70 ? 'A' : score >= 40 ? 'B' : 'C';
  return { grade, score };
}

const GRADE_STYLES: Record<InvestmentGrade, string> = {
  A: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  B: 'bg-primary/10 text-primary border-primary/30',
  C: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
};

const YIELD_RANGES = [
  { value: 'all', label: 'Any Yield' },
  { value: '4-6', label: '4-6%' },
  { value: '6-8', label: '6-8%' },
  { value: '8+', label: '8%+' },
];

const PRICE_RANGES = [
  { value: 'all', label: 'Any Price' },
  { value: '0-500000', label: 'Under $500k' },
  { value: '500000-1000000', label: '$500k–$1m' },
  { value: '500000-2000000', label: '$500k–$2m' },
  { value: '1000000-5000000', label: '$1m–$5m' },
  { value: '2000000+', label: '$2m+' },
];

const NICHE_OPTIONS = [
  { value: 'all', label: 'All Niches' },
  { value: 'Residential', label: 'Residential' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Rural', label: 'Rural' },
  { value: 'Luxury', label: 'Luxury' },
];

const InvestmentDashboardPage = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<InvestmentProperty[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [strOnly, setStrOnly] = useState(true);
  const [foreignOk, setForeignOk] = useState(true);
  const [yieldRange, setYieldRange] = useState('6-8');
  const [priceRange, setPriceRange] = useState('500000-2000000');
  const [niche, setNiche] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Fetch properties with agent info
      const { data: props } = await supabase
        .from('properties')
        .select('id, title, address, suburb, state, country, price, rental_yield_pct, str_permitted, rental_weekly, property_type, beds, baths, sqm, agents(specialization)')
        .eq('is_active', true)
        .order('price', { ascending: false })
        .limit(200);

      if (!props) { setLoading(false); return; }

      // Fetch lead counts per property
      const propIds = props.map(p => p.id);
      const { data: leads } = await supabase
        .from('leads')
        .select('property_id')
        .in('property_id', propIds);

      const leadCounts: Record<string, number> = {};
      (leads || []).forEach(l => {
        leadCounts[l.property_id] = (leadCounts[l.property_id] || 0) + 1;
      });

      // Fetch trust receipts and payments per property
      const { data: trustReceipts } = await supabase
        .from('trust_receipts')
        .select('property_id, amount, status')
        .in('property_id', propIds);
      const { data: trustPayments } = await supabase
        .from('trust_payments')
        .select('property_id, amount, status')
        .in('property_id', propIds);

      const trustDeposits: Record<string, number> = {};
      const trustPending: Record<string, number> = {};
      (trustReceipts || []).forEach((t: any) => {
        if (!t.property_id) return;
        if (t.status === 'deposited' || t.status === 'reconciled') {
          trustDeposits[t.property_id] = (trustDeposits[t.property_id] || 0) + Number(t.amount);
        } else if (t.status === 'received') {
          trustPending[t.property_id] = (trustPending[t.property_id] || 0) + Number(t.amount);
        }
      });

      const mapped: InvestmentProperty[] = props.map((p: any) => ({
        id: p.id,
        title: p.title,
        address: p.address,
        suburb: p.suburb,
        state: p.state,
        country: p.country,
        price: p.price,
        rental_yield_pct: p.rental_yield_pct,
        str_permitted: p.str_permitted,
        rental_weekly: p.rental_weekly,
        property_type: p.property_type,
        beds: p.beds,
        baths: p.baths,
        sqm: p.sqm,
        agent_specialization: p.agents?.specialization || null,
        lead_count: leadCounts[p.id] || 0,
        trust_deposit_total: trustDeposits[p.id] || 0,
        trust_pending_total: trustPending[p.id] || 0,
      }));

      setProperties(mapped);
      setLoading(false);
    };
    load();
  }, [user]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = properties;

    if (strOnly) list = list.filter(p => p.str_permitted === true);
    if (foreignOk) list = list.filter(p => p.country !== 'Australia');

    if (yieldRange !== 'all') {
      if (yieldRange === '8+') {
        list = list.filter(p => (p.rental_yield_pct || 0) >= 8);
      } else {
        const [min, max] = yieldRange.split('-').map(Number);
        list = list.filter(p => {
          const y = p.rental_yield_pct || 0;
          return y >= min && y <= max;
        });
      }
    }

    if (priceRange !== 'all') {
      if (priceRange.endsWith('+')) {
        const min = parseInt(priceRange);
        list = list.filter(p => p.price >= min);
      } else {
        const [min, max] = priceRange.split('-').map(Number);
        list = list.filter(p => p.price >= min && p.price <= max);
      }
    }

    if (niche !== 'all') {
      list = list.filter(p => p.agent_specialization === niche);
    }

    return list;
  }, [properties, strOnly, foreignOk, yieldRange, priceRange, niche]);

  // Stats
  const avgYield = useMemo(() => {
    const withYield = filtered.filter(p => p.rental_yield_pct && p.rental_yield_pct > 0);
    if (withYield.length === 0) return 0;
    return withYield.reduce((s, p) => s + (p.rental_yield_pct || 0), 0) / withYield.length;
  }, [filtered]);

  const totalLeads = filtered.reduce((s, p) => s + p.lead_count, 0);
  const totalTrustHeld = filtered.reduce((s, p) => s + p.trust_deposit_total, 0);
  const strCount = filtered.filter(p => p.str_permitted === true).length;

  // Show all properties if filters return nothing (fallback without the toggle filters)
  const displayList = useMemo(() => {
    if (filtered.length > 0) return filtered;
    // If zero results with current toggles, show unfiltered but sorted
    if (strOnly || foreignOk) return [];
    return properties;
  }, [filtered, properties, strOnly, foreignOk]);

  if (loading) {
    return (
      <div>
        <DashboardHeader title="Investment Dashboard" subtitle="High-yield property analysis" />
        <div className="p-6 text-center text-muted-foreground">Loading investment data…</div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title="Investment Dashboard" subtitle="High-yield property analysis for agents" />
      <div className="p-4 sm:p-6 max-w-[1600px] space-y-5">

        {/* ── Performance Snapshot ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-green-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Avg Yield</p>
                <p className="text-lg font-bold">{avgYield.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Home size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">STR-Legal</p>
                <p className="text-lg font-bold">{strCount} <span className="text-xs text-muted-foreground font-normal">of {filtered.length}</span></p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Users size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Active Leads</p>
                <p className="text-lg font-bold">{totalLeads}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <Landmark size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Trust Held</p>
                <p className="text-lg font-bold">{AUD.format(totalTrustHeld)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Investment Filters ── */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <Switch id="str-filter" checked={strOnly} onCheckedChange={setStrOnly} />
                <Label htmlFor="str-filter" className="text-xs font-medium cursor-pointer">STR-Friendly Only</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="foreign-filter" checked={foreignOk} onCheckedChange={setForeignOk} />
                <Label htmlFor="foreign-filter" className="text-xs font-medium cursor-pointer">Foreign Buyer OK</Label>
              </div>

              <Select value={yieldRange} onValueChange={setYieldRange}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <TrendingUp size={12} className="mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YIELD_RANGES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <DollarSign size={12} className="mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_RANGES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <Shield size={12} className="mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NICHE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground ml-auto">{displayList.length} properties match</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Properties Table ── */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Property</TableHead>
                <TableHead className="text-xs">Score</TableHead>
                <TableHead className="text-xs text-right">Price</TableHead>
                <TableHead className="text-xs text-right">Yield Est.</TableHead>
                <TableHead className="text-xs">STR Status</TableHead>
                <TableHead className="text-xs">Foreign OK</TableHead>
                <TableHead className="text-xs">Trust Entries</TableHead>
                <TableHead className="text-xs text-right">Leads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                    No properties match your investment filters. Try adjusting the criteria above.
                  </TableCell>
                </TableRow>
              ) : (
                displayList.map(p => {
                  const { grade } = calcInvestmentScore(p);
                  const isForeignOk = p.country !== 'Australia';
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="text-xs font-semibold truncate max-w-[220px]">{p.address}</p>
                          <p className="text-[10px] text-muted-foreground">{p.suburb}, {p.state} • {p.property_type} • {p.beds}bd {p.baths}ba</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-bold px-2 ${GRADE_STYLES[grade]}`}>
                          {grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold">{AUD.format(p.price)}</TableCell>
                      <TableCell className="text-xs text-right">
                        {p.rental_yield_pct
                          ? <span className={p.rental_yield_pct >= 6 ? 'text-green-600 font-semibold' : ''}>{p.rental_yield_pct.toFixed(1)}%</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        {p.str_permitted === true && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 size={13} /> Legal
                          </span>
                        )}
                        {p.str_permitted === false && (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <XCircle size={13} /> No
                          </span>
                        )}
                        {p.str_permitted === null && (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-500">
                            <AlertTriangle size={13} /> Unknown
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isForeignOk ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 size={13} /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <XCircle size={13} /> No
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {p.trust_deposit_total > 0 && (
                            <span className="text-green-600 font-medium">{AUD.format(p.trust_deposit_total)} deposit</span>
                          )}
                          {p.trust_pending_total > 0 && (
                            <span className="text-orange-500 font-medium">{p.trust_deposit_total > 0 ? ' · ' : ''}{AUD.format(p.trust_pending_total)} pending</span>
                          )}
                          {p.trust_deposit_total === 0 && p.trust_pending_total === 0 && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {p.lead_count > 0 ? (
                          <Badge variant="secondary" className="text-[10px]">{p.lead_count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
};

export default InvestmentDashboardPage;
