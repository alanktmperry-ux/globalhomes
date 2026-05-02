import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ShieldAlert, Trash2 } from 'lucide-react';
import { MFASetup } from './MFASetup';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface Factor {
  id: string;
  friendly_name?: string;
  status: string;
  created_at: string;
}

export function MFAManager() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [unenrolling, setUnenrolling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      // Only show TOTP factors that have completed verification
      setFactors((data.totp ?? []).filter((f) => f.status === 'verified') as Factor[]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnenroll = async (factorId: string) => {
    if (!confirm('Remove this authenticator? You will no longer be prompted for a code at sign-in.')) return;
    setUnenrolling(factorId);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success('Authenticator removed');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUnenrolling(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="animate-spin size-4" /> Loading security settings…
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
          <ShieldCheck size={14} /> Two-factor authentication
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Add a second step at sign-in using an authenticator app.
        </p>
      </div>

      {factors.length === 0 && !enrolling && (
        <div className="flex items-start gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700">
          <ShieldAlert className="size-4 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">2FA is not enabled</p>
            <p>Strongly recommended for agents who manage trust accounts and tenancies.</p>
          </div>
        </div>
      )}

      {factors.map((f) => (
        <div key={f.id} className="flex items-center justify-between p-3 border border-border rounded-md">
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" />
              {f.friendly_name || 'Authenticator app'}
            </p>
            <p className="text-xs text-muted-foreground">
              Enabled {new Date(f.created_at).toLocaleDateString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUnenroll(f.id)}
            disabled={unenrolling === f.id}
          >
            {unenrolling === f.id ? <Loader2 className="animate-spin size-4" /> : <Trash2 className="size-4" />}
            Remove
          </Button>
        </div>
      ))}

      {enrolling ? (
        <MFASetup
          onEnrolled={() => { setEnrolling(false); load(); }}
          onCancel={() => setEnrolling(false)}
        />
      ) : (
        factors.length === 0 && (
          <Button onClick={() => setEnrolling(true)} variant="default">
            <ShieldCheck className="size-4" /> Enable 2FA
          </Button>
        )
      )}
    </div>
  );
}
