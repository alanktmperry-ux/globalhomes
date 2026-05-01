import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Webhook, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';

type ConfigStatus = {
  supabase_url_set?: boolean;
  service_role_key_set?: boolean;
  webhooks_ready?: boolean;
} | null;

type WebhookKey =
  | 'search_alerts'
  | 'buyer_concierge'
  | 'lead_notifications'
  | 'offmarket_subscribers'
  | 'strata_health';

const WEBHOOKS: { key: WebhookKey; label: string; description: string }[] = [
  { key: 'search_alerts', label: 'Search Alerts', description: 'send-search-alerts' },
  { key: 'buyer_concierge', label: 'Buyer Concierge', description: 'orchestrate-buyer-concierge' },
  { key: 'lead_notifications', label: 'Lead Notifications', description: 'send-notification-email' },
  { key: 'offmarket_subscribers', label: 'Off-Market Subscribers', description: 'notify-offmarket-subscribers' },
  { key: 'strata_health', label: 'Strata Health Score', description: 'compute-strata-health-score' },
];

function StatusIcon({ ok }: { ok: boolean | undefined }) {
  if (ok === true) return <CheckCircle2 className="text-green-600" size={20} />;
  if (ok === false) return <XCircle className="text-red-600" size={20} />;
  return <AlertCircle className="text-amber-500" size={20} />;
}

export default function WebhookDiagnosticPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigStatus>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { ok: boolean; payload: unknown }>>({});

  async function loadConfig() {
    setLoadingConfig(true);
    try {
      const { data, error } = await (supabase.rpc as any)('verify_webhook_config');
      if (error) throw error;
      setConfig(data as ConfigStatus);
    } catch (e) {
      toast({
        title: 'Could not read webhook config',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      setConfig(null);
    } finally {
      setLoadingConfig(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function runTest(key: WebhookKey) {
    setTesting((s) => ({ ...s, [key]: true }));
    setResults((r) => {
      const next = { ...r };
      delete next[key];
      return next;
    });
    try {
      const { data, error } = await (supabase.rpc as any)('test_webhook', { p_webhook_name: key });
      if (error) throw error;
      const ok = !!(data as any)?.success;
      setResults((r) => ({ ...r, [key]: { ok, payload: data } }));
    } catch (e) {
      setResults((r) => ({
        ...r,
        [key]: { ok: false, payload: { error: e instanceof Error ? e.message : 'Unknown' } },
      }));
    } finally {
      setTesting((s) => ({ ...s, [key]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook size={24} /> Webhook Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verify trigger-driven Edge Function webhooks are configured and firing.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadConfig} disabled={loadingConfig}>
          {loadingConfig ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Webhook Configuration</span>
            {config?.webhooks_ready !== undefined && (
              <Badge variant={config.webhooks_ready ? 'default' : 'destructive'}>
                {config.webhooks_ready ? 'Ready' : 'Not configured'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Database-level settings the trigger functions use to call Edge Functions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingConfig ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium text-sm">app.supabase_url</p>
                  <p className="text-xs text-muted-foreground">Project URL used to construct webhook calls</p>
                </div>
                <StatusIcon ok={config?.supabase_url_set} />
              </div>
              <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium text-sm">app.service_role_key</p>
                  <p className="text-xs text-muted-foreground">Used to authenticate as service role from triggers</p>
                </div>
                <StatusIcon ok={config?.service_role_key_set} />
              </div>
              {config && !config.webhooks_ready && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  Run the following in Supabase SQL Editor (superuser) then refresh:
                  <pre className="mt-2 text-[11px] whitespace-pre-wrap font-mono">
{`ALTER DATABASE postgres SET app.supabase_url = 'https://ngrkbohpmkzjonaofgbb.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '<service_role_key>';
SELECT pg_reload_conf();`}
                  </pre>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Webhooks</CardTitle>
          <CardDescription>
            Fires each webhook with <code className="text-xs">{`{ test: true, mode: "diagnostic" }`}</code>. Check Edge
            Function logs for execution detail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEBHOOKS.map((w) => {
            const result = results[w.key];
            const isTesting = !!testing[w.key];
            return (
              <div key={w.key} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{w.label}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{w.description}</p>
                  </div>
                  <Button size="sm" onClick={() => runTest(w.key)} disabled={isTesting}>
                    {isTesting ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                    Test
                  </Button>
                </div>
                {result && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-xs font-medium mb-1">
                      <StatusIcon ok={result.ok} />
                      <span>{result.ok ? 'Queued successfully' : 'Failed'}</span>
                    </div>
                    <pre className="text-[11px] bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono">
                      {JSON.stringify(result.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
