import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Check, X as XIcon, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import DashboardHeader from './DashboardHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });
const AU_DATE = (d: string) => new Date(d).toLocaleDateString('en-AU');

const STATUS_STYLES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  new: { variant: 'default', label: 'New' },
  reviewing: { variant: 'secondary', label: 'Reviewing' },
  approved: { variant: 'outline', label: 'Approved' },
  declined: { variant: 'destructive', label: 'Declined' },
  withdrawn: { variant: 'secondary', label: 'Withdrawn' },
  pending: { variant: 'secondary', label: 'Pending' },
};

interface Application {
  id: string;
  reference_number: string;
  property_id: string;
  agent_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  current_address: string | null;
  employment_status: string | null;
  employer_name: string | null;
  annual_income: number | null;
  employment_length: string | null;
  previous_address: string | null;
  previous_landlord_name: string | null;
  previous_landlord_contact: string | null;
  reason_for_leaving: string | null;
  identity_document_url: string | null;
  identity_document_type: string | null;
  message_to_landlord: string | null;
  status: string;
  created_at: string;
  properties: { address: string; suburb: string; rent_amount?: number; beds?: number } | null;
}

const RentalApplicationsPage = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAgent, setNoAgent] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const fetchApplications = async () => {
    if (!user) return;
    const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
    if (!agent) { setNoAgent(true); setLoading(false); return; }

    const { data } = await (supabase as any)
      .from('rental_applications')
      .select('*, properties(address, suburb, beds, rental_weekly)')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    setApplications((data || []) as Application[]);
    setLoading(false);
  };

  useEffect(() => { fetchApplications(); }, [user]);

  const handleApprove = async (app: Application) => {
    setActing(app.id);
    try {
      // Update application status
      const { error: updateErr } = await (supabase as any)
        .from('rental_applications')
        .update({ status: 'approved' })
        .eq('id', app.id);
      if (updateErr) throw updateErr;

      // Create tenancy
      const prop = app.properties;
      const { error: tenancyErr } = await supabase.from('tenancies').insert({
        property_id: app.property_id,
        agent_id: app.agent_id,
        tenant_name: app.full_name,
        tenant_email: app.email,
        tenant_phone: app.phone || undefined,
        lease_start: new Date().toISOString().split('T')[0],
        lease_end: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        rent_amount: (prop as any)?.rental_weekly || 500,
        rent_frequency: 'weekly',
        bond_amount: ((prop as any)?.rental_weekly || 500) * 4,
        management_fee_percent: 8,
        status: 'active',
      } as any);
      if (tenancyErr) throw tenancyErr;

      // Notify applicant via email
      supabase.functions.invoke('send-notification-email', {
        body: {
          agent_id: app.agent_id,
          type: 'rental_application',
          title: `Your rental application has been approved`,
          message: `Great news, ${app.full_name}! Your application for ${app.properties?.address || 'the property'} has been approved. The agent will be in touch with lease details shortly.`,
          recipient_email: app.email,
          lead_name: app.full_name,
          property_id: app.property_id,
        },
      }).catch(() => {});

      toast.success(`Application approved — tenancy created for ${app.full_name}`);
      fetchApplications();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to approve');
    } finally {
      setActing(null);
    }
  };

  const handleDecline = async (app: Application) => {
    setActing(app.id);
    try {
      const { error } = await (supabase as any)
        .from('rental_applications')
        .update({ status: 'declined' })
        .eq('id', app.id);
      if (error) throw error;
      // Notify applicant via email
      supabase.functions.invoke('send-notification-email', {
        body: {
          agent_id: app.agent_id,
          type: 'rental_application',
          title: `Update on your rental application`,
          message: `Hi ${app.full_name}, thank you for your application for ${app.properties?.address || 'the property'}. Unfortunately, the landlord has decided to proceed with another applicant. We wish you all the best in your property search.`,
          recipient_email: app.email,
          lead_name: app.full_name,
          property_id: app.property_id,
        },
      }).catch(() => {});

      toast.success(`Application declined`);
      fetchApplications();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Failed to decline');
    } finally {
      setActing(null);
    }
  };

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div>
      <DashboardHeader title="Rental Applications" subtitle="Review and manage incoming tenant applications" />

      <div className="p-4 sm:p-6 max-w-7xl">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Reference</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Employment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : applications.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No rental applications yet</TableCell></TableRow>
              ) : (
                applications.map(app => {
                  const expanded = expandedId === app.id;
                  const s = STATUS_STYLES[app.status] || STATUS_STYLES.new;
                  return (
                    <TableRow key={app.id} className="group">
                      <TableCell colSpan={7} className="p-0">
                        <button
                          onClick={() => toggle(app.id)}
                          className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-accent/50 transition-colors"
                        >
                          <span className="shrink-0 text-muted-foreground">
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                          <span className="font-mono text-xs text-primary w-28 shrink-0">{app.reference_number}</span>
                          <span className="text-sm truncate flex-1 min-w-0">
                            {app.properties?.address}{app.properties?.suburb ? `, ${app.properties.suburb}` : ''}
                          </span>
                          <span className="text-sm font-medium w-36 shrink-0 truncate">{app.full_name}</span>
                          <span className="text-xs text-muted-foreground w-24 shrink-0">{app.employment_status || '—'}</span>
                          <span className="text-xs text-muted-foreground w-20 shrink-0">{AU_DATE(app.created_at)}</span>
                          <Badge variant={s.variant} className="text-[10px] shrink-0">{s.label}</Badge>
                        </button>

                        {expanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-border bg-secondary/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm py-3">
                              <Detail label="Full Name" value={app.full_name} />
                              <Detail label="Email" value={app.email} />
                              <Detail label="Phone" value={app.phone} />
                              <Detail label="Date of Birth" value={app.date_of_birth ? AU_DATE(app.date_of_birth) : null} />
                              <Detail label="Current Address" value={app.current_address} />
                              <Detail label="Employment Status" value={app.employment_status} />
                              <Detail label="Employer" value={app.employer_name} />
                              <Detail label="Annual Income" value={app.annual_income ? AUD.format(app.annual_income) : null} />
                              <Detail label="Employment Length" value={app.employment_length} />
                              <Detail label="Previous Address" value={app.previous_address} />
                              <Detail label="Previous Landlord" value={app.previous_landlord_name} />
                              <Detail label="Landlord Contact" value={app.previous_landlord_contact} />
                              <Detail label="Reason for Leaving" value={app.reason_for_leaving} />
                              <Detail label="ID Type" value={app.identity_document_type?.replace('_', ' ')} />
                              {app.identity_document_url && (
                                <div>
                                  <span className="text-xs text-muted-foreground">ID Document</span>
                                  <a href={app.identity_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary underline underline-offset-2 mt-0.5">
                                    <FileText size={12} /> View document
                                  </a>
                                </div>
                              )}
                              {app.message_to_landlord && (
                                <div className="md:col-span-2">
                                  <span className="text-xs text-muted-foreground">Message</span>
                                  <p className="text-sm mt-0.5">{app.message_to_landlord}</p>
                                </div>
                              )}
                            </div>

                            {(app.status === 'new' || app.status === 'reviewing' || app.status === 'pending') && (
                              <div className="flex gap-2 pt-3 border-t border-border">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(app)}
                                  disabled={acting === app.id}
                                  className="gap-1.5"
                                >
                                  <Check size={14} /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDecline(app)}
                                  disabled={acting === app.id}
                                  className="gap-1.5"
                                >
                                  <XIcon size={14} /> Decline
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <span className="text-xs text-muted-foreground">{label}</span>
    <p className="text-sm font-medium mt-0.5">{value || '—'}</p>
  </div>
);

export default RentalApplicationsPage;
