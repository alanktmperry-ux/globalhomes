import { User, ChevronRight, Shield, LogIn, LogOut, Settings } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthProvider';

const ProfilePage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, isAgent, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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
            </div>

            <div className="space-y-2">
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

              <button
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
