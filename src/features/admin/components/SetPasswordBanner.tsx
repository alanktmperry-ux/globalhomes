import { useEffect, useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const DISMISS_KEY = 'admin:set-password-dismissed';

export default function SetPasswordBanner() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(DISMISS_KEY) === 'true') return;
    // Heuristic: users who signed in via magic link/OTP have no password set.
    // Supabase exposes this via identities[].provider — 'email' identity exists when
    // a password is set; magic-link-only users typically only have the email OTP path.
    // Fallback: show banner unless user has explicitly dismissed.
    const identities = (user as any).identities ?? [];
    const hasEmailPasswordIdentity = identities.some(
      (i: any) => i.provider === 'email' && i.identity_data?.email,
    );
    // We can't reliably detect "password set" client-side, so show whenever email
    // identity is missing OR user hasn't dismissed. To be conservative, only show
    // when there is no email identity at all.
    if (!hasEmailPasswordIdentity) setShow(true);
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setShow(false);
  };

  const handleSave = async () => {
    if (pw.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (pw !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success('Password set successfully. You can now log in at /admin/login.');
      localStorage.setItem(DISMISS_KEY, 'true');
      setShow(false);
      setOpen(false);
      setPw('');
      setConfirm('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to set password.');
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <KeyRound size={16} className="text-primary" />
          <span className="text-foreground">
            Set up your admin password to use the dedicated admin login page.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            Set Password
          </Button>
          <button
            onClick={dismiss}
            className="p-1 rounded hover:bg-primary/10 text-muted-foreground"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set admin password</DialogTitle>
            <DialogDescription>
              Choose a password so you can sign in directly at /admin/login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
