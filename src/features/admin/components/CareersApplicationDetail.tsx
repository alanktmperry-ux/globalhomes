import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { ExternalLink, FileDown, Loader2, Mail, MapPin, Linkedin, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CAREERS_ROLES } from '@/features/careers/data/roles';
import type { Database } from '@/integrations/supabase/types';

type CareersApplication = Database['public']['Tables']['careers_applications']['Row'];

const STATUSES = ['new', 'reviewing', 'interview', 'rejected', 'hired'] as const;

interface Props {
  applicationId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

const roleTitle = (id: string) =>
  CAREERS_ROLES.find((r) => r.id === id)?.title ?? id;

export default function CareersApplicationDetail({ applicationId, onClose, onUpdated }: Props) {
  const [app, setApp] = useState<CareersApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('new');
  const [notes, setNotes] = useState<string>('');
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) {
      setApp(null);
      return;
    }
    (async () => {
      setLoading(true);
      setCvUrl(null);
      const { data, error } = await supabase
        .from('careers_applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
      } else if (data) {
        setApp(data);
        setStatus(data.status);
        setNotes(data.notes ?? '');
        if (data.cv_storage_path) {
          const { data: signed } = await supabase
            .storage
            .from('careers-uploads')
            .createSignedUrl(data.cv_storage_path, 3600);
          setCvUrl(signed?.signedUrl ?? null);
        }
      }
      setLoading(false);
    })();
  }, [applicationId]);

  const save = async () => {
    if (!app) return;
    setSaving(true);
    const patch: Record<string, unknown> = { status, notes };
    if (status !== app.status) {
      patch.reviewed_at = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) patch.reviewed_by = user.id;
    }
    const { error } = await supabase
      .from('careers_applications')
      .update(patch)
      .eq('id', app.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Application updated');
      onUpdated?.();
    }
    setSaving(false);
  };

  return (
    <Sheet open={!!applicationId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {loading || !app ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin mr-2" size={18} /> Loading…
          </div>
        ) : (
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle className="text-xl">{app.full_name}</SheetTitle>
              <SheetDescription>
                Applied {format(parseISO(app.created_at), 'PPP p')}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{roleTitle(app.role_applied)}</Badge>
                {!app.has_work_rights && (
                  <Badge variant="destructive">No work rights</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail size={14} />
                <a href={`mailto:${app.email}`} className="hover:text-foreground">{app.email}</a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={14} /> {app.location}
              </div>
              {app.linkedin_url && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Linkedin size={14} />
                  <a href={app.linkedin_url} target="_blank" rel="noreferrer" className="hover:text-foreground inline-flex items-center gap-1">
                    LinkedIn <ExternalLink size={12} />
                  </a>
                </div>
              )}
              {app.portfolio_url && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe size={14} />
                  <a href={app.portfolio_url} target="_blank" rel="noreferrer" className="hover:text-foreground inline-flex items-center gap-1">
                    Portfolio <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Why ListHQ
              </p>
              <p className="text-sm whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3">
                {app.why_listhq}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                CV
              </p>
              {app.cv_storage_path ? (
                cvUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={cvUrl} target="_blank" rel="noreferrer">
                      <FileDown size={14} /> Download CV
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Generating link…</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">No CV uploaded.</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Internal notes
              </p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Notes only visible to admins…"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={onClose}>Close</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="animate-spin" size={14} />}
                Save changes
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
