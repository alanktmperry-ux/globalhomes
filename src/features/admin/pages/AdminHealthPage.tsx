import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

type Status = 'healthy' | 'degraded' | 'down' | 'unknown';
interface ServiceStatus {
  service: string;
  status: Status;
  latency_ms: number | null;
  error_message: string | null;
}
interface HealthResponse {
  overall: Status;
  checked_at: string;
  services: ServiceStatus[];
}

const SERVICE_LABEL: Record<string, string> = {
  supabase: 'Database (Supabase)',
  resend: 'Email (Resend)',
  stripe: 'Payments (Stripe)',
  openai: 'AI Gateway',
  google_maps: 'Google Maps',
  cloudflare: 'Cloudflare',
};

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { tone: string; Icon: typeof CheckCircle2; label: string }> = {
    healthy:  { tone: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', Icon: CheckCircle2, label: 'Healthy' },
    degraded: { tone: 'bg-amber-500/15 text-amber-600 border-amber-500/30',       Icon: AlertTriangle, label: 'Degraded' },
    down:     { tone: 'bg-red-500/15 text-red-600 border-red-500/30',             Icon: XCircle,       label: 'Down' },
    unknown:  { tone: 'bg-muted text-muted-foreground border-border',              Icon: HelpCircle,    label: 'Unknown' },
  };
  const { tone, Icon, label } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const { data: res, error: invErr } = await supabase.functions.invoke<HealthResponse>('health-check', { body: {} });
      if (invErr) throw invErr;
      if (!res) throw new Error('No response');
      setData(res);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toast({ title: 'Health check failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void run(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Activity className="h-5 w-5 text-primary mt-1" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Service health</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live checks against database, email, payments, AI gateway, maps, and CDN.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data && <StatusPill status={data.overall} />}
          <Button size="sm" variant="outline" onClick={() => void run()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking…' : 'Re-check'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(data?.services || []).map((s) => (
          <div key={s.service} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-foreground">{SERVICE_LABEL[s.service] ?? s.service}</div>
              <StatusPill status={s.status} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Latency: {s.latency_ms != null ? `${s.latency_ms} ms` : '—'}</span>
              {data && <span>Checked {format(new Date(data.checked_at), 'HH:mm:ss')}</span>}
            </div>
            {s.error_message && (
              <p className="mt-2 text-xs text-destructive break-words">{s.error_message}</p>
            )}
          </div>
        ))}
        {!data && !error && (
          <div className="text-sm text-muted-foreground">Running checks…</div>
        )}
      </div>
    </div>
  );
}
