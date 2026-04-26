import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * TEMPORARY DIAGNOSTIC — remove after identifying the active Google Maps key.
 * Calls google-maps-proxy { action: 'get_key' } and shows only a short prefix.
 */
const MapsKeyDiagnostic = () => {
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkMapsKey = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
        body: { action: 'get_key' },
      });
      if (error) throw error;
      if (data?.key) {
        setKeyPrefix(data.key.slice(0, 8) + '••••••••');
      } else {
        toast.error('No key returned by proxy');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Maps key check failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted p-3 text-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-medium text-foreground">Temporary diagnostic — remove after use</p>
          <p className="text-xs text-muted-foreground">Maps Key Check — identifies which Google Maps API key the app is loading.</p>
        </div>
        <Button size="sm" variant="outline" onClick={checkMapsKey} disabled={loading}>
          {loading ? 'Checking…' : 'Identify Maps Key'}
        </Button>
      </div>
      {keyPrefix && (
        <p className="mt-2 text-xs text-muted-foreground">
          Active Maps key: <code className="font-mono">{keyPrefix}</code> — use this prefix to identify the key in Google Cloud Console.
        </p>
      )}
    </div>
  );
};

export default MapsKeyDiagnostic;
