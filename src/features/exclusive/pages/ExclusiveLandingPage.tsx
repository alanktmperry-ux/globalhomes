import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Bell, Users, Eye, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import JoinExclusiveModal from '../components/JoinExclusiveModal';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  { icon: Eye, title: 'First access', body: 'See premium listings up to 14 days before they hit REA or Domain.' },
  { icon: Users, title: 'Less competition', body: 'Fewer buyers in the room means a real chance to negotiate.' },
  { icon: Bell, title: 'Instant alerts', body: 'Email and SMS the moment a new match drops in your suburbs.' },
];

const STEPS = [
  { n: 1, title: 'Set your search criteria', body: 'Tell us your suburbs, budget and must-haves.' },
  { n: 2, title: 'Get instant alerts', body: 'We notify you the second a matching listing goes live to members.' },
  { n: 3, title: 'Enquire before the public', body: 'Register interest and view before anyone else.' },
];

const FAQ = [
  { q: 'What happens after the 14-day exclusive window?', a: 'The listing is automatically released to the wider public on REA, Domain and the public ListHQ feed.' },
  { q: 'How many exclusive listings are there?', a: 'Numbers vary week to week — typically 30-80 active exclusive listings across Australia at any time, with new properties added daily.' },
  { q: 'Can I cancel anytime?', a: 'Yes. You can cancel your $29/month membership at any time from your account settings — no contracts, no exit fees.' },
  { q: 'Do agents see I\'m a member?', a: 'Yes — registering interest as a member signals you are a serious buyer. Agents prioritise these enquiries.' },
];

export default function ExclusiveLandingPage() {
  const [joinOpen, setJoinOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>ListHQ Exclusive — See homes 14 days before anyone else</title>
        <meta name="description" content="Join ListHQ Exclusive for 14-day early access to property listings before they hit REA or Domain. Less competition, instant alerts. $29/month, cancel anytime." />
      </Helmet>

      {/* Hero */}
      <section className="bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="max-w-5xl mx-auto px-4 py-20 sm:py-28 relative">
          <Badge className="bg-red-500 hover:bg-red-500 text-white border-0 mb-5">NEW</Badge>
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight mb-5">
            See homes before<br />anyone else.
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-8">
            Get 14-day early access to properties before they hit REA or Domain. Less competition. Better outcomes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="bg-primary hover:bg-primary/90 gap-2" onClick={() => setJoinOpen(true)}>
              <Sparkles size={18} /> Join ListHQ Exclusive
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white" onClick={() => navigate('/exclusive/listings')}>
              Browse exclusive listings <ChevronRight size={16} />
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-4">$29/month — Cancel anytime</p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-card border border-border rounded-2xl p-6">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <f.icon size={20} />
              </div>
              <h3 className="font-display text-lg font-bold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="font-display text-3xl font-bold text-center mb-2">How it works</h2>
          <p className="text-muted-foreground text-center mb-10">Three steps. Five minutes to set up.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {STEPS.map(s => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mb-3">
                  {s.n}
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-primary/10 via-card to-card border-2 border-primary/30 rounded-3xl p-8 text-center">
          <Badge className="bg-primary text-primary-foreground mb-4">MEMBER PRICING</Badge>
          <p className="font-display text-5xl font-bold mb-1">$29<span className="text-xl text-muted-foreground font-normal">/month</span></p>
          <p className="text-muted-foreground mb-6">Cancel anytime — no contracts</p>
          <ul className="text-left max-w-sm mx-auto space-y-2 mb-7">
            {[
              '14 days early access on every member listing',
              'Instant SMS + email alerts on matches',
              'Verified-buyer status with agents',
              'Priority enquiries on hot listings',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check size={16} className="text-primary mt-0.5 shrink-0" /> {item}
              </li>
            ))}
          </ul>
          <Button size="lg" className="w-full sm:w-auto gap-2" onClick={() => setJoinOpen(true)}>
            <Sparkles size={18} /> Join ListHQ Exclusive
          </Button>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-secondary/30 border-y border-border">
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <p className="font-display text-xl sm:text-2xl italic text-foreground/90 leading-relaxed mb-4">
            "We saw the listing on a Monday, inspected on Wednesday, and had the contract signed before it ever appeared on REA. Worth every cent."
          </p>
          <p className="text-sm text-muted-foreground">— Member testimonial coming soon</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-center mb-8">Frequently asked</h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item, i) => (
            <AccordionItem key={i} value={`q-${i}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="text-center mt-8">
          <Button size="lg" onClick={() => setJoinOpen(true)} className="gap-2">
            <Sparkles size={18} /> Join now — $29/month
          </Button>
        </div>
      </section>

      <JoinExclusiveModal open={joinOpen} onOpenChange={setJoinOpen} />
    </>
  );
}
