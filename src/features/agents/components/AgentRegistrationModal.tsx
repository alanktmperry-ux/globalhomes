import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { X, CheckCircle2, ShieldCheck, Ban, Clock, Download, FileText, CreditCard, Building2, Play, Info, ExternalLink, Landmark, AlertTriangle, CalendarCheck, ListChecks, PlusCircle, Globe, Users, HelpCircle, Upload, BookOpen, Scale, Mail, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { useTranslation } from '@/shared/lib/i18n';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PROPERTY_TYPES: Array<{ value: string; key: string }> = [
  { value: 'Residential', key: 'agent.registration.form.propertyType.residential' },
  { value: 'Commercial', key: 'agent.registration.form.propertyType.commercial' },
  { value: 'Land', key: 'agent.registration.form.propertyType.land' },
  { value: 'Luxury ($2M+)', key: 'agent.registration.form.propertyType.luxury' },
];

const SUBURBS_OPTIONS = [
  'Toorak', 'South Yarra', 'Richmond', 'Carlton', 'Fitzroy',
  'St Kilda', 'Brighton', 'Hawthorn', 'Prahran', 'Collingwood',
  'CBD', 'Docklands', 'Southbank', 'Kew', 'Camberwell',
];

const PASSWORD_REQUIREMENTS = [
  { key: 'length', labelKey: 'agent.registration.password.req.length', test: (p: string) => p.length >= 8 },
  { key: 'upper', labelKey: 'agent.registration.password.req.upper', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'number', labelKey: 'agent.registration.password.req.number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', labelKey: 'agent.registration.password.req.special', test: (p: string) => /[!@#$%^&*]/.test(p) },
];

const AgentRegistrationModal = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'check-email' | 'set-password' | 'prepare' | 'trust-info' | 'cutover' | 'import-wizard' | 'form' | 'success'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // hCaptcha. NOTE: set VITE_HCAPTCHA_SITE_KEY in env. Falls back to hCaptcha's public test key.
  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || '10000000-ffff-ffff-ffff-000000000001';
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha | null>(null);
  const [pendingEmailSubmit, setPendingEmailSubmit] = useState(false);

  useEffect(() => {
    if (pendingEmailSubmit && captchaToken) {
      setPendingEmailSubmit(false);
      handleEmailSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEmailSubmit, captchaToken]);

  // Password step state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  

  const [form, setForm] = useState({
    fullName: '',
    agencyName: '',
    licenseNumber: '',
    mobile: '',
    email: '',
    suburbs: [] as string[],
    yearsExperience: '',
    propertyType: '',
  });

  const update = (field: string, value: string | string[]) =>
    setForm((p) => ({ ...p, [field]: value }));

  const toggleSuburb = (s: string) => {
    if (form.suburbs.includes(s)) {
      update('suburbs', form.suburbs.filter((x) => x !== s));
    } else if (form.suburbs.length < 5) {
      update('suburbs', [...form.suburbs, s]);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const unmet = PASSWORD_REQUIREMENTS.filter((r) => !r.test(newPassword));
    if (unmet.length > 0) {
      toast.error(`Password requirements not met: ${unmet.map((r) => t(r.labelKey)).join(', ')}`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('agent.registration.password.mismatch'));
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t('agent.registration.toast.passwordSet'));
      setStep('prepare');
    } catch (err: unknown) {
      toast.error(`Could not set password — ${getErrorMessage(err)}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.licenseNumber || !form.mobile) {
      toast.error(t('agent.registration.toast.missing'));
      return;
    }
    setLoading(true);

    try {
      // Get current authenticated user — password was already set in the set-password step
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('You must be signed in to complete registration');
      const authUser = currentUser;

      if (authUser) {
        // Create agent record
        await supabase.from('agents').insert({
          user_id: authUser.id,
          name: form.fullName,
          agency: form.agencyName || null,
          email: form.email,
          phone: form.mobile,
        });

        // Add agent role
        await supabase.from('user_roles').insert({
          user_id: authUser.id,
          role: 'agent' as any,
        });

        // Send welcome email to agent + admin alert (fire-and-forget)
        const sendNotification = (body: Record<string, string>) =>
          supabase.functions.invoke('send-notification-email', { body }).catch(() => {});

        sendNotification({
          type: 'agent_welcome',
          title: 'Welcome to ListHQ — Your Agent Account is Being Reviewed',
          message: 'Your account is pending approval.',
          agent_name: form.fullName,
          agent_email: form.email,
        });

        sendNotification({
          type: 'admin_new_agent',
          title: 'New Agent Registration — Action Required',
          message: `${form.fullName} has registered as a new agent.`,
          agent_name: form.fullName,
          agent_agency: form.agencyName || 'Independent',
          agent_email: form.email,
        });
      }

      setStep('success');
    } catch (err: unknown) {
      toast.error(`Error — ${(getErrorMessage(err))}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim()) return;
    if (!captchaToken) {
      setPendingEmailSubmit(true);
      captchaRef.current?.execute();
      return;
    }
    setEmailSubmitting(true);
    try {
      const email = emailInput.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: crypto.randomUUID(),
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/onboarding`,
          data: { registration_started: true },
        },
      });
      // If user already exists (identities=[]), send magic link instead
      if (!error && data.user && data.user.identities?.length === 0) {
        await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/dashboard/onboarding` },
        });
        sessionStorage.setItem('listhq_pending_email', email);
        update('email', email);
        setStep('check-email');
        toast.info('An account with this email already exists — we sent you a sign-in link');
        return;
      }
      if (error && !error.message.toLowerCase().includes('already registered')) {
        throw error;
      }
      sessionStorage.setItem('listhq_pending_email', email);
      update('email', email);
      setStep('check-email');
    } catch (err: unknown) {
      toast.error(`Could not send confirmation — ${getErrorMessage(err)}`);
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    setEmailSubmitting(true);
    try {
      await supabase.auth.resend({ type: 'signup', email: emailInput.trim().toLowerCase() });
      toast.success('Confirmation email resent — check your inbox');
    } catch (err: unknown) {
      toast.error(`Could not resend — ${getErrorMessage(err)}`);
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('email');
      setEmailInput('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.div
              key="email"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="mb-5">
                <DialogTitle className="font-display text-2xl font-extrabold">
                  {t('agent.registration.join.title')}
                </DialogTitle>
                <DialogDescription>
                  {t('agent.registration.join.subtitle')}
                </DialogDescription>
              </DialogHeader>

              {/* "Have these ready" checklist */}
              <div className="bg-secondary/50 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                  <ListChecks size={16} className="text-primary" />
                  {t('agent.registration.haveReady')}
                </div>
                <div className="space-y-2">
                  {[
                    { icon: <FileText size={14} />, text: 'ABN — 11-digit Australian Business Number' },
                    { icon: <ShieldCheck size={14} />, text: 'Real estate licence number — from your state regulator, not your CPD number' },
                    { icon: <Building2 size={14} />, text: 'Agency name — your trading name as registered' },
                    { icon: <Landmark size={14} />, text: 'Trust account BSB & account number — only needed if migrating from another system' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-primary mt-0.5 shrink-0">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="regEmailStart">{t('agent.registration.email.label')}</Label>
                  <Input
                    id="regEmailStart"
                    required
                    type="email"
                    autoFocus
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEmailSubmit(e); }}
                    placeholder={t('agent.registration.email.placeholder')}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    We'll send a confirmation link to this address before you continue.
                  </p>
                </div>


                <div className="flex justify-center">
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={hcaptchaSiteKey}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => setCaptchaToken(null)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={emailSubmitting || !captchaToken}
                  className="w-full py-5 rounded-xl text-base font-bold"
                >
                  {emailSubmitting
                    ? t('agent.registration.email.sending')
                    : !captchaToken
                      ? t('agent.registration.email.completeCaptcha')
                      : t('agent.registration.email.continue')}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  {t('agent.registration.email.alreadyAccount')}{' '}
                  <a href="/login" className="text-primary hover:underline">{t('agent.registration.email.signIn')}</a>
                </p>
              </form>
            </motion.div>
          ) : step === 'check-email' ? (
            <motion.div key="check-email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Mail size={32} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{t('agent.registration.check.title')}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{t('agent.registration.check.sentTo')}</p>
                  <p className="font-semibold text-foreground text-sm mt-1">{emailInput}</p>
                </div>
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-xs text-muted-foreground text-left space-y-1.5">
                  <p>· Click the link in the email to verify your address and continue setup</p>
                  <p>· Check your spam folder if it doesn't arrive within 2 minutes</p>
                  <p>· Your Agent Quick-Start Guide is included in the email — download it while you wait</p>
                  <p>· The confirmation link expires after 24 hours</p>
                </div>
                <Button variant="outline" className="w-full" onClick={handleResendEmail} disabled={emailSubmitting}>
                  {emailSubmitting ? t('agent.registration.check.sending') : t('agent.registration.check.resend')}
                </Button>
                <button onClick={() => { setStep('email'); setEmailInput(''); }} className="text-xs text-muted-foreground hover:text-foreground">
                  {t('agent.registration.check.wrongEmail')}
                </button>
              </div>
            </motion.div>
          ) : step === 'set-password' ? (
            <motion.div key="set-password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              <DialogHeader className="mb-5">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Lock size={28} className="text-primary" />
                </div>
                <DialogTitle className="font-display text-2xl font-extrabold text-center">
                  {t('agent.registration.password.title')}
                </DialogTitle>
                <DialogDescription className="text-center">
                  {t('agent.registration.password.subtitle')}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="newPassword">Password *</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      required
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('agent.registration.password.placeholder')}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Inline requirements */}
                  <div className="mt-2 space-y-1">
                    {PASSWORD_REQUIREMENTS.map((req) => {
                      const met = req.test(newPassword);
                      return (
                        <div key={req.key} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 size={14} className={met ? 'text-green-500' : 'text-muted-foreground/40'} />
                          <span className={met ? 'text-green-600' : 'text-muted-foreground'}>{t(req.labelKey)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">{t('agent.registration.password.confirm')}</Label>
                  <Input
                    id="confirmPassword"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('agent.registration.password.confirmPlaceholder')}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">{t('agent.registration.password.mismatch')}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-5 rounded-xl text-base font-bold"
                >
                  {passwordLoading ? t('agent.registration.password.setting') : t('agent.registration.password.submit')}
                </Button>
              </form>
            </motion.div>
          ) : step === 'prepare' ? (
            <motion.div
              key="prepare"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="mb-5">
                <DialogTitle className="font-display text-2xl font-extrabold">
                  {t('agent.registration.prepare.title')}
                </DialogTitle>
                <DialogDescription>
                  {t('agent.registration.prepare.subtitle')}
                </DialogDescription>
              </DialogHeader>

              <ul className="space-y-3 text-sm text-foreground mb-6">
                <li className="flex items-start gap-3">
                  <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Have your <strong>ABN</strong> ready — you'll need it in the next step</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Have your <strong>real estate licence number</strong> ready (e.g. 074356 or ES-1234567 depending on your state)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CreditCard size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Have your <strong>trust account BSB and account number</strong> ready if you're migrating from another system</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>The whole setup takes <strong>5 minutes</strong> for a fresh start, or <strong>15–20 minutes</strong> if you're migrating</span>
                </li>
                <li className="flex items-start gap-3">
                  <Building2 size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Not sure which path to choose? Choose <strong>"Starting fresh"</strong> — you can always import trust data later from Dashboard → Trust Accounting</span>
                </li>
              </ul>

              <a
                href="https://listhq.com.au/setup-guide"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline mb-6"
              >
                <Play size={16} />
                {t('agent.registration.prepare.watch')}
              </a>

              <Button className="w-full" onClick={() => setStep('trust-info')}>
                {t('agent.registration.prepare.ready')}
              </Button>
            </motion.div>
          ) : step === 'trust-info' ? (
            <motion.div
              key="trust-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="mb-5">
                <DialogTitle className="font-display text-2xl font-extrabold">
                  {t('agent.registration.trust.title')}
                </DialogTitle>
                <DialogDescription>
                  {t('agent.registration.trust.subtitle')}
                </DialogDescription>
              </DialogHeader>

              <ul className="space-y-3 text-sm text-foreground mb-6">
                <li className="flex items-start gap-3">
                  <Landmark size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Your trust account must be a <strong>dedicated bank account</strong> held in the name of your agency — it cannot be your personal or business operating account</span>
                </li>
                <li className="flex items-start gap-3">
                  <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>The account name must include the word <strong>"Trust"</strong> (e.g. "Smith Property Group Trust Account")</span>
                </li>
                <li className="flex items-start gap-3">
                  <CreditCard size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span><strong>BSB</strong> is 6 digits — enter it with or without the dash (e.g. 062-000 or 062000)</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>ListHQ <strong>never processes payments</strong> through your trust account — this information is used solely for reconciliation, receipting, and audit trail purposes</span>
                </li>
                <li className="flex items-start gap-3">
                  <Building2 size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>All major Australian banks are supported: NAB, CBA, ANZ, Westpac, Bendigo, BOQ, Macquarie</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
                  <span>If you don't have a trust account yet, contact your bank to open one before completing this step. Most banks can do this in 1–2 business days.</span>
                </li>
              </ul>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep('prepare')}>
                  {t('agent.registration.back')}
                </Button>
                <Button className="flex-1" onClick={() => setStep('cutover')}>
                  {t('agent.registration.continue')}
                </Button>
              </div>
            </motion.div>
          ) : step === 'cutover' ? (
            <motion.div
              key="cutover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="mb-5">
                <DialogTitle className="font-display text-2xl font-extrabold">
                  {t('agent.registration.cutover.title')}
                </DialogTitle>
                <DialogDescription>
                  {t('agent.registration.cutover.subtitle')}
                </DialogDescription>
              </DialogHeader>

              <ul className="space-y-3 text-sm text-foreground mb-5">
                <li className="flex items-start gap-3">
                  <CalendarCheck size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>The cut-over date is the <strong>last date</strong> you will record trust transactions in your old system. From the next business day, all trust activity is recorded in ListHQ only.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Choose a date when your trust account is <strong>fully reconciled</strong> — ideally a month-end or quarter-end</span>
                </li>
                <li className="flex items-start gap-3">
                  <ListChecks size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>You will need: <strong>(1)</strong> Trust Trial Balance as at the cut-over date, <strong>(2)</strong> Client Ledger Summary from your current system, <strong>(3)</strong> Bank statement showing the closing balance, <strong>(4)</strong> Active matters list</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
                  <span>Do <strong>NOT</strong> process transactions in both systems simultaneously after the cut-over date — this creates reconciliation discrepancies that are very difficult to unwind</span>
                </li>
              </ul>

              <a
                href="/ListHQ_Migration_Pre-Import_Checklist.xlsx"
                download
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors mb-6"
              >
                <Download size={16} className="shrink-0 text-primary" />
                {t('agent.registration.cutover.download')}
              </a>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep('trust-info')}>
                  {t('agent.registration.back')}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>
                  {t('agent.registration.skipFresh')}
                </Button>
                <Button className="flex-1" onClick={() => setStep('import-wizard')}>
                  {t('agent.registration.continue')}
                </Button>
              </div>
            </motion.div>
          ) : step === 'import-wizard' ? (
            <motion.div
              key="import-wizard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="mb-5">
                <DialogTitle className="font-display text-2xl font-extrabold">
                  {t('agent.registration.import.title')}
                </DialogTitle>
                <DialogDescription>
                  {t('agent.registration.import.subtitle')}
                </DialogDescription>
              </DialogHeader>

              <ul className="space-y-3 text-sm text-foreground mb-6">
                <li className="flex items-start gap-3">
                  <Upload size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>The Import Wizard brings in your existing trust ledger data — <strong>individual client balances</strong>, receipt history, and opening balance</span>
                </li>
                <li className="flex items-start gap-3">
                  <BookOpen size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Have your <strong>Client Ledger Summary</strong> export from your current system ready (PropertyMe, Console Cloud, Reapit, or TrustSoft all have export options)</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>The import <strong>does not affect your bank account</strong> — it only creates records in ListHQ matching your existing balances</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>If you're not ready to import now, click "Skip for now" — you can import later from <strong>Dashboard → Trust Accounting → Import Existing Account</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <Scale size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>After import, run a <strong>three-way reconciliation check</strong>: cashbook balance = bank statement = sum of all client ledgers</span>
                </li>
              </ul>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep('cutover')}>
                  {t('agent.registration.back')}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>
                  {t('agent.registration.skipForNow')}
                </Button>
                <Button className="flex-1" onClick={() => setStep('form')}>
                  {t('agent.registration.continue')}
                </Button>
              </div>
            </motion.div>
          ) : step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="mb-4">
                <DialogTitle className="font-display text-2xl font-extrabold">
                  {t('agent.registration.form.title')}
                </DialogTitle>
                <DialogDescription>
                  {t('agent.registration.form.subtitle')}
                </DialogDescription>
              </DialogHeader>

              {/* What you need for this step */}
              <details className="mb-4 rounded-lg border border-border bg-muted/50 text-sm">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-medium text-foreground select-none">
                  <Info size={16} className="shrink-0 text-primary" />
                  {t('agent.registration.form.whatYouNeed')}
                </summary>
                <div className="px-4 pb-4 pt-1 space-y-2.5 text-muted-foreground">
                  <p>
                    <strong className="text-foreground">ABN</strong> — your 11-digit Australian Business Number. Format: XX&nbsp;XXX&nbsp;XXX&nbsp;XXX.{' '}
                    <a href="https://abr.business.gov.au" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      Find it at abr.business.gov.au <ExternalLink size={12} />
                    </a>
                  </p>
                  <p>
                    <strong className="text-foreground">Real estate licence number</strong> — issued by your state regulator. This is <em>not</em> your CPD number.<br />
                    Examples: VIC (Consumer Affairs): 6-digit number · NSW (Fair Trading): starts with 20XXXXXXXX · QLD (OFT): starts with 4XXXXXXX
                  </p>
                  <p>
                    <strong className="text-foreground">Principal's full name</strong> — the Licensee in Charge (LIC) for your agency
                  </p>
                  <p>
                    <strong className="text-foreground">Operating state</strong> — select your primary state of operation. You can service other states once set up.
                  </p>
                  <p>
                    <strong className="text-foreground">Agency phone and email</strong> — these will appear on your public agency profile and listing enquiry forms
                  </p>
                  <p className="pt-1 text-xs italic text-muted-foreground/80">
                    Your licence number is used for compliance verification. Enter it exactly as it appears on your licence certificate.
                  </p>
                </div>
              </details>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name & Agency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="fullName">{t('agent.registration.form.fullName')}</Label>
                    <Input
                      id="fullName"
                      required
                      value={form.fullName}
                      onChange={(e) => update('fullName', e.target.value)}
                      placeholder={t('agent.registration.form.fullNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="agencyName">{t('agent.registration.form.agencyName')}</Label>
                    <Input
                      id="agencyName"
                      value={form.agencyName}
                      onChange={(e) => update('agencyName', e.target.value)}
                      placeholder={t('agent.registration.form.agencyPlaceholder')}
                    />
                  </div>
                </div>

                {/* License & Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="license">{t('agent.registration.form.license')}</Label>
                    <Input
                      id="license"
                      required
                      value={form.licenseNumber}
                      onChange={(e) => update('licenseNumber', e.target.value)}
                      placeholder={t('agent.registration.form.licensePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">{t('agent.registration.form.mobile')}</Label>
                    <Input
                      id="mobile"
                      required
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => update('mobile', e.target.value)}
                      placeholder={t('agent.registration.form.mobilePlaceholder')}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="regEmail">{t('agent.registration.form.email')}</Label>
                  <Input
                    id="regEmail"
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder={t('agent.registration.email.placeholder')}
                  />
                </div>

                {/* Primary Suburbs */}
                <div>
                  <Label>{t('agent.registration.form.suburbs')}</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {SUBURBS_OPTIONS.map((s) => {
                      const selected = form.suburbs.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSuburb(s)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors font-medium ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-secondary text-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('agent.registration.form.suburbsCount', { count: form.suburbs.length })}</p>
                </div>

                {/* Experience & Property Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="experience">{t('agent.registration.form.experience')}</Label>
                    <Input
                      id="experience"
                      type="number"
                      min="0"
                      value={form.yearsExperience}
                      onChange={(e) => update('yearsExperience', e.target.value)}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label>{t('agent.registration.form.primarilySell')}</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {PROPERTY_TYPES.map((pt) => (
                        <button
                          key={pt.value}
                          type="button"
                          onClick={() => update('propertyType', pt.value)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors font-medium ${
                            form.propertyType === pt.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-secondary text-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          {t(pt.key)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trust Signals */}
                <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                  {[
                    { icon: <ShieldCheck size={14} />, text: t('agent.registration.form.trust.verified') },
                    { icon: <Ban size={14} />, text: t('agent.registration.form.trust.noSpam') },
                    { icon: <Clock size={14} />, text: t('agent.registration.form.trust.cancel') },
                  ].map((t) => (
                    <div key={t.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-success">{t.icon}</span>
                      {t.text}
                    </div>
                  ))}
                </div>

                <Button type="submit" disabled={loading} className="w-full py-5 rounded-xl text-base font-bold">
                  {loading ? t('agent.registration.form.creating') : t('agent.registration.form.submit')}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8"
            >
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={32} className="text-success" />
              </div>
              <h3 className="font-display text-2xl font-extrabold text-center mb-1">{t('agent.registration.success.title')}</h3>
              <p className="text-muted-foreground text-sm text-center mb-6">
                {t('agent.registration.success.subtitle')}
              </p>

              <ul className="space-y-3 text-sm text-foreground mb-6">
                <li className="flex items-start gap-3">
                  <PlusCircle size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Go to Dashboard and click <strong>"New Listing"</strong> to create your first property listing</span>
                </li>
                <li className="flex items-start gap-3">
                  <Globe size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Enable multilingual translation on any listing by publishing it — translations generate automatically within 1–2 minutes</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Invite your team from <strong>Dashboard → Team</strong> using email invite or an invite code</span>
                </li>
                <li className="flex items-start gap-3">
                  <HelpCircle size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Need help? Go to <strong>Dashboard → Help</strong> and ask anything — it's AI-powered and knows the full platform</span>
                </li>
              </ul>

              <Button
                className="w-full"
                onClick={() => { handleClose(); navigate('/dashboard'); }}
              >
                {t('agent.registration.success.goDashboard')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default AgentRegistrationModal;
