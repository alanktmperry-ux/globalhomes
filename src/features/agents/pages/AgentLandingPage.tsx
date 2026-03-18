import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ear, Mic, Globe, Camera, Cpu, ShieldCheck, ArrowRight, CheckCircle2, Star, Play, CalendarCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgentRegistrationModal from '@/features/agents/components/AgentRegistrationModal';
import RequestDemoModal from '@/features/agents/components/RequestDemoModal';
import agentHero from '@/assets/agent-hero.jpg';
import heatMapBg from '@/assets/heat-map-bg.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const AgentLandingPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── HERO ─── */}
      <section className="relative min-h-[92vh] flex items-center">
        {/* Split background */}
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
          <div className="relative hidden lg:block">
            <img src={agentHero} alt="Real estate agent" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-foreground/90" />
          </div>
          <div className="relative">
            <img src={heatMapBg} alt="Buyer demand heat map" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-foreground/60 lg:bg-foreground/40" />
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-6 py-20 lg:py-0">
          <div className="lg:grid lg:grid-cols-2">
            <div /> {/* spacer for left image on desktop */}
            <motion.div
              initial="hidden"
              animate="visible"
              className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left"
            >
              <motion.span
                variants={fadeUp}
                custom={0}
                className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-semibold tracking-wide uppercase mb-6"
              >
                Agent Network — Off-Market
              </motion.span>

              <motion.h1
                variants={fadeUp}
                custom={1}
                className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-[1.08] mb-5"
              >
                Sell Properties{' '}
                <span className="text-primary">Before They Hit</span> The Market
              </motion.h1>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-lg text-primary-foreground/70 mb-8 max-w-md mx-auto lg:mx-0"
              >
                Join 2,400+ agents using voice search data to find qualified buyers in 48&nbsp;hours
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => setShowModal(true)}
                  className="text-base px-8 py-6 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
                >
                  List Off-Market Now <ArrowRight size={18} className="ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 py-6 rounded-xl font-semibold border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Play size={16} className="mr-1.5" /> See How It Works
                </Button>
              </motion.div>

              {/* ─── DEMO & LOGIN CTAs ─── */}
              <motion.div variants={fadeUp} custom={4} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mt-4">
                <Button
                  size="lg"
                  variant="outline"
                  disabled={demoSwitching}
                  onClick={handleDemoLogin}
                  className="text-base px-8 py-5 rounded-xl font-bold border-primary/50 text-primary-foreground bg-primary/15 hover:bg-primary/25 backdrop-blur-sm transition-all"
                >
                  <Gamepad2 size={18} className="mr-2" />
                  {demoSwitching ? 'Loading Demo...' : 'Try Demo Agency'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/agents/login')}
                  className="text-base px-8 py-5 rounded-xl font-bold border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 transition-all"
                >
                  <Lock size={18} className="mr-2" />
                  Login to Your Agency
                </Button>
              </motion.div>
              <motion.div variants={fadeUp} custom={5} className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start mt-2">
                <span className="text-xs text-primary-foreground/50 text-center">(No signup needed)</span>
                <span className="text-xs text-primary-foreground/50 text-center">(Email + Password)</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF BAR ─── */}
      <section className="bg-secondary border-y border-border">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-5">
            As featured in
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 mb-8">
            {['REA News', 'Domain Times', 'Property Investor Magazine'].map((pub) => (
              <span key={pub} className="font-display text-lg font-bold text-muted-foreground/60">
                {pub}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { value: '12,000+', label: 'Off-Market Listings' },
              { value: '$4.2B', label: 'In Silent Sales' },
              { value: '3-Day', label: 'Average Time to Offer' },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-3xl font-extrabold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VALUE PROPOSITION GRID ─── */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl sm:text-4xl font-extrabold mb-3">
              Why Agents Choose Us
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto">
              Tools built for the modern agent who values privacy, speed, and global reach.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: <Ear size={28} />,
                title: 'The Whisper Listing',
                text: 'Test market appetite without public days-on-market counter. Soft launch to qualified investors only.',
                accent: 'from-primary/20 to-primary/5',
              },
              {
                icon: <Mic size={28} />,
                title: 'Voice-Qualified Leads',
                text: 'Every inquiry includes voice transcript. Know exactly what buyer wants before you call.',
                accent: 'from-success/20 to-success/5',
              },
              {
                icon: <Globe size={28} />,
                title: 'Global Investor Access',
                text: 'Your $800k Melbourne listing shown to Dubai, Singapore, and London investors automatically.',
                accent: 'from-destructive/15 to-destructive/5',
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                custom={i}
                className="group relative rounded-2xl border border-border bg-card p-8 hover:shadow-elevated transition-shadow"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center text-primary mb-5`}
                >
                  {card.icon}
                </div>
                <h3 className="font-display text-xl font-bold mb-2">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 bg-secondary/50">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl sm:text-4xl font-extrabold mb-3">
              Three Steps to Off-Market Success
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto">
              From listing to offer in as little as 48 hours.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid md:grid-cols-3 gap-10"
          >
            {[
              {
                step: '01',
                icon: <Camera size={32} />,
                title: 'Snap & List',
                time: '30 seconds',
                bullets: [
                  'Upload 3 photos, address, price guide',
                  'Voice-record property description (optional)',
                ],
              },
              {
                step: '02',
                icon: <Cpu size={32} />,
                title: 'AI Matches Buyers',
                time: 'Instant',
                bullets: [
                  'System alerts buyers whose voice searches match',
                  '"New off-market in your criteria" notification',
                ],
              },
              {
                step: '03',
                icon: <ShieldCheck size={32} />,
                title: 'Close Off-Market',
                time: 'Privacy',
                bullets: [
                  'No public price history',
                  'No days-on-market stigma',
                  'Direct agent-to-buyer negotiation',
                ],
              },
            ].map((s, i) => (
              <motion.div key={s.step} variants={fadeUp} custom={i} className="relative">
                <span className="font-display text-7xl font-black text-primary/10 absolute -top-4 -left-2 select-none">
                  {s.step}
                </span>
                <div className="relative bg-card border border-border rounded-2xl p-8 pt-12 shadow-card h-full">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    {s.icon}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-display text-xl font-bold">{s.title}</h3>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                      {s.time}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── TESTIMONIAL ─── */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <div className="flex justify-center gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={20} className="fill-primary text-primary" />
            ))}
          </div>
          <blockquote className="font-display text-xl sm:text-2xl font-semibold italic leading-relaxed mb-4">
            "I sold a $1.2M Toorak townhouse in 3 days without a single open home. The buyer came from a voice search — they knew exactly what they wanted."
          </blockquote>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Sarah Mitchell</strong> · Ray White South Yarra · 14 off-market sales this quarter
          </p>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-40" />
        <div className="relative container mx-auto px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-foreground mb-4">
            Ready to Sell Smarter?
          </h2>
          <p className="text-primary-foreground/70 max-w-md mx-auto mb-8">
            Join the network and start receiving voice-qualified leads today. No lock-in contracts.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setShowModal(true)}
            className="text-base px-10 py-6 rounded-xl font-bold hover:scale-[1.02] transition-transform"
          >
            List Off-Market Now <ArrowRight size={18} className="ml-1" />
          </Button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-display font-bold text-foreground">Global Homes</span>
          <span>© {new Date().getFullYear()} Global Homes Agent Network. All rights reserved.</span>
        </div>
      </footer>

      <AgentRegistrationModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
};

export default AgentLandingPage;
