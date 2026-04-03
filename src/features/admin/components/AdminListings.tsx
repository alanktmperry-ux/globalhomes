import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PropertyRow {
  id: string;
  title: string;
  address: string;
  suburb: string;
  price_formatted: string;
  is_active: boolean;
  views: number;
  created_at: string;
  is_featured: boolean;
  featured_until: string | null;
  boost_tier: string | null;
  boost_requested_at: string | null;
  boost_requested_tier: string | null;
}

interface Props {
  properties: PropertyRow[];
  onToggleActive: (id: string, isActive: boolean) => void;
  onActivateBoost: (id: string, tier: 'featured' | 'premier', days: number) => void;
}

const AdminListings = ({ properties, onToggleActive, onActivateBoost }: Props) => {
  interface ActiveTenancy {
    id: string;
    tenant_name: string;
    lease_end: string | null;
    status: string;
  }

  const [tenancyWarning, setTenancyWarning] = useState<{
    propertyId: string;
    isActive: boolean;
    tenancy: ActiveTenancy;
  } | null>(null);
  const [checking, setChecking] = useState<string | null>(null);

  const handleDeactivateClick = async (id: string, isActive: boolean) => {
    // Only check on deactivation, not activation
    if (!isActive) {
      onToggleActive(id, isActive);
      return;
    }
    setChecking(id);
    try {
      const { data } = await supabase
        .from('tenancies')
        .select('id, tenant_name, lease_end, status')
        .eq('property_id', id)
        .in('status', ['active', 'vacating'])
        .limit(1)
        .maybeSingle();

      if (data) {
        setTenancyWarning({ propertyId: id, isActive, tenancy: data as ActiveTenancy });
      } else {
        onToggleActive(id, isActive);
      }
    } catch {
      // If check fails, allow action to proceed
      onToggleActive(id, isActive);
    } finally {
      setChecking(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-muted-foreground font-medium">Property</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Price</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Views</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Boost</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => {
                const isFeaturedActive = p.is_featured && p.featured_until && new Date(p.featured_until) > new Date();
                const isBoostPending = p.boost_requested_at && !p.is_featured;

                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                    <td className="p-3">
                      <p className="text-foreground font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.address}, {p.suburb}</p>
                    </td>
                    <td className="p-3 text-foreground">{p.price_formatted}</td>
                    <td className="p-3 text-muted-foreground">{p.views}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.is_active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                      }`}>{p.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="p-3">
                      {isFeaturedActive ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-500/20 text-teal-500">
                          {p.boost_tier === 'premier' ? 'Premier' : 'Featured'} · expires {format(parseISO(p.featured_until!), 'dd MMM')}
                        </span>
                      ) : isBoostPending ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-500 w-fit">
                            Pending {p.boost_requested_tier}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => onActivateBoost(p.id, 'featured', 30)}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-teal-500/15 text-teal-500 hover:bg-teal-500/25 transition-colors"
                            >
                              Activate Featured
                            </button>
                            <button
                              onClick={() => onActivateBoost(p.id, 'premier', 30)}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                            >
                              Activate Premier
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No boost</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeactivateClick(p.id, p.is_active)}
                        disabled={checking === p.id}
                        className="text-xs px-3 py-1 rounded-lg bg-secondary text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        {checking === p.id ? 'Checking…' : p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {properties.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">No listings yet</p>
        )}
      </div>

      {/* Active Tenancy Safety Dialog */}
      <Dialog open={!!tenancyWarning} onOpenChange={() => setTenancyWarning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Active Tenancy Detected
            </DialogTitle>
            <DialogDescription>
              This property cannot be deactivated while an active tenancy is in place.
            </DialogDescription>
          </DialogHeader>

          {tenancyWarning && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <p className="text-foreground">
                  <span className="text-muted-foreground">Tenant:</span> {tenancyWarning.tenancy.tenant_name}
                </p>
                <p className="text-foreground">
                  <span className="text-muted-foreground">Status:</span> {tenancyWarning.tenancy.status}
                </p>
                {tenancyWarning.tenancy.lease_end && (
                  <p className="text-foreground">
                    <span className="text-muted-foreground">Lease ends:</span> {new Date(tenancyWarning.tenancy.lease_end).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                To deactivate this listing, first update the tenancy status to Ended in the Compliance section.
                Rent records and tenancy history must be retained for compliance purposes.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setTenancyWarning(null)} className="w-full">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminListings;
