import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Sparkles, Share2, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/shared/lib/i18n';

export default function WaitlistPage() {
  const { t } = useTranslation();
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
          toast.info(t('marketing.waitlist.toast.alreadyOn'));
        } else {
          toast.error(t('marketing.waitlist.toast.generic'));
        }
      } else {
        setPosition((data as any)?.position ?? null);
        setSubmitted(true);
        toast.success(t('marketing.waitlist.toast.onList'));
      }
    } catch {
      toast.error(t('marketing.waitlist.toast.generic'));
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = `${window.location.origin}/waitlist?ref=${encodeURIComponent(email)}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success(t('marketing.waitlist.toast.copied'));
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
          <h1 className="font-display text-3xl font-extrabold mb-2">{t('marketing.waitlist.title')}</h1>
          <p className="text-muted-foreground">
            {t('marketing.waitlist.subtitle')}
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder={t('marketing.waitlist.fields.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-12"
            />
            <Input
              type="email"
              placeholder={t('marketing.waitlist.fields.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl h-12"
            />
            <Input
              type="text"
              placeholder={t('marketing.waitlist.fields.agency')}
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              className="rounded-xl h-12"
            />
            {referredBy && (
              <p className="text-xs text-primary flex items-center gap-1">
                <CheckCircle2 size={14} /> {t('marketing.waitlist.referred')}
              </p>
            )}
            <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base" disabled={loading}>
              {loading ? t('marketing.waitlist.joining') : t('marketing.waitlist.submit')}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8">
              <CheckCircle2 size={40} className="text-primary mx-auto mb-3" />
              <p className="font-display text-lg font-bold mb-1">{t('marketing.waitlist.success.title')}</p>
              {position && (
                <p className="text-4xl font-display font-extrabold text-primary my-3">
                  #{position}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {t('marketing.waitlist.success.note')}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Share2 size={16} className="text-primary" />
                <p className="font-display text-sm font-bold">{t('marketing.waitlist.share.title')}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {t('marketing.waitlist.share.body')}
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
