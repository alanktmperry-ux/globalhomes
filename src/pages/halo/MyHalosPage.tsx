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
import type { Halo, HaloStatus } from '@/types/halo';

export default function MyHalosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [halos, setHalos] = useState<Halo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('halos' as any)
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
      .from('halos' as any)
      .update({ status })
      .eq('id', id);
    if (error) {
      toast.error('Could not update Halo');
      return;
    }
    if (status === 'deleted') {
      setHalos((prev) => prev.filter((h) => h.id !== id));
      toast.success('Halo deleted');
    } else {
      setHalos((prev) => prev.map((h) => (h.id === id ? { ...h, status } : h)));
      toast.success(status === 'paused' ? 'Halo paused' : 'Halo resumed');
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My Halos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage what agents see when they look for you.
            </p>
          </div>
          <Button onClick={() => navigate('/halo/new')}>
            <Plus size={16} /> New Halo
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
            <h2 className="text-lg font-semibold mb-1">You haven't posted a Halo yet.</h2>
            <p className="text-muted-foreground mb-5">
              Create your first Halo to let agents find you.
            </p>
            <Button onClick={() => navigate('/halo/new')}>
              <Plus size={16} /> Create your Halo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {halos.map((h) => (
              <HaloCard key={h.id} halo={h} onStatusChange={updateStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
