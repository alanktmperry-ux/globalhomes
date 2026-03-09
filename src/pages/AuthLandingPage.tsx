import { motion } from 'framer-motion';
import { Home, Building2, Search, Mic, Heart, BarChart3, Users, Megaphone } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const AuthLandingPage = () => {
  const navigate = useNavigate();

  const seekerFeatures = [
    { icon: Search, text: 'Search thousands of properties' },
    { icon: Mic, text: 'AI voice search in any language' },
    { icon: Heart, text: 'Save favourites & get alerts' },
  ];

  const agentFeatures = [
    { icon: BarChart3, text: 'Manage listings & analytics' },
    { icon: Users, text: 'Build your team & network' },
    { icon: Megaphone, text: 'Capture leads automatically' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-center">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-cyan-accent flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">W</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">World Property Pulse</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Welcome to World Property Pulse
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            How would you like to get started?
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">
          {/* Seeker Card */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/login')}
            className="group relative overflow-hidden rounded-2xl border-2 border-border hover:border-primary/60 bg-card p-7 text-left transition-all duration-300 hover:shadow-elevated"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
              <Home size={28} className="text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-1.5">
              I'm Looking for a Property
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Search, save, and enquire on properties worldwide.
            </p>
            <div className="space-y-2.5">
              {seekerFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <f.icon size={14} className="text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">{f.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-semibold text-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Continue as Property Seeker →
            </div>
          </motion.button>

          {/* Agent Card */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/agents/login')}
            className="group relative overflow-hidden rounded-2xl border-2 border-border hover:border-primary/60 bg-card p-7 text-left transition-all duration-300 hover:shadow-elevated"
          >
            <div className="absolute top-4 right-4">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                Pro
              </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
              <Building2 size={28} className="text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-1.5">
              I'm a Real Estate Agent
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              List properties, manage leads, and grow your business.
            </p>
            <div className="space-y-2.5">
              {agentFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <f.icon size={14} className="text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">{f.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-semibold text-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Continue as Agent →
            </div>
          </motion.button>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium underline underline-offset-2">Sign in</Link>
        </p>
      </main>
    </div>
  );
};

export default AuthLandingPage;
