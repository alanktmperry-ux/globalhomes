import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Building2, Calendar, MapPin, Shield, AlertTriangle, Home, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StrataHealthBadge } from '../components/StrataHealthBadge';

export default function SchemeProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data: scheme, isLoading } = useQuery({
    queryKey: ['strata-scheme', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strata_schemes')
        .select('*, strata_managers(company_name, phone, website)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>
  );

  if (!scheme) return (
    <div className="flex items-center justify-center min-h-screen text-muted-foreground">Scheme not found</div>
  );

  const totalQuarterlyLevy = (Number(scheme.admin_fund_levy_per_lot || 0) + Number(scheme.capital_works_levy_per_lot || 0));
  const sinkingPct = scheme.sinking_fund_target && scheme.sinking_fund_target > 0
    ? Math.min(100, (Number(scheme.sinking_fund_balance || 0) / Number(scheme.sinking_fund_target)) * 100)
    : null;

  return (
    <>
      <Helmet>
        <title>{scheme.scheme_name} — Strata Profile | ListHQ</title>
        <meta name="description" content={`Strata scheme profile for ${scheme.scheme_name} in ${scheme.suburb}, ${scheme.state}. View levy data, financial health score, and building details.`} />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{scheme.scheme_name}</h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin size={14} /> {scheme.address}, {scheme.suburb} {scheme.state} {scheme.postcode}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Home size={14} /> {scheme.total_lots} lots</span>
              {scheme.year_built && <span>Built {scheme.year_built}</span>}
              {scheme.building_type && <span className="flex items-center gap-1"><Building2 size={14} /> {scheme.building_type}</span>}
            </div>
          </div>
          <StrataHealthBadge score={scheme.strata_health_score} size="lg" />
        </div>

        {/* Financial Summary */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Financial Summary</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Admin Fund Levy</p>
              <p className="text-lg font-semibold">${scheme.admin_fund_levy_per_lot ?? '—'}<span className="text-xs text-muted-foreground font-normal"> /lot/qtr</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Capital Works Levy</p>
              <p className="text-lg font-semibold">${scheme.capital_works_levy_per_lot ?? '—'}<span className="text-xs text-muted-foreground font-normal"> /lot/qtr</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Quarterly Levy</p>
              <p className="text-lg font-bold text-primary">${totalQuarterlyLevy.toLocaleString()}<span className="text-xs text-muted-foreground font-normal"> /lot/qtr</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sinking Fund</p>
              {sinkingPct != null ? (
                <>
                  <Progress value={sinkingPct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    ${Number(scheme.sinking_fund_balance).toLocaleString()} / ${Number(scheme.sinking_fund_target).toLocaleString()} ({Math.round(sinkingPct)}%)
                  </p>
                </>
              ) : <p className="text-sm text-muted-foreground">Not disclosed</p>}
            </div>
          </CardContent>
        </Card>

        {/* Special Levy */}
        {scheme.special_levy_issued_5yr && (
          <Card className="border-amber-500/40">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-medium text-foreground">Special Levy Issued</p>
                <p className="text-sm text-muted-foreground">
                  ${Number(scheme.special_levy_amount || 0).toLocaleString()} — {scheme.special_levy_reason || 'No reason provided'} ({scheme.special_levy_year})
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Defects */}
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className={`shrink-0 mt-0.5 ${scheme.building_defects_disclosed ? 'text-destructive' : 'text-emerald-500'}`} size={18} />
            <div>
              <p className="font-medium text-foreground">
                {scheme.building_defects_disclosed ? 'Defects Disclosed' : 'No Known Defects'}
              </p>
              {scheme.building_defects_disclosed && scheme.defect_description && (
                <p className="text-sm text-muted-foreground">{scheme.defect_description}</p>
              )}
              {scheme.defect_bond_active && (
                <p className="text-xs text-muted-foreground mt-1">Defect bond protection is active</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Manager & AGM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {scheme.strata_managers && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Managed By</p>
                <p className="font-semibold text-foreground">{(scheme.strata_managers as any).company_name}</p>
              </CardContent>
            </Card>
          )}
          {scheme.agm_last_held && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={12} /> Last AGM</p>
                <p className="font-semibold text-foreground">{new Date(scheme.agm_last_held).toLocaleDateString('en-AU')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
