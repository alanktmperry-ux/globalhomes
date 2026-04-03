import { usePMApplications } from '../hooks/usePMApplications';
import type { ApplicationStatus } from '../types';
import { CheckCircle, XCircle, Star, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-500/10 text-blue-700',
  under_review: 'bg-amber-500/10 text-amber-700',
  shortlisted: 'bg-yellow-500/10 text-yellow-700',
  approved: 'bg-green-500/10 text-green-700',
  declined: 'bg-red-500/10 text-red-500',
  withdrawn: 'bg-secondary text-muted-foreground',
};

const EMP_LABELS: Record<string, string> = {
  full_time: 'Full-time', part_time: 'Part-time', casual: 'Casual',
  self_employed: 'Self-employed', retired: 'Retired', student: 'Student',
};

interface Props { propertyId: string; rentPw?: number; }

export function PMApplicationsDashboard({ propertyId, rentPw }: Props) {
  const { apps, loading, updateStatus } = usePMApplications(propertyId);

  const kpis = [
    { label: 'Total', value: apps.length },
    { label: 'New', value: apps.filter(a => a.status === 'submitted').length },
    { label: 'Shortlisted', value: apps.filter(a => a.status === 'shortlisted').length },
    { label: 'Approved', value: apps.filter(a => a.status === 'approved').length },
  ];

  if (loading) return <div className="animate-pulse h-40 bg-secondary rounded-2xl" />;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {apps.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No applications yet.</p>
      )}

      {apps.map(app => {
        const rentToIncomeOk = rentPw && app.annual_income
          ? app.annual_income >= rentPw * 52 * 3
          : null;
        return (
          <div key={app.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-foreground">{app.full_name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[app.status]}`}>
                    {app.status.replace('_', ' ')}
                  </span>
                  {rentToIncomeOk === true && (
                    <span className="text-[10px] text-green-600 font-medium">✓ Income ratio OK</span>
                  )}
                  {rentToIncomeOk === false && (
                    <span className="text-[10px] text-amber-600 font-medium">⚠ Low income ratio</span>
                  )}
                </div>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{app.email}</span>
                  <span>{app.phone}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(app.submitted_at || app.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Income', value: app.annual_income ? `$${(app.annual_income / 1000).toFixed(0)}k/yr` : '—' },
                { label: 'Employment', value: EMP_LABELS[app.employment_status ?? ''] ?? '—' },
                { label: 'Move in', value: app.move_in_date ? new Date(app.move_in_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—' },
                { label: 'Occupants', value: `${app.occupants ?? 1}${app.has_pets ? ' · Pets' : ''}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-secondary rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xs font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {[
                { status: 'shortlisted' as ApplicationStatus, icon: <Star className="w-3.5 h-3.5" />, label: 'Shortlist', color: 'text-yellow-600 border-yellow-500/20' },
                { status: 'approved' as ApplicationStatus, icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Approve', color: 'text-green-600 border-green-500/20' },
                { status: 'declined' as ApplicationStatus, icon: <XCircle className="w-3.5 h-3.5" />, label: 'Decline', color: 'text-destructive border-destructive/20' },
                { status: 'under_review' as ApplicationStatus, icon: <Eye className="w-3.5 h-3.5" />, label: 'Review', color: 'text-blue-600 border-blue-500/20' },
              ].map(action => (
                <button
                  key={action.status}
                  onClick={() => updateStatus(app.id, action.status)}
                  disabled={app.status === action.status}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition hover:bg-secondary disabled:opacity-30 ${action.color}`}
                >
                  {action.icon}{action.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
