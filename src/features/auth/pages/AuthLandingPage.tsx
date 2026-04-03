import { motion } from 'framer-motion';
import { Home, Building2, Search, Mic, Heart, BarChart3, Users, Megaphone } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const AuthLandingPage = () => {
  const navigate = useNavigate();

  const roleCards = [
    {
      icon: Home,
      title: "I'm Looking for a Property",
      description: 'Search, save, and enquire on properties worldwide.',
      cta: 'Continue as Property Seeker →',
      route: '/login',
      features: [
        { icon: Search, text: 'Search thousands of properties' },
        { icon: Mic, text: 'AI voice search in any language' },
        { icon: Heart, text: 'Save favourites & get alerts' },
      ],
    },
    {
      icon: Building2,
      title: "I'm a Real Estate Agent",
      description: 'List properties, manage leads, and grow your business.',
      cta: 'Continue as Agent →',
      route: '/agents/login',
      badge: 'Pro',
      features: [
        { icon: BarChart3, text: 'Manage listings & analytics' },
        { icon: Users, text: 'Build your team & network' },
        { icon: Megaphone, text: 'Capture leads automatically' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-center">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-cyan-accent flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">W</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">ListHQ</span>
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
            Welcome to ListHQ
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            How would you like to get started?
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl">
          {roleCards.map(({ icon: Icon, title, description, cta, route, badge, features }) => (
            <button
              key={title}
              type="button"
              onClick={() => navigate(route)}
              style={{ opacity: 1, visibility: 'visible', animation: 'none' }}
              className="group relative flex min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-border bg-card p-7 text-left !opacity-100 visible shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {badge ? (
                <div className="absolute right-4 top-4">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                    {badge}
                  </span>
                </div>
              ) : null}

              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                <Icon size={28} className="text-primary" />
              </div>

              <h2 className="mb-1.5 font-display text-xl font-bold text-foreground">
                {title}
              </h2>

              <p className="mb-5 text-sm leading-7 text-muted-foreground">
                {description}
              </p>

              <div className="space-y-3">
                {features.map((feature) => (
                  <div key={feature.text} className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <feature.icon size={14} className="text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6">
                <div className="rounded-full bg-primary/10 px-4 py-3 text-center text-sm font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {cta}
                </div>
              </div>
            </button>
          ))}
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
