import { Printer, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComparableSaleCard } from './ComparableSaleCard';
import type { CmaReport, ComparableSaleRecord } from '@/types/market';

const formatAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

interface Props {
  report: CmaReport;
  comparables: ComparableSaleRecord[];
  isAgentView: boolean;
}

export function CmaReportView({ report, comparables, isAgentView }: Props) {
  return (
    <div className="vendor-report-content max-w-4xl mx-auto space-y-8 print:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{report.report_title}</h1>
          {report.vendor_name && (
            <p className="text-sm text-muted-foreground mt-1">Prepared for {report.vendor_name}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(report.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
            <Printer size={14} /> Print
          </Button>
        </div>
      </div>

      {/* Subject property */}
      <div className="chart-panel rounded-xl border border-border bg-secondary/30 p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Subject Property</h2>
        <p className="text-base font-medium text-foreground">{report.subject_address}</p>
        <p className="text-sm text-muted-foreground">{report.subject_suburb}, {report.subject_state} {report.subject_postcode}</p>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          {report.subject_bedrooms != null && <span>{report.subject_bedrooms} bed</span>}
          {report.subject_bathrooms != null && <span>{report.subject_bathrooms} bath</span>}
          {report.subject_car_spaces != null && <span>{report.subject_car_spaces} car</span>}
          {report.subject_land_sqm != null && <span>{report.subject_land_sqm}m² land</span>}
          <span className="capitalize">{report.subject_property_type}</span>
        </div>
      </div>

      {/* Comparables */}
      {comparables.length > 0 && (
        <div className="chart-panel space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Selected Comparable Sales ({comparables.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {comparables.map(c => (
              <ComparableSaleCard key={c.id} sale={c} />
            ))}
          </div>
        </div>
      )}

      {/* Price estimate */}
      {(report.estimated_price_low || report.estimated_price_mid || report.estimated_price_high) && (
        <div className="chart-panel grid grid-cols-3 gap-4">
          {[
            { label: 'Low', value: report.estimated_price_low, color: 'text-muted-foreground' },
            { label: 'Mid', value: report.estimated_price_mid, color: 'text-foreground' },
            { label: 'High', value: report.estimated_price_high, color: 'text-muted-foreground' },
          ].map(p => (
            <div key={p.label} className="text-center rounded-xl border border-border p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{p.label}</p>
              <p className={`text-xl font-bold ${p.color}`}>{p.value ? formatAUD(p.value) : '—'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Agent recommendation */}
      {report.agent_recommended_price && (
        <div className="chart-panel rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
          <h2 className="text-sm font-semibold text-foreground mb-2">Agent Recommendation</h2>
          <p className="text-2xl font-bold text-primary">{formatAUD(report.agent_recommended_price)}</p>
          {report.agent_recommended_method && (
            <span className="inline-block mt-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
              {report.agent_recommended_method.replace(/_/g, ' ')}
            </span>
          )}
          {report.agent_commentary && (
            <blockquote className="mt-3 border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground italic">
              {report.agent_commentary}
            </blockquote>
          )}
        </div>
      )}

      {/* Footer */}
      {isAgentView && (
        <div className="no-print text-xs text-muted-foreground text-center pt-4 border-t border-border">
          Viewed {report.view_count} time{report.view_count !== 1 ? 's' : ''}
          {report.viewed_at && ` · Last viewed ${new Date(report.viewed_at).toLocaleDateString('en-AU')}`}
        </div>
      )}
      {!isAgentView && (
        <div className="text-center pt-6 text-xs text-muted-foreground">
          Powered by <span className="font-semibold">ListHQ</span>
        </div>
      )}
    </div>
  );
}
