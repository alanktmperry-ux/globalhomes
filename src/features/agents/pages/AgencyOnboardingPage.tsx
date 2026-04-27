import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { ArrowLeft, ArrowRight, Building2, Upload, CheckCircle2, Landmark, Calendar, Loader2, Download, Settings2, BookOpen, ChevronDown, Lock, Eye, EyeOff, PlusCircle, Globe, Users, HelpCircle } from 'lucide-react';
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
import { getErrorMessage } from '@/shared/lib/errorUtils';

type OnboardingPath = 'fresh' | 'migration';

const STATES = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;

const COUNTRIES = [
  'Australia',
  'New Zealand',
  'United Kingdom',
  'United States',
  'Canada',
  'Singapore',
  'Malaysia',
  'Hong Kong',
  'UAE',
  'South Africa',
  'India',
  'Other',
] as const;
const BANKS = ['NAB', 'CBA', 'ANZ', 'Westpac', 'Bendigo', 'BOQ', 'Macquarie', 'Other'];

const DATE_AU = new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });

export default function AgencyOnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshRoles } = useAuth();

  const [step, setStep] = useState(0);
  const [path, setPath] = useState<OnboardingPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Password step state
  const [needsPassword, setNeedsPassword] = useState<boolean | null>(null);
  const [passwordDone, setPasswordDone] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Detect if user signed up via email (needs password) vs OAuth
  useEffect(() => {
    if (!user) return;
    const provider = user.app_metadata?.provider;
    if (provider === 'google' || provider === 'apple') {
      setNeedsPassword(false);
      setPasswordDone(true);
    } else {
      setNeedsPassword(true);
    }
  }, [user]);

  // Password requirements
  const pwReqs = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'At least one uppercase letter (A–Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'At least one number (0–9)', met: /[0-9]/.test(newPassword) },
    { label: 'At least one special character (!@#$%^&*)', met: /[!@#$%^&*]/.test(newPassword) },
  ];
  const allPwReqsMet = pwReqs.every(r => r.met);

  const handleSetPassword = async () => {
    setPasswordError('');
    const missing = pwReqs.filter(r => !r.met).map(r => r.label);
    if (missing.length > 0) {
      toast.error('Password requirements not met', {
        description: missing.join(' · '),
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordDone(true);
      toast.success('Password set successfully');
    } catch (err: unknown) {
      setPasswordError(getErrorMessage(err) || 'Failed to set password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Step 2 — Agency details
  const [agencyName, setAgencyName] = useState('');
  const [abn, setAbn] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [operatingState, setOperatingState] = useState('');
  const [country, setCountry] = useState('Australia');
  const isAustralia = country === 'Australia';
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

  // Reset guide open state based on step
  useEffect(() => {
    setGuideOpen(false);
  }, [step]);

  // Pre-fill agency details from agents table + auth user metadata
  const [prefillLoaded, setPrefillLoaded] = useState(false);
  useEffect(() => {
    if (!user?.id || prefillLoaded) return;
    (async () => {
      const { data } = await supabase
        .from('agents')
        .select('agency, office_address, email, phone, name, license_number')
        .eq('user_id', user.id)
        .maybeSingle();

      // Pull from agent record
      if (data?.agency) setAgencyName(data.agency);
      if (data?.office_address) setAgencyAddress(data.office_address);
      if (data?.phone) setAgencyPhone(data.phone);
      if (data?.license_number) setLicenceNumber(data.license_number);

      // Principal name: agent.name → user metadata full_name → user email
      const agentName = data?.name;
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
      setPrincipalName(agentName || metaName || '');

      // Email: agent.email → auth user email
      const agentEmail = data?.email;
      setAgencyEmail(agentEmail || user.email || '');

      // Phone fallback from user metadata
      if (!data?.phone) {
        const metaPhone = user.user_metadata?.phone || user.phone;
        if (metaPhone) setAgencyPhone(metaPhone);
      }

      setPrefillLoaded(true);
    })();
  }, [user?.id, prefillLoaded]);

  const totalSteps = path === 'migration' ? 6 : 4;
  const progressPct = ((step + 1) / totalSteps) * 100;

  // Calculate effective step index — skip step 4 for 'fresh' path
  const getEffectiveStep = () => {
    if (path === 'fresh' && step >= 4) return step; // steps 0-3, then 4 maps to step 5 content
    return step;
  };

  const completeOnboarding = async () => {
    if (!user) return;
    const { error } = await supabase.from('agents').update({ onboarding_complete: true } as any).eq('user_id', user.id);
    if (error) throw error;
    await refreshRoles();

    // Best-effort welcome email — non-fatal
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u?.email) {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            type: 'agent',
            user_id: u.id,
            name: principalName || u.email,
            email: u.email,
            agency: agencyName || '',
          },
        });
      }
    } catch { /* non-fatal */ }
  };

  const getAuthToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    let token = sessionData.session?.access_token;
    if (!token) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      token = refreshData.session?.access_token;
    }
    if (!token) throw new Error('No active session. Please sign in again.');
    return token;
  };

  const isValidABN = (value: string): boolean => {
    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    const digits = value.replace(/\s/g, '').split('').map(Number);
    if (digits.length !== 11 || digits.some(d => Number.isNaN(d))) return false;
    digits[0] -= 1;
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
    return sum % 89 === 0;
  };

  const handleStep2Next = async () => {
    if (!user) return;
    if (isAustralia && abn.trim() && !isValidABN(abn)) {
      toast.error('Invalid ABN — please check your number');
      return;
    }
    if (agencyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agencyEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (
      isAustralia &&
      agencyPhone &&
      !/^(\+?61|0)[2-9]\d{8}$/.test(agencyPhone.replace(/[\s\-()]/g, ''))
    ) {
      toast.error('Please enter a valid Australian phone number (e.g. 03 9123 4567)');
      return;
    }
    setLoading(true);
    try {
      const token = await getAuthToken();
      const { data: setupData, error: setupError } = await supabase.functions.invoke('setup-agent', {
        body: {
          userId: user.id,
          email: user.email,
          fullName: principalName,
          phone: agencyPhone,
          mode: 'create-agency',
          agencyName,
          agencyEmail,
          licenseNumber: licenceNumber,
          officeAddress: agencyAddress,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if ((setupData as { success?: boolean; error?: string } | null)?.success === false) {
        throw new Error((setupData as { error?: string }).error || 'Setup failed');
      }
      if (setupError) {
        const detail = (setupError as any)?.context?.json?.error || setupError.message || 'Setup failed';
        throw new Error(detail);
      }

      toast.success('Agency created successfully');
      setStep(2);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || 'Failed to create agency');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Next = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (!agent) throw new Error('Agent not found');

      const cleanBsb = bsb.replace(/-/g, '');
      const { error } = await supabase.from('trust_accounts').insert({
        agent_id: agent.id,
        account_name: trustAccountName || "Trust Account",
        account_type: 'trust',
        bank_name: bankName,
        bsb: cleanBsb || null,
        account_number: accountNumber || null,
        opening_balance: 0,
        current_balance: 0,
      } as any);
      if (error) throw error;

      toast.success('Trust account created');
      setStep(3);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || 'Failed to create trust account');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipTrustAccount = async () => {
    if (!user) return;
    const { error } = await supabase.from('agents').update({ trust_setup_pending: true } as any).eq('user_id', user.id);
    if (error) {
      toast.error(getErrorMessage(error) || 'Failed to skip trust account setup');
      return;
    }

    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: user.email,
          template: 'trust_setup_reminder',
          data: {
            name:
              (user.user_metadata as { display_name?: string } | undefined)?.display_name ||
              user.email?.split('@')[0] ||
              'Agent',
            setup_url: `${window.location.origin}/dashboard/trust-accounting`,
          },
        },
      });
    } catch (emailErr) {
      console.warn('Trust setup reminder email failed to enqueue:', emailErr);
    }

    setStep(3);
  };

  const generateImportChecklist = () => {
    const today = DATE_AU.format(new Date());
    const stateAct: Record<string, string> = {
      VIC: 'Estate Agents Act 1980 (Vic)',
      NSW: 'Property and Stock Agents Act 2002 (NSW)',
      QLD: 'Agents Financial Administration Act 2014 (Qld)',
      SA:  'Land Agents Act 1994 (SA)',
      WA:  'Real Estate and Business Agents Act 1978 (WA)',
      TAS: 'Property Agents and Land Transactions Act 2016 (Tas)',
      ACT: 'Agents Act 2003 (ACT)',
      NT:  'Agents Licensing Act 1979 (NT)',
    };
    const stateAuditDue: Record<string, string> = {
      VIC: '30 September (via myCAV)',
      NSW: "30 September (via Auditor's Report Online)",
      QLD: 'Within 4 months of licence anniversary',
      SA:  'Within 2 months of licence expiry',
      WA:  '31 March (calendar year ending 31 Dec)',
      TAS: '30 September (via Property Agents Board)',
      ACT: '30 September',
      NT:  '30 September',
    };
    const stateBondAuthority: Record<string, string> = {
      VIC: 'RTBA (Residential Tenancies Bond Authority) — within 10 days',
      NSW: 'NSW Fair Trading Rental Bonds Online — within 10 days',
      QLD: 'RTA (Residential Tenancies Authority) — within 10 days',
      SA:  'Consumer and Business Services — within 7 days',
      WA:  'Bond Administrator — within 14 days',
      TAS: 'Director of Consumer Affairs — within 10 days',
      ACT: 'ACT Revenue Office — within 10 days',
      NT:  'Held by landlord/agent in trust — no central authority',
    };
    const legislation = stateAct[operatingState] || 'Applicable state trust accounting legislation';
    const auditDue = stateAuditDue[operatingState] || 'Check with your state regulator';
    const bondAuth = stateBondAuthority[operatingState] || 'State bond authority — check local requirements';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Trust Account Migration Pre-Import Checklist</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.55; }
  .header { border-bottom: 3px solid #1a1a2e; padding-bottom: 14px; margin-bottom: 6px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 13pt; font-weight: 700; color: #1a1a2e; letter-spacing: -0.3px; }
  .brand span { color: #2563eb; }
  .doc-title { font-size: 14pt; font-weight: 700; margin: 8px 0 2px; }
  .doc-meta { font-size: 8.5pt; color: #666; }
  .ref { font-size: 8.5pt; color: #999; text-align: right; }
  .legislation-box { background: #f0f4ff; border: 1px solid #c7d7ff; border-radius: 4px; padding: 8px 12px; margin: 12px 0; font-size: 8.5pt; color: #1e3a8a; }
  .section { margin-top: 14px; }
  .section-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #2563eb; border-bottom: 1.5px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 2px; }
  .item { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f0f0f0; page-break-inside: avoid; }
  .item:last-child { border-bottom: none; }
  .checkbox { width: 18px; height: 18px; border: 2px solid #374151; border-radius: 3px; flex-shrink: 0; margin-top: 1px; }
  .item-content { flex: 1; }
  .item-title { font-size: 10pt; font-weight: 600; color: #111; margin-bottom: 2px; }
  .item-desc { font-size: 8.5pt; color: #555; line-height: 1.45; }
  .write-in { border-bottom: 1px solid #bbb; min-height: 20px; margin-top: 6px; font-size: 8.5pt; color: #999; }
  .write-in-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; }
  .write-in-label { font-size: 7.5pt; color: #888; margin-bottom: 2px; }
  .req-badge { display: inline-block; font-size: 7pt; font-weight: 600; padding: 1px 5px; border-radius: 10px; margin-left: 6px; vertical-align: middle; }
  .req-mandatory { background: #fee2e2; color: #991b1b; }
  .req-state { background: #fef3c7; color: #92400e; }
  .state-note { font-size: 7.5pt; color: #2563eb; font-style: italic; margin-top: 3px; }
  .sig-section { margin-top: 20px; border-top: 2px solid #1a1a2e; padding-top: 14px; page-break-inside: avoid; }
  .sig-title { font-size: 10pt; font-weight: 700; margin-bottom: 6px; }
  .sig-declaration { font-size: 8pt; color: #555; line-height: 1.5; margin-bottom: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 10px; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; }
  .sig-field { border-top: 1px solid #374151; padding-top: 4px; }
  .sig-label { font-size: 8pt; color: #666; }
  .aml-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px; padding: 8px 12px; margin: 12px 0; font-size: 8pt; color: #9a3412; }
  .footer { margin-top: 18px; text-align: center; font-size: 7.5pt; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  .state-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 6px; }
  .state-table th { background: #f3f4f6; padding: 5px 8px; text-align: left; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; }
  .state-table td { padding: 4px 8px; border: 1px solid #e5e7eb; color: #555; }
  .state-table tr:nth-child(even) td { background: #f9fafb; }
  .highlight-row td { background: #eff6ff !important; font-weight: 600; color: #1d4ed8 !important; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>

<div class="header">
  <div class="header-top">
    <div>
      <div class="brand">List<span>HQ</span></div>
      <div class="doc-title">Trust Account Migration Pre-Import Checklist</div>
      <div class="doc-meta">
        Agency: <strong>${agencyName || '________________________'}</strong> &nbsp;|&nbsp;
        State: <strong>${operatingState || '____'}</strong> &nbsp;|&nbsp;
        Cut-over date: <strong>${cutoverDate || '_______________'}</strong>
      </div>
    </div>
    <div class="ref">
      Generated: ${today}<br/>
      Ref: MIG-${Date.now().toString(36).toUpperCase()}
    </div>
  </div>
</div>

<div class="legislation-box">
  📋 <strong>Governing legislation for ${operatingState || 'your state'}:</strong> ${legislation}
  &nbsp;|&nbsp; Annual audit due: <strong>${auditDue}</strong>
</div>

<div class="aml-box">
  ⚠️ <strong>AML/CTF Notice:</strong> From 1 July 2026, real estate agents must comply with AUSTRAC Anti-Money Laundering and Counter-Terrorism Financing requirements. Ensure your agency is enrolled with AUSTRAC before that date.
</div>

<!-- SECTION 1: THREE-WAY RECONCILIATION -->
<div class="section">
  <div class="section-title">Section 1 — Three-Way Reconciliation (Mandatory — All States)</div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Trust cashbook closing balance <span class="req-badge req-mandatory">MANDATORY</span></div>
      <div class="item-desc">Record the closing balance from your trust cashbook (receipts minus payments) as at the cut-over date. This must agree with the bank statement and trust ledger totals.</div>
      <div class="write-in">Cashbook closing balance: $________________________ &nbsp;&nbsp; Date: ________________________</div>
    </div>
  </div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Trust bank statement closing balance <span class="req-badge req-mandatory">MANDATORY</span></div>
      <div class="item-desc">Must match the cashbook balance after adjusting for outstanding deposits and unpresented cheques. Attach the bank statement or note the statement details below.</div>
      <div class="write-in-grid">
        <div><div class="write-in-label">Bank statement balance: $</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Statement date:</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Outstanding deposits: $</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Unpresented cheques: $</div><div class="write-in"></div></div>
      </div>
    </div>
  </div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Trust ledger total (sum of all client ledgers) <span class="req-badge req-mandatory">MANDATORY</span></div>
      <div class="item-desc">The sum of all individual client ledger balances must equal the cashbook and bank statement balance. A trial balance report from your current system satisfies this requirement.</div>
      <div class="write-in-grid">
        <div><div class="write-in-label">Trust ledger total: $</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Number of client ledgers:</div><div class="write-in"></div></div>
      </div>
      <div class="write-in" style="margin-top:6px;">Three-way agreement confirmed: Cashbook = Bank = Ledger &nbsp;☐ YES &nbsp;&nbsp; ☐ NO (explain discrepancy below)</div>
    </div>
  </div>
</div>

<!-- SECTION 2: CLIENT LEDGER RECORDS -->
<div class="section">
  <div class="section-title">Section 2 — Client Ledger Records (Mandatory — All States)</div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Individual client ledger summary <span class="req-badge req-mandatory">MANDATORY</span></div>
      <div class="item-desc">A total balance alone is NOT sufficient. You must have a record of each individual client name and the amount held for them. Auditors in all states require this breakdown. Export this from your current system before migration.</div>
      <div class="write-in">Number of individual client ledgers exported: ________________________</div>
    </div>
  </div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Written client authorities and disbursement directions <span class="req-badge req-mandatory">MANDATORY</span></div>
      <div class="item-desc">For every payment made from trust, you must hold written authority from the client. Confirm you have retained all authorisations, management agreements, and disbursement directions.</div>
      <div class="write-in">Confirmed all written authorities are retained and accessible: &nbsp;☐ YES &nbsp;&nbsp; ☐ NO</div>
    </div>
  </div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Active matters list (clients with funds currently held) <span class="req-badge req-mandatory">MANDATORY</span></div>
      <div class="item-desc">A complete list of all matters where client funds remain in trust as at the cut-over date. Include property address, tenant/owner name, and balance held for each.</div>
      <div class="write-in">Number of active matters: ________________________</div>
    </div>
  </div>
</div>

<!-- SECTION 3: RECEIPTS AND PAYMENTS -->
<div class="section">
  <div class="section-title">Section 3 — Receipt Register and Payment Records (Mandatory — All States)</div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Numbered receipt register — sequence verified <span class="req-badge req-mandatory">MANDATORY</span></div>
      <div class="item-desc">All trust receipts must be numbered sequentially and include: payer name, amount received, date, purpose, and property address. No gaps in the sequence are permitted. Unused receipt books must also be accounted for.</div>
      <div class="write-in-grid">
        <div><div class="write-in-label">First receipt number:</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Last receipt number:</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Total receipts issued:</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Any voided receipts? If yes, retained?</div><div class="write-in"></div></div>
      </div>
    </div>
  </div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">All trust deposits banked next business day <span class="req-badge req-mandatory">MANDATORY</span></div>
      <div class="item-desc">All rent, bond money, and other trust receipts must be banked by the next business day after receipt. Confirm no funds were held beyond this requirement in the period being migrated.</div>
      <div class="write-in">Confirmed same/next business day banking throughout the period: &nbsp;☐ YES &nbsp;&nbsp; ☐ NO (note exceptions)</div>
    </div>
  </div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Payment authorisations — LIC sign-off confirmed <span class="req-badge req-mandatory">MANDATORY</span></div>
      <div class="item-desc">Only the Licensee in Charge (LIC) may authorise disbursements from the trust account. Confirm all payments in the period were properly authorised by the LIC.</div>
      <div class="write-in">LIC name: ________________________ &nbsp;&nbsp; Licence number: ________________________</div>
    </div>
  </div>
</div>

<!-- SECTION 4: RENTAL BONDS -->
<div class="section">
  <div class="section-title">Section 4 — Rental Bonds (State-Specific Requirements)</div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">All bonds lodged with state bond authority <span class="req-badge req-state">STATE-SPECIFIC</span></div>
      <div class="item-desc">Bonds must NOT be held in your general trust account — they must be lodged with the relevant state bond authority within the prescribed timeframe.</div>
      <div class="state-note">${operatingState ? operatingState + ': ' + bondAuth : 'Check your state bond authority requirements'}</div>
      <div class="write-in-grid">
        <div><div class="write-in-label">Number of active bonds:</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Total bond amount: $</div><div class="write-in"></div></div>
        <div><div class="write-in-label">All lodged within required timeframe?</div><div class="write-in">☐ YES &nbsp;&nbsp; ☐ NO</div></div>
        <div><div class="write-in-label">Bond authority reference numbers held?</div><div class="write-in">☐ YES &nbsp;&nbsp; ☐ NO</div></div>
      </div>
    </div>
  </div>
</div>

<!-- SECTION 5: TRUST ACCOUNT INTEREST -->
<div class="section">
  <div class="section-title">Section 5 — Trust Account Interest</div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Interest on trust funds — disbursed correctly <span class="req-badge req-state">STATE-SPECIFIC</span></div>
      <div class="item-desc">Some states require interest earned on trust accounts above certain thresholds to be paid to the state's statutory authority or to the client. Confirm any interest earned has been handled in accordance with ${operatingState || 'your state'} legislation.</div>
      <div class="write-in-grid">
        <div><div class="write-in-label">Interest earned (period): $</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Disbursed to:</div><div class="write-in"></div></div>
      </div>
    </div>
  </div>
</div>

<!-- SECTION 6: AUDITOR CERTIFICATION -->
<div class="section">
  <div class="section-title">Section 6 — Auditor Certification and Compliance History</div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Most recent annual audit report <span class="req-badge req-mandatory">MANDATORY</span></div>
      <div class="item-desc">An independent audit by a Registered Company Auditor (ASIC-registered) or approved accounting body member (CPA Australia, CA ANZ, or IPA) must be conducted annually. Attach or reference the most recent audit report. The auditor must be independent — they cannot be employed by or a partner of your agency.</div>
      <div class="write-in-grid">
        <div><div class="write-in-label">Auditor name:</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Auditor professional body & number:</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Audit period covered:</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Date audit report issued:</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Lodged with regulator? Date:</div><div class="write-in"></div></div>
        <div><div class="write-in-label">Any qualified findings?</div><div class="write-in">☐ YES (attach details) &nbsp;&nbsp; ☐ NO</div></div>
      </div>
    </div>
  </div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Nil audit declaration (if no trust transactions in period)</div>
      <div class="item-desc">If no trust money was received or held during the audit period, most states accept a statutory declaration in lieu of a full audit. This declaration must still be lodged with the regulator within the required timeframe.</div>
      <div class="write-in">Nil declaration lodged: &nbsp;☐ YES &nbsp;&nbsp; ☐ NO &nbsp;&nbsp; ☐ N/A (trust money was held)</div>
    </div>
  </div>
</div>

<!-- SECTION 7: SOURCE SYSTEM CUT-OVER -->
<div class="section">
  <div class="section-title">Section 7 — Source System Cut-Over</div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Current system final export completed</div>
      <div class="item-desc">Confirm you have exported your complete trust ledger from your current system (PropertyMe, Console Cloud, Reapit, or TrustSoft) including all transaction history, client ledgers, receipt register, and outstanding matters.</div>
      <div class="write-in">Source system: ________________________ &nbsp;&nbsp; Export date: ________________________</div>
    </div>
  </div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">No further transactions in source system after cut-over date</div>
      <div class="item-desc">From the cut-over date, all new trust transactions must be recorded in ListHQ only. Processing transactions in both systems simultaneously will cause reconciliation discrepancies that are difficult to unwind.</div>
      <div class="write-in">Confirmed source system access restricted from: ________________________</div>
    </div>
  </div>

  <div class="item">
    <div class="checkbox"></div>
    <div class="item-content">
      <div class="item-title">Record retention confirmed — minimum 7 years</div>
      <div class="item-desc">All trust records must be retained for the period required by your state legislation. To be safe across all jurisdictions, retain all records for a minimum of 7 years from the date of the last entry. Electronic storage is acceptable if records remain accessible and reproducible.</div>
      <div class="write-in">Records archived and accessible: &nbsp;☐ YES &nbsp;&nbsp; Storage method: ________________________</div>
    </div>
  </div>
</div>

<!-- STATE REFERENCE TABLE -->
<div class="section" style="page-break-before: always;">
  <div class="section-title">State-by-State Reference — Annual Audit Requirements</div>
  <table class="state-table">
    <thead>
      <tr>
        <th>State</th>
        <th>Governing Legislation</th>
        <th>Audit Period</th>
        <th>Report Due</th>
        <th>Lodge With</th>
        <th>Records Retention</th>
      </tr>
    </thead>
    <tbody>
      <tr class="${operatingState === 'VIC' ? 'highlight-row' : ''}">
        <td><strong>VIC</strong></td>
        <td>Estate Agents Act 1980</td>
        <td>1 Jul – 30 Jun</td>
        <td>30 September</td>
        <td>Consumer Affairs Victoria (myCAV)</td>
        <td>7 years</td>
      </tr>
      <tr class="${operatingState === 'NSW' ? 'highlight-row' : ''}">
        <td><strong>NSW</strong></td>
        <td>Property &amp; Stock Agents Act 2002</td>
        <td>1 Jul – 30 Jun</td>
        <td>30 September</td>
        <td>NSW Fair Trading (Auditor's Report Online)</td>
        <td>3 years (min)</td>
      </tr>
      <tr class="${operatingState === 'QLD' ? 'highlight-row' : ''}">
        <td><strong>QLD</strong></td>
        <td>Agents Financial Administration Act 2014</td>
        <td>Licence anniversary</td>
        <td>Within 4 months of period end</td>
        <td>Office of Fair Trading (online portal)</td>
        <td>5 years</td>
      </tr>
      <tr class="${operatingState === 'WA' ? 'highlight-row' : ''}">
        <td><strong>WA</strong></td>
        <td>Real Estate &amp; Business Agents Act 1978</td>
        <td>1 Jan – 31 Dec</td>
        <td>31 March</td>
        <td>Commissioner for Consumer Protection</td>
        <td>6 years</td>
      </tr>
      <tr class="${operatingState === 'SA' ? 'highlight-row' : ''}">
        <td><strong>SA</strong></td>
        <td>Land Agents Act 1994</td>
        <td>2 months before licence expiry</td>
        <td>With licence renewal</td>
        <td>Consumer &amp; Business Services</td>
        <td>7 years</td>
      </tr>
      <tr class="${operatingState === 'TAS' ? 'highlight-row' : ''}">
        <td><strong>TAS</strong></td>
        <td>Property Agents &amp; Land Transactions Act 2016</td>
        <td>1 Jul – 30 Jun</td>
        <td>30 September</td>
        <td>Property Agents Board</td>
        <td>7 years</td>
      </tr>
      <tr class="${operatingState === 'ACT' ? 'highlight-row' : ''}">
        <td><strong>ACT</strong></td>
        <td>Agents Act 2003</td>
        <td>1 Jul – 30 Jun</td>
        <td>30 September</td>
        <td>Access Canberra</td>
        <td>7 years</td>
      </tr>
      <tr class="${operatingState === 'NT' ? 'highlight-row' : ''}">
        <td><strong>NT</strong></td>
        <td>Agents Licensing Act 1979</td>
        <td>1 Jul – 30 Jun</td>
        <td>30 September</td>
        <td>NT Consumer Affairs</td>
        <td>7 years</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size:7.5pt;color:#888;margin-top:6px;">★ Your state is highlighted. Always verify current deadlines with your state regulator as requirements may change.</p>
</div>

<!-- SIGNATURE BLOCK -->
<div class="sig-section">
  <div class="sig-title">Agent Acknowledgement and Declaration</div>
  <div class="sig-declaration">
    I, the undersigned, declare that I have reviewed the above checklist and confirm that:
    (1) all trust account records have been reconciled and are accurate as at the cut-over date;
    (2) all client funds held in trust are correctly identified and accounted for;
    (3) all bond lodgements, receipt sequences, and disbursement authorities comply with ${legislation};
    (4) this checklist forms part of the statutory audit trail for trust account migration purposes;
    (5) records will be retained for a minimum of 7 years in accordance with the strictest applicable state requirement;
    and (6) I accept responsibility for the accuracy of all data imported into ListHQ from this date.
  </div>
  <div class="sig-grid">
    <div class="sig-field"><div class="sig-label">Licensee in Charge — Signature</div></div>
    <div class="sig-field"><div class="sig-label">Print Full Name</div></div>
    <div class="sig-field"><div class="sig-label">Real Estate Licence Number</div></div>
    <div class="sig-field"><div class="sig-label">Date Signed</div></div>
  </div>
</div>

<div class="footer">
  ListHQ Trust Account Migration Pre-Import Checklist &nbsp;|&nbsp;
  Generated ${today} &nbsp;|&nbsp;
  Ref: MIG-${Date.now().toString(36).toUpperCase()} &nbsp;|&nbsp;
  Retain for minimum 7 years — do not discard &nbsp;|&nbsp;
  This document forms part of your statutory trust accounting audit trail.
</div>

</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
    toast.success('Compliance checklist generated — print or save as PDF');
  };

  const GuideCard = ({ title, items }: { title: string; items: string[] }) => (
    <div className="mt-6 border-t border-border pt-4">
      <button
        onClick={() => setGuideOpen(o => !o)}
        className="flex items-center justify-between w-full text-left group"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <BookOpen size={13} className="text-primary" />
          {title}
        </div>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${guideOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {guideOpen && (
        <ul className="mt-3 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-primary mt-0.5 shrink-0">·</span>
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item, { ALLOWED_TAGS: ['strong','em','a','br'], ALLOWED_ATTR: ['href','target','rel'], ADD_ATTR: ['target'] }) }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const showPasswordStep = needsPassword && !passwordDone;

  const renderStep = () => {
    // PASSWORD STEP — shown before step 0 for email-signup users
    if (showPasswordStep) {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Lock size={28} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold">Create your password</h2>
            <p className="text-sm text-muted-foreground">Set a password so you can sign in anytime</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password" className="text-xs font-semibold">Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Live requirements checklist */}
              <ul className="space-y-1 mt-2">
                {pwReqs.map((req, i) => (
                  <li key={i} className={`flex items-center gap-1.5 text-xs transition-colors ${req.met ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    <span>{req.met ? '✓' : '✗'}</span>
                    <span>{req.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="scroll-mt-4">
              <Label htmlFor="confirm-password" className="text-xs font-semibold">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>
          <Button
            className="w-full"
            disabled={!allPwReqsMet || !confirmPassword || newPassword !== confirmPassword || passwordLoading}
            onClick={handleSetPassword}
          >
            {passwordLoading && <Loader2 size={14} className="mr-1 animate-spin" />}
            Set password & continue
          </Button>
        </div>
      );
    }

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
          <GuideCard
            title="Before you begin — have these ready"
            items={[
              '<strong>ABN</strong> — your 11-digit Australian Business Number',
              '<strong>Real estate licence number</strong> — from your state regulator, not your CPD number',
              '<strong>Agency name</strong> — your trading name as registered',
              '<strong>Trust account BSB & account number</strong> — only needed if migrating from another system',
              'Choose <strong>Starting fresh</strong> if you have no trust history to import — you can always import data later from Dashboard → Trust Accounting',
              '<a href="https://listhq.com.au/setup-guide" target="_blank" class="text-primary hover:underline">Watch the 3-minute setup walkthrough →</a>',
            ]}
          />
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
          <div className="space-y-4">
            {/* Country selector — first */}
            <div>
              <Label className="text-xs font-semibold text-foreground">
                Country <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Two col grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Agency name */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-foreground">
                  Agency or Trading Name <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="e.g. Smith Property Group" className="mt-1.5" />
                {agencyName && (
                  <p className="text-[11px] text-muted-foreground mt-1">Pre-filled from your registration — edit if needed</p>
                )}
              </div>

              {/* Principal name */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-foreground">
                  Principal's Full Name <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input value={principalName} onChange={e => setPrincipalName(e.target.value)} placeholder="e.g. Sarah Mitchell" className="mt-1.5" />
                {principalName && (
                  <p className="text-[11px] text-muted-foreground mt-1">Pre-filled from your registration — edit if needed</p>
                )}
              </div>

              {/* Business registration — label adapts by country */}
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  {isAustralia ? 'ABN' : 'Business Reg. No.'} <span className="text-destructive ml-0.5">*</span>
                </Label>
                {isAustralia ? (
                  <>
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
                  </>
                ) : (
                  <Input
                    value={abn}
                    onChange={e => setAbn(e.target.value)}
                    placeholder={
                      country === 'Singapore' ? 'e.g. 202012345K'
                      : country === 'New Zealand' ? 'e.g. 12-345-678'
                      : country === 'United Kingdom' ? 'e.g. 12345678'
                      : 'Business registration number'
                    }
                    className="mt-1.5"
                  />
                )}
              </div>

              {/* Licence number */}
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  {isAustralia ? 'Real Estate Licence No.' : 'Licence / Registration No.'} <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input value={licenceNumber} onChange={e => setLicenceNumber(e.target.value)} placeholder="e.g. 074356" className="mt-1.5" />
              </div>

              {/* State of operation — only for Australia */}
              {isAustralia && (
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    State of Operation <span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Select value={operatingState} onValueChange={setOperatingState}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Agency phone */}
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Agency Phone <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input value={agencyPhone} onChange={e => setAgencyPhone(e.target.value)} placeholder={isAustralia ? '(03) 9123 4567' : 'Office phone number'} className="mt-1.5" />
              </div>

              {/* Agency street address */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-foreground">
                  Agency Street Address <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input value={agencyAddress} onChange={e => setAgencyAddress(e.target.value)} placeholder={isAustralia ? '123 High Street, Richmond VIC 3121' : 'Office street address'} className="mt-1.5" />
                {agencyAddress && (
                  <p className="text-[11px] text-muted-foreground mt-1">Pre-filled from your registration — edit if needed</p>
                )}
              </div>

              {/* Agency email */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-foreground">
                  Agency Email <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)} placeholder="office@smithproperty.com.au" className="mt-1.5" />
              </div>
            </div>
          </div>
          <GuideCard
            title="What you need for this step"
            items={[
              '<strong>ABN</strong> \u2014 11 digits, format: XX XXX XXX XXX. Find yours at <a href="https://abr.business.gov.au" target="_blank" class="text-primary hover:underline">abr.business.gov.au</a>',
              '<strong>Licence number</strong> \u2014 issued by your state regulator. Examples: VIC (Consumer Affairs) 6-digit number \u00b7 NSW (Fair Trading) starts with 20XXXXXXXX \u00b7 QLD (OFT) starts with 4XXXXXXX',
              "<strong>Principal's full name</strong> \u2014 the Licensee in Charge (LIC) for your agency",
              '<strong>State of operation</strong> \u2014 select your primary state. You can service other states once set up',
              '<strong>Agency phone & email</strong> \u2014 these appear on your public profile and listing enquiry forms',
              'Enter your licence number exactly as it appears on your licence certificate',
            ]}
          />
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
          <GuideCard
            title="About your trust account"
            items={[
              "Your trust account must be a <strong>dedicated bank account</strong> in your agency's name \u2014 not your personal or operating account",
              'The account name must include the word <strong>"Trust"</strong> \u2014 e.g. "Smith Property Group Trust Account"',
              "<strong>BSB</strong> is 6 digits \u2014 enter with or without the dash (062-000 or 062000)",
              "ListHQ <strong>never processes payments</strong> through your trust account \u2014 used only for reconciliation and audit trail",
              "All major Australian banks supported: NAB, CBA, ANZ, Westpac, Bendigo, BOQ, Macquarie",
              "Don't have a trust account yet? Contact your bank \u2014 most open one within 1\u20132 business days",
            ]}
          />
        </div>
      );
    }

    // STEP 3 — Fresh: "All set" final screen / Migration: cut-over date
    if (step === 3) {
      if (path === 'fresh') {
        return (
          <div className="flex flex-col items-center text-center gap-6 p-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">You're all set!</h2>
              <p className="text-muted-foreground mt-1">Your agency is set up. Here's what to do next.</p>
            </div>
            <ul className="text-left space-y-3 w-full">
              <li className="flex items-start gap-3"><PlusCircle className="mt-0.5 shrink-0 text-primary" size={18} /><span>Create your first listing — go to <strong>Dashboard → New Listing</strong></span></li>
              <li className="flex items-start gap-3"><Globe className="mt-0.5 shrink-0 text-primary" size={18} /><span>Enable multilingual translation — publish any listing and translations generate automatically</span></li>
              <li className="flex items-start gap-3"><Users className="mt-0.5 shrink-0 text-primary" size={18} /><span>Invite your team — go to <strong>Dashboard → Team</strong></span></li>
              <li className="flex items-start gap-3"><HelpCircle className="mt-0.5 shrink-0 text-primary" size={18} /><span>Get help anytime — go to <strong>Dashboard → Help</strong></span></li>
            </ul>
            <Button
              className="w-full py-5 text-base font-bold"
              onClick={async () => {
                await completeOnboarding();
                navigate('/dashboard');
              }}
            >
              Go to Dashboard →
            </Button>
          </div>
        );
      }
      // Migration path: cut-over date
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
          <GuideCard
            title="Choosing your cut-over date"
            items={[
              "The cut-over date is the <strong>last date</strong> you will record trust transactions in your old system",
              "Choose a date when your trust account is <strong>fully reconciled</strong> \u2014 ideally a month-end or quarter-end",
              "You will need: Trust Trial Balance \u00b7 Client Ledger Summary \u00b7 Bank statement \u00b7 Active matters list",
              "<strong>Do not</strong> process transactions in both systems after the cut-over date \u2014 this causes reconciliation errors that are very hard to unwind",
              "Download the Migration Checklist using the button above before proceeding",
            ]}
          />
        </div>
      );
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
            <GuideCard
              title="You're all set — what's next"
              items={[
                "Go to Dashboard \u2192 <strong>New Listing</strong> to create your first property listing",
                "Publish any listing \u2014 <strong>multilingual translations</strong> generate automatically within 1\u20132 minutes",
                "Invite your team from Dashboard \u2192 <strong>Team</strong> using email invite or invite code",
                "Need help? Dashboard \u2192 <strong>Help</strong> is AI-powered and knows the full platform",
              ]}
            />
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
          <GuideCard
            title="About the Trust Import Wizard"
            items={[
              "Have your <strong>Client Ledger Summary</strong> export from your current system ready before starting",
              "The import does <strong>not affect your bank account</strong> \u2014 it only creates matching records in ListHQ",
              "Not ready? Click <strong>Skip for now</strong> \u2014 import later from Dashboard \u2192 Trust Accounting \u2192 Import Existing Account",
              "After import, run a three-way reconciliation check: cashbook balance = bank statement = sum of all client ledgers",
            ]}
          />
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
          <GuideCard
            title="You're all set — what's next"
            items={[
              "Go to Dashboard \u2192 <strong>New Listing</strong> to create your first property listing",
              "Publish any listing \u2014 <strong>multilingual translations</strong> generate automatically within 1\u20132 minutes",
              "Invite your team from Dashboard \u2192 <strong>Team</strong> using email invite or invite code",
              "Need help? Dashboard \u2192 <strong>Help</strong> is AI-powered and knows the full platform",
            ]}
          />
        </div>
      );
    }

    return null;
  };

  const canNext = () => {
    switch (step) {
      case 0: return !!path;
      case 1: return agencyName.trim() && abn.trim() && (isAustralia ? abn.length === 11 : true) && licenceNumber.trim() && principalName.trim() && (isAustralia ? !!operatingState : true) && agencyAddress.trim() && agencyPhone.trim() && agencyEmail.trim();
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

  const showBackButton = step > 0 && !showPasswordStep && (step < 3 || (path === 'migration' && step === 3));
  const showNextButton = !showPasswordStep && (step < 3 || (path === 'migration' && step === 3));

  const stepLabels = path === 'migration'
    ? ['Welcome', 'Agency', 'Trust Account', 'Cut-over', 'Import', 'Complete']
    : ['Welcome', 'Agency', 'Trust Account', 'Ready'];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 pt-4 pb-2 space-y-2 flex-1 flex flex-col min-h-0">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">L</span>
          </div>
          <span className="font-display text-lg font-bold text-foreground">ListHQ</span>
        </div>
        {/* Progress */}
        <div className="space-y-2">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Agency Setup
            </h1>
            <p className="text-xs text-muted-foreground">
              {showPasswordStep ? 'Secure your account' : `Step ${step + 1} of ${totalSteps}`}
            </p>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          <div className="flex justify-between">
            {stepLabels.map((label, i) => (
              <span
                key={i}
                className={`text-[10px] font-medium transition-colors ${i < step ? 'text-primary' : i === step ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
              >
                {i < step ? '✓ ' : ''}{label}
              </span>
            ))}
          </div>
        </div>

        {/* Step content */}
        <Card className="flex-1 min-h-0 overflow-y-auto">
          <CardContent className="p-4 sm:p-6">
            <motion.div
              key={showPasswordStep ? 'password-step' : step}
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
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 pb-2 shrink-0">
            {showBackButton ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} disabled={loading} className="w-full sm:w-auto">
                <ArrowLeft size={14} className="mr-1" /> Back
              </Button>
            ) : <div />}
            {showNextButton && (
              <div className="flex flex-col w-full sm:w-auto gap-1">
                <Button type="button" size="sm" disabled={!canNext() || loading} onClick={handleNext} className="w-full sm:w-auto">
                  {loading && <Loader2 size={14} className="mr-1 animate-spin" />}
                  Next <ArrowRight size={14} className="ml-1" />
                </Button>
                {step === 2 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-1 text-muted-foreground text-xs"
                    onClick={handleSkipTrustAccount}
                    disabled={loading}
                  >
                    Skip for now — I'll add this later
                  </Button>
                )}
              </div>
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
