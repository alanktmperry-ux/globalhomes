import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ShieldCheck, Ban, Clock, Download, FileText, CreditCard, Building2, Play, Info, ExternalLink, Landmark, AlertTriangle, CalendarCheck, ListChecks, PlusCircle, Globe, Users, HelpCircle, Upload, BookOpen, Scale, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Land', 'Luxury ($2M+)'];

const SUBURBS_OPTIONS = [
  'Toorak', 'South Yarra', 'Richmond', 'Carlton', 'Fitzroy',
  'St Kilda', 'Brighton', 'Hawthorn', 'Prahran', 'Collingwood',
  'CBD', 'Docklands', 'Southbank', 'Kew', 'Camberwell',
];

const AgentRegistrationModal = ({ open, onOpenChange }: Props) => {
  const [step, setStep] = useState<'email' | 'check-email' | 'prepare' | 'trust-info' | 'cutover' | 'import-wizard' | 'form' | 'success'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.licenseNumber || !form.mobile) {
      toast.error('Missing fields — Please fill in all required fields.');
      return;
    }
    setLoading(true);

    try {
      // Sign up the agent
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: crypto.randomUUID().slice(0, 16), // temp password, agent resets via email
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: form.fullName },
        },
      });
      if (authError) throw authError;

      if (authData.user) {
        // Create agent record
        await supabase.from('agents').insert({
          user_id: authData.user.id,
          name: form.fullName,
          agency: form.agencyName || null,
          email: form.email,
          phone: form.mobile,
        });

        // Add agent role
        await supabase.from('user_roles').insert({
          user_id: authData.user.id,
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationEmail) {
      toast.error('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: registrationEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      setStep('check-email');
    } catch (err: unknown) {
      toast.error(`Error — ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: registrationEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      toast.success('Verification email resent!');
    } catch (err: unknown) {
      toast.error(`Error — ${getErrorMessage(err)}`);
    } finally {
      setResending(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => setStep('email'), 300);
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
                  Get started with ListHQ
                </DialogTitle>
                <DialogDescription>
                  Enter your work email to begin. We'll send a verification link to confirm your identity.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="regEmailStart">Work email *</Label>
                  <Input
                    id="regEmailStart"
                    required
                    type="email"
                    autoFocus
                    value={registrationEmail}
                    onChange={(e) => setRegistrationEmail(e.target.value)}
                    placeholder="jane@agency.com.au"
                  />
                </div>

                <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                  {[
                    { icon: <Mail size={14} />, text: "We'll send a one-time verification link" },
                    { icon: <ShieldCheck size={14} />, text: 'No password needed — secure magic link sign-in' },
                    { icon: <Clock size={14} />, text: 'The whole setup takes about 5 minutes' },
                  ].map((t) => (
                    <div key={t.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-primary">{t.icon}</span>
                      {t.text}
                    </div>
                  ))}
                </div>

                <Button type="submit" disabled={loading} className="w-full py-5 rounded-xl text-base font-bold">
                  {loading ? 'Sending verification...' : (
                    <>Continue <ArrowRight size={16} className="ml-1.5" /></>
                  )}
                </Button>
              </form>
            </motion.div>
          ) : step === 'check-email' ? (
            <motion.div
              key="check-email"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Mail size={32} className="text-primary" />
              </div>

              <DialogHeader className="mb-5">
                <DialogTitle className="font-display text-2xl font-extrabold text-center">
                  Check your inbox
                </DialogTitle>
                <DialogDescription className="text-center">
                  We've sent a verification link to <strong className="text-foreground">{registrationEmail}</strong>. Click the link in the email to verify your identity and continue setup.
                </DialogDescription>
              </DialogHeader>

              <ul className="space-y-3 text-sm text-foreground mb-6">
                <li className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Check your inbox (and spam/junk folder) for an email from ListHQ</span>
                </li>
                <li className="flex items-start gap-3">
                  <ArrowRight size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>Click the verification link — it will bring you straight back here</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock size={18} className="mt-0.5 shrink-0 text-primary" />
                  <span>The link expires in <strong>1 hour</strong></span>
                </li>
              </ul>

              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full"
                >
                  {resending ? (
                    <><RefreshCw size={14} className="animate-spin mr-1.5" /> Resending...</>
                  ) : (
                    <><RefreshCw size={14} className="mr-1.5" /> Resend verification email</>
                  )}
                </Button>
                <button
                  onClick={() => setStep('email')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Use a different email address
                </button>
              </div>
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
                  Before you begin
                </DialogTitle>
                <DialogDescription>
                  Have these details handy — it'll make setup quick and painless.
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
                Watch our 3-minute setup walkthrough →
              </a>

              <Button className="w-full" onClick={() => setStep('trust-info')}>
                I'm ready — let's go
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
                  About your trust account
                </DialogTitle>
                <DialogDescription>
                  If your agency holds a statutory trust account, have the details ready.
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
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep('cutover')}>
                  Continue
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
                  Choosing your cut-over date
                </DialogTitle>
                <DialogDescription>
                  Only relevant if you're migrating from another trust accounting system. Otherwise, skip ahead.
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
                Download Migration Pre-Import Checklist (.xlsx)
              </a>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep('trust-info')}>
                  Back
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>
                  Skip — starting fresh
                </Button>
                <Button className="flex-1" onClick={() => setStep('import-wizard')}>
                  Continue
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
                  About the Trust Import Wizard
                </DialogTitle>
                <DialogDescription>
                  Bring your existing trust ledger data into ListHQ. You can also do this later.
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
                  Back
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>
                  Skip for now
                </Button>
                <Button className="flex-1" onClick={() => setStep('form')}>
                  Continue
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
                  Join the Agent Network
                </DialogTitle>
                <DialogDescription>
                  Start receiving voice-qualified leads for your territory.
                </DialogDescription>
              </DialogHeader>

              {/* What you need for this step */}
              <details className="mb-4 rounded-lg border border-border bg-muted/50 text-sm">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-medium text-foreground select-none">
                  <Info size={16} className="shrink-0 text-primary" />
                  What you need for this step
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
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      required
                      value={form.fullName}
                      onChange={(e) => update('fullName', e.target.value)}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <Label htmlFor="agencyName">Agency Name</Label>
                    <Input
                      id="agencyName"
                      value={form.agencyName}
                      onChange={(e) => update('agencyName', e.target.value)}
                      placeholder="Ray White"
                    />
                  </div>
                </div>

                {/* License & Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="license">License Number *</Label>
                    <Input
                      id="license"
                      required
                      value={form.licenseNumber}
                      onChange={(e) => update('licenseNumber', e.target.value)}
                      placeholder="VIC-12345"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile *</Label>
                    <Input
                      id="mobile"
                      required
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => update('mobile', e.target.value)}
                      placeholder="+61 4XX XXX XXX"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="regEmail">Email *</Label>
                  <Input
                    id="regEmail"
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="jane@agency.com.au"
                  />
                </div>

                {/* Primary Suburbs */}
                <div>
                  <Label>Primary Suburbs (max 5 for territory protection)</Label>
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
                  <p className="text-xs text-muted-foreground mt-1">{form.suburbs.length}/5 selected</p>
                </div>

                {/* Experience & Property Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="experience">Years Experience</Label>
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
                    <Label>I primarily sell:</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {PROPERTY_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => update('propertyType', t)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors font-medium ${
                            form.propertyType === t
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-secondary text-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trust Signals */}
                <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                  {[
                    { icon: <ShieldCheck size={14} />, text: 'Your license is verified securely' },
                    { icon: <Ban size={14} />, text: 'We never spam your clients' },
                    { icon: <Clock size={14} />, text: 'Cancel anytime, no lock-in contracts' },
                  ].map((t) => (
                    <div key={t.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-success">{t.icon}</span>
                      {t.text}
                    </div>
                  ))}
                </div>

                <Button type="submit" disabled={loading} className="w-full py-5 rounded-xl text-base font-bold">
                  {loading ? 'Creating your account...' : 'Join the Network'}
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
              <h3 className="font-display text-2xl font-extrabold text-center mb-1">You're all set!</h3>
              <p className="text-muted-foreground text-sm text-center mb-6">
                Your trust account has been created with a $0.00 opening balance. Here's what to do next.
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
                onClick={handleClose}
              >
                Go to Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default AgentRegistrationModal;
