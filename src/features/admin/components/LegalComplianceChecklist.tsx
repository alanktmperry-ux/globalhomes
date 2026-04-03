import { useState } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, Shield, FileText,
  Phone, Scale, AlertOctagon, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Status = 'complete' | 'review' | 'pending';

interface ChecklistItem {
  item: string;
  status: Status;
  category: string;
  notes?: string;
}

const privacyActChecklist: ChecklistItem[] = [
  { item: 'Privacy Policy published and accessible at /privacy', status: 'complete', category: 'Privacy Act' },
  { item: 'Terms of Service published and accessible at /terms', status: 'complete', category: 'Terms' },
  { item: 'Data collection limited to what is necessary (APP 3)', status: 'review', category: 'Privacy Act', notes: 'Review all forms for unnecessary fields' },
  { item: 'Data stored in Australia (Supabase Sydney region)', status: 'complete', category: 'Privacy Act' },
  { item: 'Agent consent obtained at sign-up (Terms acceptance)', status: 'complete', category: 'Privacy Act' },
  { item: 'Seeker consent obtained before collecting PII', status: 'complete', category: 'Privacy Act' },
  { item: 'Google Maps GDPR consent mechanism functional', status: 'complete', category: 'GDPR' },
  { item: 'Consent accept / decline / reset all working', status: 'complete', category: 'GDPR' },
  { item: 'Map fallback shown when consent declined', status: 'complete', category: 'GDPR' },
  { item: 'Data access request process documented', status: 'pending', category: 'Privacy Act', notes: 'Need formal SAR procedure document' },
  { item: 'Data deletion process documented', status: 'pending', category: 'Privacy Act', notes: 'delete_user_cascade function exists but needs review' },
  { item: 'Notifiable Data Breach scheme compliance documented', status: 'complete', category: 'Privacy Act', notes: 'Breach response plan created in admin' },
  { item: 'Third-party data processor agreements reviewed', status: 'pending', category: 'Privacy Act', notes: 'Need DPAs from Stripe, Supabase, OpenAI, Google' },
  { item: 'AI Offer Generator shows legal disclaimer', status: 'complete', category: 'Licensing' },
  { item: 'Agent licence number field in sign-up', status: 'complete', category: 'Licensing' },
  { item: '7-year tenancy record retention enforced (DB trigger)', status: 'complete', category: 'Tenancy', notes: 'prevent_tenancy_deletion trigger active' },
  { item: 'Retention notice visible in tenant management UI', status: 'complete', category: 'Tenancy' },
  { item: 'Terms acceptance timestamp stored (profiles.terms_accepted_at)', status: 'complete', category: 'Terms' },
  { item: 'Solicitor review of Terms of Service', status: 'pending', category: 'Legal Review' },
  { item: 'Solicitor review of Privacy Policy', status: 'pending', category: 'Legal Review' },
];

const breachResponseSteps = [
  {
    step: 1,
    title: 'Contain',
    timeframe: '0–4 hours',
    actions: [
      'Identify and isolate the affected system',
      'Revoke compromised API keys or access tokens',
      'Take affected Edge Functions offline if necessary',
      'Preserve logs for forensic investigation',
    ],
  },
  {
    step: 2,
    title: 'Assess',
    timeframe: '4–24 hours',
    actions: [
      'Determine what data was accessed or exfiltrated',
      'Identify affected users (agents, seekers, tenants)',
      'Assess likelihood of serious harm (identity theft, financial loss)',
      'Document findings in writing',
    ],
  },
  {
    step: 3,
    title: 'Notify',
    timeframe: '24–72 hours',
    actions: [
      'If eligible breach: notify OAIC at oaic.gov.au/privacy/notifiable-data-breaches',
      'Notify affected individuals by email',
      'Prepare public statement if breach is significant',
      'Contact Stripe if payment data may be involved',
    ],
  },
  {
    step: 4,
    title: 'Remediate',
    timeframe: '72 hours – 30 days',
    actions: [
      'Patch the vulnerability',
      'Rotate all API keys and secrets',
      'Review and update RLS policies',
      'Commission third-party security audit',
      'Document remediation for OAIC response',
    ],
  },
];

const emergencyContacts = [
  { label: 'OAIC Notifiable Data Breach Hotline', value: '1300 363 992' },
  { label: 'Stripe Fraud Reporting', value: 'stripe.com/docs/security' },
  { label: 'ListHQ Legal', value: 'legal@listhq.com.au' },
  { label: 'ListHQ Support', value: 'support@listhq.com.au' },
];

function statusIcon(status: Status) {
  if (status === 'complete') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === 'review') return <AlertTriangle size={14} className="text-amber-500" />;
  return <Clock size={14} className="text-muted-foreground" />;
}

function statusBadge(status: Status) {
  if (status === 'complete') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Complete</Badge>;
  if (status === 'review') return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Under Review</Badge>;
  return <Badge className="bg-muted text-muted-foreground border-border text-[10px]">Pending</Badge>;
}

export default function LegalComplianceChecklist() {
  const [showBreach, setShowBreach] = useState(false);

  const complete = privacyActChecklist.filter(i => i.status === 'complete').length;
  const total = privacyActChecklist.length;
  const pct = Math.round((complete / total) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Scale size={20} className="text-primary" />
          Legal &amp; Compliance Checklist
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Australian Privacy Act 1988, GDPR, and real estate licensing compliance status.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Overall Compliance</span>
          <span className="text-sm font-bold text-primary">{complete}/{total} ({pct}%)</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {privacyActChecklist.map((item, i) => (
          <div key={i} className="flex items-start gap-3 bg-card border border-border rounded-lg px-4 py-3">
            <div className="mt-0.5">{statusIcon(item.status)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{item.item}</p>
              {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
              {statusBadge(item.status)}
            </div>
          </div>
        ))}
      </div>

      {/* Data Breach Response Plan */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowBreach(!showBreach)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertOctagon size={18} className="text-destructive" />
            <span className="text-sm font-semibold text-foreground">Data Breach Response Plan</span>
          </div>
          {showBreach ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>

        {showBreach && (
          <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Under the Notifiable Data Breaches (NDB) scheme, ListHQ must notify the OAIC and affected
              individuals within 30 days of discovering an eligible data breach.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {breachResponseSteps.map(s => (
                <div key={s.step} className="bg-secondary/40 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {s.step}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{s.title}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{s.timeframe}</Badge>
                  </div>
                  <ul className="space-y-1.5">
                    {s.actions.map((a, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Emergency Contacts */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Phone size={14} className="text-primary" />
                Emergency Contacts
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {emergencyContacts.map(c => (
                  <div key={c.label} className="bg-background border border-border rounded-lg px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">{c.label}</p>
                    <p className="text-sm font-medium text-foreground">{c.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
