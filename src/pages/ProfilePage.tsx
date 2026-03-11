import { useState } from 'react';
import { User, ChevronRight, Shield, LogIn, LogOut, Settings, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, Search, LayoutDashboard } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const ProfilePage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, isAgent, isAdmin, signOut, loading } = useAuth();
  const { toast } = useToast();

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: 'Signed out', description: 'You have been logged out successfully.' });
      navigate('/');
    } catch (err: any) {
      console.error('Sign out error:', err);
      toast({ title: 'Error signing out', description: err?.message || 'Please try again.', variant: 'destructive' });
      // Navigate anyway since state was cleared
      navigate('/');
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });
      if (error) throw error;
      toast({
        title: 'Confirmation sent',
        description: 'Check both your old and new email inboxes to confirm the change.',
      });
      setEmailDialogOpen(false);
      setNewEmail('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="font-display text-xl font-bold text-foreground">{t('profile.title')}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : user ? (
          <>
            {/* Logged in state */}
            <div className="flex flex-col items-center py-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <User size={32} className="text-primary" />
              </div>
              <p className="font-display font-semibold text-foreground">
                {user.user_metadata?.display_name || user.email}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              {isAgent && (
                <span className="mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Agent Account
                </span>
              )}
              {isAdmin && (
                <span className="mt-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                  Admin
                </span>
              )}
            </div>

            {/* Quick navigation */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => navigate('/')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm transition-colors active:opacity-80"
              >
                <Search size={16} />
                Search Properties
              </button>
              {isAgent && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-foreground font-semibold text-sm border border-border transition-colors active:opacity-80"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
              )}
            </div>

            <div className="space-y-2">
              {/* Change Email */}
              <button
                onClick={() => setEmailDialogOpen(true)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left transition-colors active:bg-secondary"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Change Email</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>

              {/* Change Password */}
              <button
                onClick={() => setPasswordDialogOpen(true)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left transition-colors active:bg-secondary"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lock size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your account password</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>

              {isAgent && (
                <button
                  onClick={() => navigate('/agent-portal')}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left transition-colors active:bg-secondary"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield size={18} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{t('agent.portal')}</p>
                    <p className="text-xs text-muted-foreground">Manage listings & leads</p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left transition-colors active:bg-secondary"
                >
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <ShieldCheck size={18} className="text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">Admin Dashboard</p>
                    <p className="text-xs text-muted-foreground">Manage users, listings & platform</p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </button>
              )}

              <button
                onClick={() => navigate('/dashboard/settings')}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left transition-colors active:bg-secondary"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Settings size={18} className="text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Settings</p>
                  <p className="text-xs text-muted-foreground">Preferences & notifications</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left transition-colors active:bg-secondary"
              >
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut size={18} className="text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Sign Out</p>
                  <p className="text-xs text-muted-foreground">Log out of your account</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Change Email Dialog */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Email Address</DialogTitle>
                  <DialogDescription>
                    Enter your new email address. You'll need to confirm from both your old and new email.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangeEmail} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Current email</p>
                    <p className="text-sm font-medium text-foreground">{user.email}</p>
                  </div>
                  <Input
                    type="email"
                    placeholder="New email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full" disabled={emailLoading || !newEmail.trim()}>
                    {emailLoading ? (
                      <><Loader2 size={16} className="animate-spin mr-2" /> Sending…</>
                    ) : (
                      'Update Email'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog open={passwordDialogOpen} onOpenChange={(open) => { setPasswordDialogOpen(open); if (!open) { setNewPassword(''); setConfirmPassword(''); setShowPassword(false); } }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter a new password for your account. Must be at least 8 characters.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (newPassword.length < 8) {
                    toast({ title: 'Too short', description: 'Password must be at least 8 characters.', variant: 'destructive' });
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    toast({ title: 'Mismatch', description: 'Passwords do not match.', variant: 'destructive' });
                    return;
                  }
                  setPasswordLoading(true);
                  try {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) throw error;
                    toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
                    setPasswordDialogOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  } catch (err: any) {
                    toast({ title: 'Error', description: err.message, variant: 'destructive' });
                  } finally {
                    setPasswordLoading(false);
                  }
                }} className="space-y-4 mt-2">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <Button type="submit" className="w-full" disabled={passwordLoading || newPassword.length < 8 || newPassword !== confirmPassword}>
                    {passwordLoading ? (
                      <><Loader2 size={16} className="animate-spin mr-2" /> Updating…</>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>
            {/* Guest state */}
            <div className="flex flex-col items-center py-8">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <User size={32} className="text-muted-foreground" />
              </div>
              <p className="font-display font-semibold text-foreground">Guest User</p>
              <p className="text-sm text-muted-foreground mt-1">Sign in to save your preferences</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => navigate('/auth')}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left transition-colors active:bg-secondary"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <LogIn size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Sign In / Register</p>
                  <p className="text-xs text-muted-foreground">Create an account or sign in</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>

              <button
                onClick={() => navigate('/agent-portal')}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left transition-colors active:bg-secondary"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Shield size={18} className="text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{t('agent.portal')}</p>
                  <p className="text-xs text-muted-foreground">For real estate agents</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
