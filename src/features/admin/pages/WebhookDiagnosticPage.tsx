import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Webhook, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';

type ReachStatus = 'unknown' | 'ok' | 'fail';

type WebhookKey =
  | 'search_alerts'
  | 'buyer_concierge'
  | 'lead_notifications'
  | 'offmarket_subscribers'
  | 'strata_health';

type WebhookDef = {
  key: WebhookKey;
  label: string;
  functionName: string;
  testBody: Record<string, unknown>;
};

const WEBHOOKS: WebhookDef[] = [
  { key: 'search_alerts', label: 'Search Alerts', functionName: 'send-search-alerts', testBody: { test: true, mode: 'diagnostic' } },
  { key: 'buyer_concierge', label: 'Buyer Concierge', functionName: 'orchestrate-buyer-concierge', testBody: { test: true, mode: 'diagnostic' } },
  { key: 'lead_notifications', label: 'Lead Notifications', functionName: 'send-notification-email', testBody: { test: true, mode: 'diagnostic' } },
  { key: 'offmarket_subscribers', label: 'Off-Market Subscribers', functionName: 'notify-offmarket-subscribers', testBody: { test: true, mode: 'diagnostic' } },
  { key: 'strata_health', label: 'Strata Health Score', functionName: 'compute-strata-health-score', testBody: { test: true, mode: 'diagnostic' } },
];

function StatusIcon({ status }: { status: ReachStatus }) {
  if (status === 'ok') return <CheckCircle2 className="text-green-600" size={20} />;
  if (status === 'fail') return <XCircle className="text-red-600" size={20} />;
  return <AlertCircle className="text-amber-500" size={20} />;
}

/**
 * An Edge Function is considered "reachable" if invoking it returns ANY HTTP
 * response (even an application-level 4xx/5xx with a JSON body). The only
 * way it's "unreachable" is a network error, missing-deployment 404, or
 * auth/CORS rejection.
 */
async function probeFunction(name: string, body: Record<string, unknown>): Promise<{ ok: boolean; detail: unknown }> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) {
      // FunctionsHttpError still means the function ran — treat as reachable
      // unless the message clearly indicates not-found / not-deployed.
      const msg = error.message ?? String(error);
      const notDeployed = /not\s*found|404|failed to fetch|network/i.test(msg);
      return { ok: !notDeployed, detail: { error: msg, data } };
    }
    return { ok: true, detail: data };
  } catch (e) {
    return { ok: false, detail: { error: e instanceof Error ? e.message : 'Unknown error' } };
  }
}

export default function WebhookDiagnosticPage() {
  const { toast } = useToast();
  const [reach, setReach] = useState<Record<WebhookKey, ReachStatus>>({
    search_alerts: 'unknown',
    buyer_concierge: 'unknown',
    lead_notifications: 'unknown',
    offmarket_subscribers: 'unknown',
    strata_health: 'unknown',
  });
  const [details, setDetails] = useState<Partial<Record<WebhookKey, unknown>>>({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; payload: unknown }>>({});

  async function probeAll() {
    setLoading(true);
    try {
      const entries = await Promise.all(
        WEBHOOKS.map(async (w) => {
          const r = await probeFunction(w.functionName, w.testBody);
          return [w.key, r] as const;
        }),
      );
      const newReach: Record<WebhookKey, ReachStatus> = { ...reach };
      const newDetails: Partial<Record<WebhookKey, unknown>> = {};
      for (const [key, r] of entries) {
        newReach[key] = r.ok ? 'ok' : 'fail';
        newDetails[key] = r.detail;
      }
      setReach(newReach);
      setDetails(newDetails);
    } catch (e) {
      toast({
        title: 'Probe failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    probeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runTest(w: WebhookDef) {
    setTesting((s) => ({ ...s, [w.key]: true }));
    setTestResults((r) => {
      const next = { ...r };
      delete next[w.key];
      return next;
    });
    try {
      // First try DB-level pg_net trigger via test_webhook RPC (admin only)
      const { data, error } = await (supabase.rpc as any)('test_webhook', { p_webhook_name: w.key });
      if (error) throw error;
      setTestResults((r) => ({ ...r, [w.key]: { ok: !!(data as any)?.success, payload: data } }));
    } catch (e) {
      setTestResults((r) => ({
        ...r,
        [w.key]: { ok: false, payload: { error: e instanceof Error ? e.message : 'Unknown' } },
      }));
    } finally {
      setTesting((s) => ({ ...s, [w.key]: false }));
    }
  }

  const reachableCount = Object.values(reach).filter((s) => s === 'ok').length;
  const totalCount = WEBHOOKS.length;
  const allReady = reachableCount === totalCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook size={24} /> Webhook Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verify each trigger-driven Edge Function is deployed and reachable.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={probeAll} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
          Re-probe
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Webhook System Status</span>
            <Badge variant={allReady ? 'default' : loading ? 'secondary' : 'destructive'}>
              {loading ? 'Checking…' : allReady ? 'Ready' : `${reachableCount}/${totalCount} reachable`}
            </Badge>
          </CardTitle>
          <CardDescription>
            Webhooks now use each Edge Function's built-in <code className="text-xs">SUPABASE_URL</code> and{' '}
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> environment variables. No database-level
            configuration is required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEBHOOKS.map((w) => (
            <div key={w.key} className="flex items-center justify-between border rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">{w.label}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{w.functionName}</p>
              </div>
              <StatusIcon status={reach[w.key]} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fire Test Trigger (via pg_net)</CardTitle>
          <CardDescription>
            Fires each webhook from the database using <code className="text-xs">{`{ test: true, mode: "diagnostic" }`}</code>
            . This exercises the same path real triggers use. Check Edge Function logs for execution detail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEBHOOKS.map((w) => {
            const result = testResults[w.key];
            const isTesting = !!testing[w.key];
            return (
              <div key={w.key} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{w.label}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{w.functionName}</p>
                  </div>
                  <Button size="sm" onClick={() => runTest(w)} disabled={isTesting}>
                    {isTesting ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                    Test
                  </Button>
                </div>
                {result && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-xs font-medium mb-1">
                      <StatusIcon status={result.ok ? 'ok' : 'fail'} />
                      <span>{result.ok ? 'Queued successfully' : 'Failed'}</span>
                    </div>
                    <pre className="text-[11px] bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono">
                      {JSON.stringify(result.payload, null, 2)}
                    </pre>
                  </div>
                )}
                {details[w.key] != null && !result && (
                  <pre className="mt-2 text-[11px] bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono text-muted-foreground">
                    {JSON.stringify(details[w.key], null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
