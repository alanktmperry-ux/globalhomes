import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Ear, Mic, Globe, Camera, Cpu, ShieldCheck, ArrowRight, CheckCircle2, Star, Play, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgentRegistrationModal from '@/features/agents/components/AgentRegistrationModal';
import { supabase } from '@/integrations/supabase/client';

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
  const [agentCount, setAgentCount] = useState<number | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('agents').select('id', { count: 'exact', head: true })
      .then(({ count }) => { if (count !== null) setAgentCount(count); });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Real Estate Agent Software Australia | ListHQ</title>
        <meta name="description" content="CRM, property management, trust accounting and lead tools built for Australian agents." />
      </Helmet>
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
                Join Our Founding{' '}
                <span className="text-primary">Agent Cohort</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-lg text-primary-foreground/70 mb-8 max-w-md mx-auto lg:mx-0"
              >
                We're accepting 50 founding agents across Sydney and Melbourne. Lock in your rate for life.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => setShowModal(true)}
                  className="text-base px-8 py-6 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
                >
                  List Off-Market Now <ArrowRight size={18} className="ml-1" />
                </Button>
                <button
                  className="inline-flex items-center justify-center text-base px-8 py-3 rounded-xl font-semibold border border-white/30 text-white bg-transparent hover:bg-white/10 transition-colors"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Play size={16} className="mr-1.5" /> See How It Works
                </button>
              </motion.div>

              {/* ─── DEMO & LOGIN CTAs ─── */}
              <motion.div variants={fadeUp} custom={4} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mt-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/agents/demo')}
                  className="text-base px-8 py-5 rounded-xl font-bold bg-primary-foreground text-primary hover:bg-primary-foreground/90 transition-all"
                >
                  🎯 Try the Demo
                </Button>
                <button
                  onClick={() => navigate('/agents/login')}
                  className="inline-flex items-center justify-center text-base px-8 py-3 rounded-xl font-bold border border-white/30 text-white bg-transparent hover:bg-white/10 transition-all"
                >
                  <Lock size={18} className="mr-2" />
                  Login to Your Agency
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground">
              60-day free trial · No credit card required · Cancel any time
            </p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {[
              {
                name: 'Solo',
                price: '$299',
                cadence: '/mo',
                features: [
                  '1 agent, up to 3 listings',
                  'Buyer concierge (20 matches/mo)',
                  'Trust accounting',
                  'CRM & contacts',
                  'AI listing descriptions',
                  'Email & chat support',
                ],
                highlight: false,
                cta: 'Start Free Trial',
              },
              {
                name: 'Agency',
                price: '$899',
                cadence: '/mo',
                features: [
                  'Up to 5 agents, unlimited listings',
                  'Buyer concierge (100 matches/mo)',
                  'Full trust accounting + bank reconciliation',
                  'Pipeline & rent roll',
                  'Pocket (off-market) listings',
                  'Priority support',
                ],
                highlight: true,
                cta: 'Start Free Trial',
              },
              {
                name: 'Agency Pro',
                price: '$1,999',
                cadence: '/mo',
                features: [
                  'Up to 15 agents',
                  'Unlimited everything',
                  'Buyer concierge (unlimited)',
                  'Exclusive listing access',
                  'Commission calculator',
                  'Dedicated account manager',
                ],
                highlight: false,
                cta: 'Start Free Trial',
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                cadence: '',
                features: [
                  'Unlimited agents',
                  'White-label option',
                  'API access',
                  'Custom integrations',
                  'SLA support',
                ],
                highlight: false,
                cta: 'Start Free Trial',
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl bg-card p-6 transition ${
                  plan.highlight
                    ? 'border-2 border-primary shadow-lg lg:scale-105'
                    : 'border border-border'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wide">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display text-lg font-bold text-foreground">
                  {plan.name}
                </h3>
                <div className="mt-3 mb-2 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-extrabold text-foreground">
                    {plan.price}
                  </span>
                  {plan.cadence && (
                    <span className="text-sm text-muted-foreground">{plan.cadence}</span>
                  )}
                </div>
                <span className="inline-flex self-start items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide mb-5">
                  60-day free trial
                </span>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2
                        size={14}
                        className="text-primary mt-0.5 shrink-0"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => setShowModal(true)}
                  variant={plan.highlight ? 'default' : 'outline'}
                  className="w-full font-semibold"
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          {/* Feature comparison */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-display text-lg font-bold text-foreground">
                Compare features
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="text-left font-semibold text-foreground px-6 py-3">
                      Feature
                    </th>
                    <th className="text-center font-semibold text-foreground px-3 py-3">Solo</th>
                    <th className="text-center font-semibold text-primary px-3 py-3">Agency</th>
                    <th className="text-center font-semibold text-foreground px-3 py-3">Agency Pro</th>
                    <th className="text-center font-semibold text-foreground px-3 py-3">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ['Pocket listings',       false, true,  true,  true],
                    ['Trust accounting',      true,  true,  true,  true],
                    ['Buyer concierge',       true,  true,  true,  true],
                    ['AI descriptions',       true,  true,  true,  true],
                    ['Bank reconciliation',   false, true,  true,  true],
                    ['Dedicated manager',     false, false, true,  true],
                  ] as Array<[string, boolean, boolean, boolean, boolean]>).map(
                    ([label, ...cells], idx) => (
                      <tr
                        key={label}
                        className={idx % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}
                      >
                        <td className="px-6 py-3 text-foreground">{label}</td>
                        {cells.map((included, i) => (
                          <td key={i} className="text-center px-3 py-3">
                            {included ? (
                              <CheckCircle2
                                size={16}
                                className="inline text-primary"
                              />
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
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
            "ListHQ gave us tools no other platform offers — the voice search alone brought in buyers we'd never have reached."
          </blockquote>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Early Access Agent</strong> · Melbourne, Australia
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
          <span className="font-display font-bold text-foreground">ListHQ</span>
          <span>© {new Date().getFullYear()} ListHQ Agent Network. All rights reserved.</span>
        </div>
      </footer>

      <AgentRegistrationModal open={showModal} onOpenChange={setShowModal} />
      
    </div>
  );
};

export default AgentLandingPage;
