import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, Upload, CheckCircle2, Landmark, Calendar, Loader2, Download, Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';
import TrustImportWizard from '@/features/agents/components/dashboard/TrustImportWizard';

type OnboardingPath = 'fresh' | 'migration';

const STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;

const STATE_LEGISLATION: Record<string, string> = {
  VIC: 'Governed by Estate Agents Act 1980 (Vic)',
  NSW: 'Governed by Property and Stock Agents Act 2002 (NSW)',
  QLD: 'Governed by Agents Financial Administration Act 2014 (Qld)',
  SA: 'Governed by Land Agents Act 1994 (SA)',
  WA: 'Governed by Real Estate and Business Agents Act 1978 (WA)',
  TAS: 'Governed by Property Agents and Land Transactions Act 2005 (Tas)',
  ACT: 'Governed by Agents Act 2003 (ACT)',
  NT: 'Governed by Agents Licensing Act 1979 (NT)',
};

const BANKS = ['NAB', 'CBA', 'ANZ', 'Westpac', 'Bendigo', 'BOQ', 'Macquarie', 'Other'];

const DATE_AU = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });

export default function AgencyOnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [path, setPath] = useState<OnboardingPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardCompleted, setWizardCompleted] = useState(false);

  // Step 2 — Agency details
  const [agencyName, setAgencyName] = useState('');
  const [abn, setAbn] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [operatingState, setOperatingState] = useState('');
  const [agencyAddress, setAgencyAddress] = useState('');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencyEmail, setAgencyEmail] = useState('');

  // Step 3 — Trust account
  const [trustAccountName, setTrustAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bsb, setBsb] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Step 4 — Cut-over date
  const [cutoverDate, setCutoverDate] = useState('');

  // Pre-fill trust account name when agency name changes
  useEffect(() => {
    if (agencyName && !trustAccountName) {
      setTrustAccountName(`${agencyName} Trust Account`);
    }
  }, [agencyName]);

  const totalSteps = path === 'migration' ? 6 : 5;
  const progressPct = ((step + 1) / totalSteps) * 100;

  // Calculate effective step index — skip step 4 for 'fresh' path
  const getEffectiveStep = () => {
    if (path === 'fresh' && step >= 4) return step; // steps 0-3, then 4 maps to step 5 content
    return step;
  };

  const completeOnboarding = async () => {
    if (!user) return;
    await supabase.from('agents').update({ onboarding_complete: true } as any).eq('user_id', user.id);
  };

  const handleStep2Next = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Call setup-agent edge function
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          fullName: principalName,
          phone: agencyPhone,
          mode: 'create-agency',
          agencyName,
          agencyEmail,
          licenseNumber: licenceNumber,
          officeAddress: agencyAddress,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Setup failed');

      // Also update agent record with licence and state
      await supabase.from('agents').update({
        license_number: licenceNumber,
        office_address: agencyAddress,
      } as any).eq('user_id', user.id);

      toast.success('Agency created successfully');
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create agency');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Next = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).single();
      if (!agent) throw new Error('Agent not found');

      const cleanBsb = bsb.replace(/-/g, '');
      await supabase.from('trust_accounts').insert({
        agent_id: agent.id,
        account_name: trustAccountName,
        account_type: 'trust',
        bsb: cleanBsb,
        account_number: accountNumber,
        bank_name: bankName,
        balance: 0,
      } as any);

      toast.success('Trust account created');
      // Skip step 4 for fresh path
      if (path === 'fresh') {
        setStep(4); // goes to step 5 content (fresh confirmation)
      } else {
        setStep(4); // goes to step 4 content (cut-over date)
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to create trust account');
    } finally {
      setLoading(false);
    }
  };

  const generateImportChecklist = () => {
    const today = DATE_AU.format(new Date());
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Trust Migration Pre-Import Checklist</title>
<style>
  @page { size: A4; margin: 25mm 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 16pt; margin-bottom: 4px; }
  .header p { font-size: 10pt; color: #666; }
  .item { display: flex; gap: 12px; padding: 16px 0; border-bottom: 1px solid #eee; }
  .checkbox { width: 20px; height: 20px; border: 2px solid #333; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
  .item-content h3 { font-size: 11pt; margin-bottom: 4px; }
  .item-content p { font-size: 9pt; color: #666; }
  .write-in { border-bottom: 1px solid #999; min-height: 24px; margin-top: 8px; }
  .footer { margin-top: 30px; text-align: center; font-size: 8pt; color: #aaa; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <h1>Trust Migration Pre-Import Checklist</h1>
  <p>Prepare these documents before importing into ListHQ</p>
  <p style="font-size:9pt;color:#999;margin-top:4px;">Agency: ${agencyName} · Cut-over date: ${cutoverDate || '_______________'}</p>
</div>
<div class="item">
  <div class="checkbox"></div>
  <div class="item-content">
    <h3>Trust Trial Balance as at cut-over date</h3>
    <p>Run the Trial Balance report from your current system. Balance: <div class="write-in"></div></p>
  </div>
</div>
<div class="item">
  <div class="checkbox"></div>
  <div class="item-content">
    <h3>Client Ledger Summary</h3>
    <p>From Reports in your current system — lists all clients with trust funds held. Number of clients: <div class="write-in"></div></p>
  </div>
</div>
<div class="item">
  <div class="checkbox"></div>
  <div class="item-content">
    <h3>Last bank statement showing closing balance</h3>
    <p>Must match the Trial Balance total. Closing balance: <div class="write-in"></div></p>
  </div>
</div>
<div class="item">
  <div class="checkbox"></div>
  <div class="item-content">
    <h3>Active matters list (clients with funds in trust)</h3>
    <p>Export from your current system. Number of active matters: <div class="write-in"></div></p>
  </div>
</div>
<div class="footer">
  Generated ${today} · ListHQ Trust Accounting · Retain for audit records
</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=800,height=1100');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
    toast.success('Import checklist generated');
  };

  const renderStep = () => {
    // STEP 0 — Welcome & path selection
    if (step === 0) {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Building2 size={28} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold">Welcome — let's get your agency set up</h2>
            <p className="text-sm text-muted-foreground">Choose how you'd like to get started</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card
              className={`cursor-pointer transition-all border-2 ${path === 'fresh' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/40 hover:shadow-sm'}`}
              onClick={() => setPath('fresh')}
            >
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Settings2 size={24} className="text-primary" />
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Quickest setup — 5 mins</Badge>
                </div>
                <h3 className="font-bold">Starting fresh</h3>
                <p className="text-xs text-muted-foreground">New agency, no trust history to import. Create your trust account with a $0 opening balance.</p>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all border-2 ${path === 'migration' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/40 hover:shadow-sm'}`}
              onClick={() => setPath('migration')}
            >
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Upload size={24} className="text-primary" />
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Allow 15–20 mins</Badge>
                </div>
                <h3 className="font-bold">Migrating from another system</h3>
                <p className="text-xs text-muted-foreground">Moving from PropertyMe, Console Cloud, Reapit, or TrustSoft. Import your opening balances and ledger.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // STEP 1 — Agency & licence details (index 1 → visual step 2)
    if (step === 1) {
      return (
        <div className="space-y-5">
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Building2 size={26} className="text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Agency & Licence Details</h3>
            <p className="text-sm text-muted-foreground">Required for compliance and trust account setup</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold text-foreground">Agency trading name <span className="text-destructive ml-0.5">*</span></Label>
              <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="e.g. Smith Property Group" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground">ABN <span className="text-destructive ml-0.5">*</span></Label>
              <Input
                value={abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setAbn(digits);
                }}
                placeholder="12 345 678 901"
                className="mt-1.5 font-mono tracking-wider"
                maxLength={14}
              />
              {abn.length > 0 && abn.length < 11 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {11 - abn.length} more digit{11 - abn.length !== 1 ? 's' : ''} to go
                </p>
              )}
              {abn.length === 11 && (
                <p className="text-[11px] text-emerald-600 font-medium mt-1">✓ ABN complete</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground">Real estate licence number <span className="text-destructive ml-0.5">*</span></Label>
              <Input value={licenceNumber} onChange={e => setLicenceNumber(e.target.value)} placeholder="e.g. 074356" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium">Principal's full name *</Label>
              <Input value={principalName} onChange={e => setPrincipalName(e.target.value)} placeholder="e.g. Sarah Mitchell" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-medium">State of operation *</Label>
              <Select value={operatingState} onValueChange={setOperatingState}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Agency phone *</Label>
              <Input value={agencyPhone} onChange={e => setAgencyPhone(e.target.value)} placeholder="(03) 9123 4567" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium">Agency street address *</Label>
              <Input value={agencyAddress} onChange={e => setAgencyAddress(e.target.value)} placeholder="123 High Street, Richmond VIC 3121" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium">Agency email *</Label>
              <Input type="email" value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)} placeholder="office@smithproperty.com.au" className="mt-1.5" />
            </div>
          </div>
          {operatingState && (
            <div className="bg-muted/50 border border-border rounded-lg p-3 flex items-start gap-2">
              <Landmark size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{STATE_LEGISLATION[operatingState]}</p>
            </div>
          )}
        </div>
      );
    }

    // STEP 2 — Trust account bank details (index 2 → visual step 3)
    if (step === 2) {
      return (
        <div className="space-y-5">
          <div className="text-center space-y-1 mb-4">
            <Landmark size={32} className="mx-auto text-primary" />
            <h3 className="text-base font-bold">Trust Account Bank Details</h3>
            <p className="text-xs text-muted-foreground">Your statutory trust account for holding client funds</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium">Account name</Label>
              <Input value={trustAccountName} onChange={e => setTrustAccountName(e.target.value)} placeholder="Agency Name Trust Account" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs font-medium">Bank name *</Label>
              <Select value={bankName} onValueChange={setBankName}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Account type</Label>
              <div className="mt-1.5">
                <Badge variant="secondary" className="text-xs px-3 py-1.5">Trust Account</Badge>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">BSB *</Label>
              <Input value={bsb} onChange={e => setBsb(e.target.value)} placeholder="062-000" className="mt-1.5 font-mono" maxLength={7} />
              {bsb && bsb.replace(/-/g, '').length !== 6 && <p className="text-[10px] text-destructive mt-1">BSB must be 6 digits</p>}
            </div>
            <div>
              <Label className="text-xs font-medium">Account number *</Label>
              <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="12345678" className="mt-1.5 font-mono" />
            </div>
          </div>
          <div className="bg-muted/50 border border-border rounded-lg p-3 flex items-start gap-2">
            <Landmark size={14} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your trust account must be held with an approved Australian ADI (Authorised Deposit-taking Institution).
              The account name must include the word 'Trust'.
            </p>
          </div>
        </div>
      );
    }

    // STEP 3 — Cut-over date (migration only) OR Fresh confirmation (index 3)
    if (step === 3) {
      if (path === 'fresh') {
        // For fresh path, step 3 is actually the trust bank details next handler result
        // This shouldn't render — step goes to 4 directly
      }
      // For migration: cut-over date (step index 3 → visual step 4)
      if (path === 'migration') {
        return (
          <div className="space-y-5">
            <div className="text-center space-y-1 mb-4">
              <Calendar size={32} className="mx-auto text-primary" />
              <h3 className="text-base font-bold">When are you switching to ListHQ?</h3>
              <p className="text-xs text-muted-foreground">All transactions from this date will be recorded in ListHQ</p>
            </div>
            <div>
              <Label className="text-xs font-medium">Cut-over date *</Label>
              <Input type="date" value={cutoverDate} onChange={e => setCutoverDate(e.target.value)} className="mt-1.5" />
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-foreground">Before proceeding, your trust account must be reconciled to this date in your current system. You will need:</p>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Trust Trial Balance as at cut-over date</li>
                <li>Client Ledger Summary (from Reports in your current system)</li>
                <li>Last bank statement showing the closing balance</li>
                <li>Active matters list (clients with funds in trust)</li>
              </ul>
            </div>
            <Button variant="outline" size="sm" onClick={generateImportChecklist} className="w-full gap-2">
              <Download size={14} /> Download import checklist
            </Button>
          </div>
        );
      }
    }

    // STEP 4 — Opening balance import (index 4)
    if (step === 4) {
      if (path === 'fresh') {
        return (
          <div className="space-y-5">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-primary" />
              </div>
              <h3 className="text-base font-bold">Your trust account is ready</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Your trust account has been created with a $0.00 opening balance.
                You can start recording trust transactions immediately.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                await completeOnboarding();
                navigate('/dashboard');
              }}
            >
              Continue to Dashboard <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        );
      }

      // Migration path — open import wizard
      return (
        <div className="space-y-5">
          <div className="text-center space-y-1 mb-4">
            <Upload size={32} className="mx-auto text-primary" />
            <h3 className="text-base font-bold">Import your opening balance</h3>
            <p className="text-xs text-muted-foreground">
              Use the Trust Import Wizard to bring in your existing trust data
            </p>
          </div>
          <Button className="w-full gap-2" onClick={() => setShowWizard(true)}>
            <Upload size={14} /> Open Trust Import Wizard
          </Button>
          <Separator />
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Not ready to import yet? You can skip this for now and import your opening balance later from Trust Dashboard → Import Existing Account.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={async () => {
                await completeOnboarding();
                navigate('/dashboard');
              }}
            >
              Skip for now
            </Button>
          </div>
        </div>
      );
    }

    // STEP 5 — Complete (migration path only, after wizard closes)
    if (step === 5) {
      return (
        <div className="space-y-5">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold">Your agency is live on ListHQ</h2>
          </div>
          <div className="space-y-2">
            {['Agency created', 'Trust account set up', 'Opening balance imported'].map((item) => (
              <div key={item} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <Button onClick={() => navigate('/dashboard/trust')} className="gap-2">
              <Landmark size={14} /> Go to Trust Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard/rent-roll')} className="gap-2">
              <Building2 size={14} /> Go to Rent Roll
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  const canNext = () => {
    switch (step) {
      case 0: return !!path;
      case 1: return agencyName.trim() && abn.length === 11 && licenceNumber.trim() && principalName.trim() && operatingState && agencyAddress.trim() && agencyPhone.trim() && agencyEmail.trim();
      case 2: return bankName && bsb.replace(/-/g, '').length === 6 && accountNumber.trim();
      case 3: return path === 'fresh' || !!cutoverDate;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      await handleStep2Next();
      return;
    }
    if (step === 2) {
      await handleStep3Next();
      return;
    }
    setStep(s => s + 1);
  };

  const showBackButton = step > 0 && step < 4;
  const showNextButton = step < 3 || (step === 3 && path === 'migration');

  const stepLabels = path === 'migration'
    ? ['Welcome', 'Agency', 'Trust Account', 'Cut-over', 'Import', 'Complete']
    : ['Welcome', 'Agency', 'Trust Account', 'Ready', 'Complete'];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">L</span>
          </div>
          <span className="font-display text-lg font-bold text-foreground">ListHQ</span>
        </div>
        {/* Progress */}
        <div className="space-y-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Agency Setup
            </h1>
            <p className="text-sm text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </p>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex justify-between">
            {stepLabels.map((label, i) => (
              <span
                key={i}
                className={`text-[11px] font-medium transition-colors ${i < step ? 'text-primary' : i === step ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
              >
                {i < step ? '✓ ' : ''}{label}
              </span>
            ))}
          </div>
        </div>

        {/* Step content */}
        <Card>
          <CardContent className="p-6">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              {renderStep()}
            </motion.div>
          </CardContent>
        </Card>

        {/* Navigation */}
        {(showBackButton || showNextButton) && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {showBackButton ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={loading} className="w-full sm:w-auto">
                <ArrowLeft size={14} className="mr-1" /> Back
              </Button>
            ) : <div />}
            {showNextButton && (
              <Button size="sm" disabled={!canNext() || loading} onClick={handleNext} className="w-full sm:w-auto">
                {loading && <Loader2 size={14} className="mr-1 animate-spin" />}
                Next <ArrowRight size={14} className="ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Trust Import Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6">
            <TrustImportWizard
              onComplete={async () => {
                setShowWizard(false);
                setWizardCompleted(true);
                await completeOnboarding();
                setStep(5);
              }}
              onCancel={() => setShowWizard(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
