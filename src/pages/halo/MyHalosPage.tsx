import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { HaloCard } from '@/components/halo/HaloCard';
import { useTranslation } from '@/shared/lib/i18n';
import type { Halo, HaloStatus } from '@/types/halo';

export default function MyHalosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [halos, setHalos] = useState<Halo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('halos')
      .select('*')
      .eq('seeker_id', user.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setHalos((data as unknown as Halo[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: HaloStatus) => {
    const { error } = await supabase
      .from('halos')
      .update({ status })
      .eq('id', id);
    if (error) {
      toast.error(t('halo.toast.updateFailed'));
      return;
    }
    if (status === 'deleted') {
      setHalos((prev) => prev.filter((h) => h.id !== id));
      toast.success(t('halo.toast.deleted'));
    } else {
      setHalos((prev) => prev.map((h) => (h.id === id ? { ...h, status } : h)));
      toast.success(status === 'paused' ? t('halo.toast.paused') : t('halo.toast.resumed'));
    }
  };

  const handleFulfil = async (id: string) => {
    const { error } = await supabase
      .from('halos')
      .update({ status: 'fulfilled' })
      .eq('id', id);
    if (error) {
      toast.error(t('halo.toast.fulfilFailed'));
      return;
    }
    setHalos((prev) => prev.map((h) => (h.id === id ? { ...h, status: 'fulfilled' } : h)));
    try {
      await supabase.functions.invoke('send-halo-fulfilled-notice', { body: { halo_id: id } });
    } catch {
      /* non-fatal */
    }
    toast.success(t('halo.toast.fulfilled'));
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t('halo.list.title')}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t('halo.list.subtitle')}
            </p>
          </div>
          <Button onClick={() => navigate('/halo/new')}>
            <Plus size={16} /> {t('halo.list.new')}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : halos.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card">
            <Sparkles className="mx-auto text-primary mb-3" size={32} />
            <h2 className="text-lg font-semibold mb-1">{t('halo.list.empty.title')}</h2>
            <p className="text-muted-foreground mb-5">
              {t('halo.list.empty.body')}
            </p>
            <Button onClick={() => navigate('/halo/new')}>
              <Plus size={16} /> {t('halo.list.empty.cta')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {halos.map((h) => (
              <HaloCard key={h.id} halo={h} onStatusChange={updateStatus} onFulfil={handleFulfil} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
