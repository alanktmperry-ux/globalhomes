import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  ArrowRight, Brain, Users, FileText, ShoppingCart,
  Zap, Clock, TrendingUp, CheckCircle2, ChevronDown, ChevronUp,
  Sparkles, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: 'easeOut' as const },
  }),
};

const aiBuilds = [
  {
    icon: Brain,
    title: 'Seller Likelihood Score',
    desc: 'AI scores every property owner by likelihood to sell using 5 data signals. Target the right sellers before your competitors.',
    accent: 'from-primary/20 to-primary/5',
  },
  {
    icon: Users,
    title: 'AI Buyer Concierge',
    desc: 'Voice-powered search matches buyers to properties in seconds. 20 languages, instant results, qualified leads.',
    accent: 'from-success/20 to-success/5',
  },
  {
    icon: FileText,
    title: 'AI Offer Generator',
    desc: 'Generate professional offer letters with comparable sales data in one click. Download as PDF, ready to present.',
    accent: 'from-warning/20 to-warning/5',
  },
  {
    icon: ShoppingCart,
    title: 'Lead Marketplace',
    desc: 'Purchase pre-qualified buyer leads scored by intent. Know their budget, suburb, and property type before you call.',
    accent: 'from-destructive/15 to-destructive/5',
  },
];

const pricingPlans = [
  { name: 'Demo', price: 'Free', period: '', features: ['5 listings', '1 AI build', 'Basic CRM', '14-day trial'], cta: 'Start Free Demo', highlight: false },
  { name: 'Starter', price: '$79', period: '/mo', features: ['25 listings', '2 AI builds', 'Full CRM', 'Trust accounting', 'Email support'], cta: 'Get Started', highlight: false },
  { name: 'Pro', price: '$149', period: '/mo', features: ['Unlimited listings', 'All 4 AI builds', 'Lead marketplace access', 'Priority support', 'Team seats (3)'], cta: 'Go Pro', highlight: true },
  { name: 'Agency', price: '$349', period: '/mo', features: ['Everything in Pro', 'Unlimited seats', 'White-label reports', 'Partner portal', 'Dedicated onboarding'], cta: 'Contact Sales', highlight: false },
  { name: 'Enterprise', price: '$999', period: '/mo', features: ['Multi-office support', 'Custom integrations', 'SLA guarantee', 'API access', 'Account manager'], cta: 'Talk to Us', highlight: false },
];

const faqs = [
  { q: 'Do I need a real estate licence to use ListHQ?', a: 'Yes. ListHQ is built for licensed Australian real estate agents. We verify every agent\'s licence before activation.' },
  { q: 'How does the AI Seller Likelihood Score work?', a: 'Our AI analyses 5 public and behavioural signals — ownership tenure, renovation history, suburb growth rate, listing activity, and demographic changes — to score properties by likelihood to sell.' },
  { q: 'Is my data safe?', a: 'All data is encrypted at rest and in transit. Trust funds are held in auditable accounts per state regulations. We comply with the Australian Privacy Act 1988 and GDPR.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No lock-in contracts. Cancel from your dashboard and your plan continues until the end of the billing period.' },
  { q: 'What is the Lead Marketplace?', a: 'Buyer leads captured through our consumer search platform are scored by intent and made available for purchase. You see their budget, suburb preferences, and property type before buying.' },
  { q: 'Do you offer a refund?', a: 'Refunds are assessed on a case-by-case basis under Australian Consumer Law. Contact support within 14 days of purchase.' },
  { q: 'How do I get started?', a: 'Click "Start Free Demo" — no credit card required. You\'ll get access to 5 listings and 1 AI build for 14 days.' },
];

