import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Sparkles, Share2, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [agency, setAgency] = useState('');
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Check for referral in URL
  const params = new URLSearchParams(window.location.search);
  const referredBy = params.get('ref') || undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('waitlist' as any)
        .insert([{ email, name: name || null, agency: agency || null, referred_by: referredBy || null }] as any)
        .select('position')
        .single();

      if (error) {
        if (error.code === '23505') {
          // Already on waitlist — fetch position
          const { data: existing } = await supabase
            .from('waitlist' as any)
            .select('position')
            .eq('email', email)
            .single();
          if (existing) {
            setPosition((existing as any).position);
            setSubmitted(true);
          }
          toast.info("You're already on the waitlist!");
        } else {
          toast.error('Something went wrong. Please try again.');
        }
      } else {
        setPosition((data as any)?.position ?? null);
        setSubmitted(true);
        toast.success("You're on the list!");
      }
    } catch {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = `${window.location.origin}/waitlist?ref=${encodeURIComponent(email)}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied!');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <Helmet>
        <title>Join the Waitlist — ListHQ</title>
        <meta name="description" content="Join the ListHQ waitlist and be among the first Australian agents to access AI-powered real estate tools." />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-primary" />
          </div>
          <h1 className="font-display text-3xl font-extrabold mb-2">Join the Waitlist</h1>
          <p className="text-muted-foreground">
            Be among the first 100 founding agents to access ListHQ's AI tools.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-12"
            />
            <Input
              type="email"
              placeholder="Email address *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl h-12"
            />
            <Input
              type="text"
              placeholder="Agency name (optional)"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              className="rounded-xl h-12"
            />
            {referredBy && (
              <p className="text-xs text-primary flex items-center gap-1">
                <CheckCircle2 size={14} /> Referred — you'll jump 5 spots!
              </p>
            )}
            <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base" disabled={loading}>
              {loading ? 'Joining...' : 'Join the Waitlist'}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8">
              <CheckCircle2 size={40} className="text-primary mx-auto mb-3" />
              <p className="font-display text-lg font-bold mb-1">You're on the list!</p>
              {position && (
                <p className="text-4xl font-display font-extrabold text-primary my-3">
                  #{position}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                We'll email you when it's your turn.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Share2 size={16} className="text-primary" />
                <p className="font-display text-sm font-bold">Share to jump 5 spots</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Each colleague who joins through your link moves you up.
              </p>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs rounded-xl h-10" />
                <Button variant="outline" size="sm" onClick={copyShareLink} className="shrink-0 rounded-xl h-10">
                  <Copy size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