export default function MarketingLandingPage() {
  const navigate = useNavigate();
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('agents').select('id', { count: 'exact', head: true })
      .then(({ count }) => { if (count !== null) setAgentCount(count); });
  }, []);

  const spotsRemaining = Math.max(0, 100 - (agentCount ?? 0));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>ListHQ — AI-Powered Real Estate Platform for Australian Agents</title>
        <meta name="description" content="ListHQ gives Australian real estate agents AI tools to find sellers, match buyers, generate offer letters, and purchase qualified leads. Start free." />
        <meta property="og:title" content="ListHQ — Australia's AI Property Platform" />
        <meta property="og:description" content="4 AI builds that replace hours of manual work. Seller scores, buyer matching, AI offers, and a lead marketplace. Built for Australian agents." />
        <meta property="og:url" content="https://listhq.com.au" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://listhq.com.au" />
      </Helmet>

      {/* ─── FOUNDING AGENT BANNER ─── */}
      {spotsRemaining > 0 && (
        <div className="bg-primary text-primary-foreground text-center py-2.5 text-sm font-medium">
          🚀 Founding Agent Offer — First 100 agents get 40% off forever.{' '}
          <span className="font-bold">{spotsRemaining} spots remaining.</span>
        </div>
      )}

      {/* ─── HERO ─── */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="relative container mx-auto px-6 text-center max-w-4xl">
          <motion.div initial="hidden" animate="visible">
            <motion.span variants={fadeUp} custom={0} className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide uppercase mb-6">
              Built for Australian Agents
            </motion.span>
            <motion.h1 variants={fadeUp} custom={1} className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] mb-6">
              Your Unfair Advantage in{' '}
              <span className="text-primary">Australian Real Estate</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              4 AI builds that replace hours of manual work. Find sellers, match buyers, generate offers, and purchase qualified leads — all in one platform.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/agents/demo')} className="text-base px-10 py-6 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform">
                Start Free Demo <ArrowRight size={18} className="ml-1" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-base px-10 py-6 rounded-xl font-semibold">
                View Pricing
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── PAIN POINT ─── */}
      <section className="py-20 bg-secondary/50 border-y border-border">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }}>
            <motion.div variants={fadeUp} custom={0} className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <Clock size={32} className="text-destructive" />
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-4xl font-extrabold mb-4">
              Agents spend 60% of their time on tasks AI can handle
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-lg leading-relaxed">
              Chasing cold leads, writing offer letters from scratch, manually matching buyers to properties, and guessing which homeowners might sell. ListHQ automates all of it.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── 4 AI BUILDS ─── */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="text-center mb-16">
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl sm:text-4xl font-extrabold mb-3">
              Four AI Builds. One Platform.
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto">
              Each build solves a specific bottleneck in the agent workflow.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {aiBuilds.map((build, i) => (
              <motion.div key={build.title} variants={fadeUp} custom={i} className="group rounded-2xl border border-border bg-card p-8 hover:shadow-elevated transition-shadow">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${build.accent} flex items-center justify-center text-primary mb-5`}>
                  <build.icon size={28} />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">{build.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{build.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ─── */}
      <section className="py-20 bg-secondary/30 border-y border-border">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="font-display text-2xl font-extrabold text-center mb-10">What Agents Are Saying</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { quote: '"The AI Seller Score found me 3 listings in my first week that I would have missed completely."', name: 'Founding Agent', location: 'Melbourne' },
              { quote: '"Voice search brought in international buyers I didn\'t know existed in my suburb."', name: 'Early Access Agent', location: 'Sydney' },
            ].map((t, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-8">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={16} className="fill-primary text-primary" />)}
                </div>
                <blockquote className="font-display text-lg font-semibold italic leading-relaxed mb-4">{t.quote}</blockquote>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">{t.name}</strong> · {t.location}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">More testimonials coming after our first 5 founding agents.</p>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold mb-3">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">No hidden fees. No lock-in contracts. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                    : 'border-border bg-card'
                }`}
              >
                {plan.highlight && (
                  <span className="inline-block self-start px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide mb-3">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="font-display text-3xl font-extrabold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 size={14} className="text-success mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlight ? 'default' : 'outline'}
                  className="w-full rounded-xl font-semibold"
                  onClick={() => navigate('/agents/login')}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 bg-secondary/30 border-t border-border">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-display text-sm font-semibold pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={18} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={18} className="shrink-0 text-muted-foreground" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary-foreground)/0.05),transparent_70%)]" />
        <div className="relative container mx-auto px-6 text-center max-w-2xl">
          <Sparkles size={32} className="text-primary-foreground/60 mx-auto mb-4" />
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-foreground mb-4">
            Join {spotsRemaining > 0 ? `${spotsRemaining}` : '100'} Founding Agents
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-8">
            Limited spots at 40% off forever. No credit card required for your free demo.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/agents/demo')}
            className="text-base px-10 py-6 rounded-xl font-bold hover:scale-[1.02] transition-transform"
          >
            Start Free Demo <ArrowRight size={18} className="ml-1" />
          </Button>
        </div>
      </section>
    </div>
  );
}
