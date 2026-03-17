import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Phone, Mail, MessageCircle, Calendar, CheckCircle2, BadgeCheck,
  Trophy, Zap, MapPin, Star, Loader2, ArrowRight, ArrowLeft, Shield,
  DollarSign, TrendingUp
} from 'lucide-react';
import { Property } from '@/shared/lib/types';
import type { SearchContext } from '@/features/properties/components/PropertyDrawer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

/* ── Validation ─────────────────────────────────────────────── */

const step1Schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().min(6, 'Phone is required').max(20),
  message: z.string().trim().max(1000).optional(),
  interests: z.array(z.string()),
  timeframe: z.string(),
  budgetRange: z.string().optional(),
  buyingPurpose: z.string(),
  preApproval: z.string(),
});

/* ── Scoring ────────────────────────────────────────────────── */

function calcLeadScore(data: {
  timeframe: string;
  preApproval: string;
  buyingPurpose: string;
  budgetRange: string;
  message: string;
  interests: string[];
}, ctx?: SearchContext): number {
  let score = 30; // base
  // Urgency
  if (data.timeframe === 'This week') score += 25;
  else if (data.timeframe === '1–3 months') score += 15;
  else if (data.timeframe === '3–6 months') score += 8;
  // Pre-approval
  if (data.preApproval === 'approved') score += 20;
  else if (data.preApproval === 'in_progress') score += 10;
  // Purpose
  if (data.buyingPurpose === 'Investment' || data.buyingPurpose === 'Short-term rental') score += 5;
  // Engagement signals from form
  if (data.budgetRange) score += 3;
  if (data.message && data.message.length > 20) score += 3;
  if (data.interests.length >= 2) score += 3;
  // Engagement signals from search context
  if (ctx) {
    // Properties viewed = high intent
    if (ctx.viewedPropertiesCount && ctx.viewedPropertiesCount >= 10) score += 8;
    else if (ctx.viewedPropertiesCount && ctx.viewedPropertiesCount >= 5) score += 5;
    else if (ctx.viewedPropertiesCount && ctx.viewedPropertiesCount >= 2) score += 2;
    // Saved properties = serious buyer
    if (ctx.savedPropertiesCount && ctx.savedPropertiesCount >= 3) score += 6;
    else if (ctx.savedPropertiesCount && ctx.savedPropertiesCount >= 1) score += 3;
    // Saved searches = repeat visitor
    if (ctx.savedSearchesCount && ctx.savedSearchesCount >= 1) score += 4;
    // Time on site
    if (ctx.sessionDurationMinutes && ctx.sessionDurationMinutes >= 10) score += 5;
    else if (ctx.sessionDurationMinutes && ctx.sessionDurationMinutes >= 5) score += 3;
    // Has active filters = knows what they want
    if (ctx.currentFilters?.propertyTypes && ctx.currentFilters.propertyTypes.length > 0) score += 2;
    if (ctx.searchRadius && ctx.searchRadius > 0) score += 2;
  }
  return Math.min(score, 100);
}

/* ── Constants ──────────────────────────────────────────────── */

const TIMEFRAMES = ['This week', '1–3 months', '3–6 months', 'Flexible'];
const PURPOSES = ['Home', 'Investment', 'Short-term rental', 'Other'];
const INTERESTS = ['Viewing', 'More photos', 'Price info', 'Similar properties'];
const PRE_APPROVALS = [
  { value: 'approved', label: 'Pre-approved' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'not_started', label: 'Not started' },
];
const DEPOSIT_AMOUNTS = [1000, 2500, 5000, 10000];

/* ── Component ──────────────────────────────────────────────── */

interface AgentContactModalProps {
  property: Property;
  open: boolean;
  onClose: () => void;
  searchContext?: SearchContext;
}

export function AgentContactModal({ property, open, onClose, searchContext }: AgentContactModalProps) {
  const { agent } = property;
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', message: '',
    interests: [] as string[],
    timeframe: 'Flexible',
    budgetRange: '',
    buyingPurpose: 'Home',
    preApproval: 'not_started',
  });
  const [depositAmount, setDepositAmount] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [leadScore, setLeadScore] = useState(30);

  // Recalculate score on form changes
  useEffect(() => {
    setLeadScore(calcLeadScore(formData, searchContext));
  }, [formData, searchContext]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setDepositAmount(null);
        setErrors({});
        setSubmitting(false);
      }, 300);
    }
  }, [open]);

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  /* ── Step 1 → Step 2 ─────────────────────────────────────── */
  const handleStep1Next = () => {
    setErrors({});
    const result = step1Schema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setStep(2);
  };

  /* ── Step 2 → Step 3 (submit everything) ─────────────────── */
  const handleSubmitAll = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const score = calcLeadScore(formData, searchContext);

      // Build search context payload
      const contextPayload = searchContext ? {
        currentQuery: searchContext.currentQuery,
        filters: searchContext.currentFilters,
        radius: searchContext.searchRadius,
        savedPropertiesCount: searchContext.savedPropertiesCount,
        viewedPropertiesCount: searchContext.viewedPropertiesCount,
        savedSearchesCount: searchContext.savedSearchesCount,
        sessionDurationMinutes: searchContext.sessionDurationMinutes,
        listingMode: searchContext.listingMode,
      } : null;

      // 1. Insert lead
      const { data: leadRow } = await supabase.from('leads').insert({
        agent_id: agent.id,
        property_id: property.id,
        user_name: formData.name,
        user_email: formData.email,
        user_phone: formData.phone,
        message: formData.message || null,
        user_id: user?.id || null,
        timeframe: formData.timeframe,
        budget_range: formData.budgetRange || null,
        buying_purpose: formData.buyingPurpose,
        interests: formData.interests,
        pre_approval_status: formData.preApproval,
        score,
        search_context: contextPayload,
      }).select('id').single();

      // 2. Track event
      await supabase.from('lead_events').insert({
        agent_id: agent.id,
        property_id: property.id,
        event_type: 'qualified_inquiry',
        user_id: user?.id || null,
      });

      // 2b. Create conversation so agent & buyer can chat
      if (user?.id) {
        // Get agent's user_id
        const { data: agentRow } = await supabase
          .from('agents')
          .select('user_id')
          .eq('id', agent.id)
          .single();

        if (agentRow?.user_id) {
          const p1 = user.id < agentRow.user_id ? user.id : agentRow.user_id;
          const p2 = user.id < agentRow.user_id ? agentRow.user_id : user.id;

          const { data: convo } = await supabase
            .from('conversations')
            .upsert({
              participant_1: p1,
              participant_2: p2,
              property_id: property.id,
            }, { onConflict: 'participant_1,participant_2,property_id' })
            .select('id')
            .single();

          if (convo) {
            // Send the enquiry message as the first message
            await supabase.from('messages').insert({
              conversation_id: convo.id,
              sender_id: user.id,
              content: formData.message || `Hi, I'm interested in ${property.title}`,
            });
          }
        }
      }

      // 3. Always create auditable trust record for every qualified lead
      let trustAccountId: string | null = null;
      const { data: existingAccounts } = await supabase
        .from('trust_accounts')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('is_active', true)
        .limit(1);

      if (existingAccounts && existingAccounts.length > 0) {
        trustAccountId = existingAccounts[0].id;
      }

      if (trustAccountId && user) {
        const amount = depositAmount && depositAmount > 0 ? depositAmount : 0;
        const isDeposit = amount > 0;
        await supabase.from('trust_transactions').insert({
          trust_account_id: trustAccountId,
          transaction_type: isDeposit ? 'deposit' : 'journal',
          category: isDeposit ? 'holding_deposit' : 'lead_audit',
          amount,
          gst_amount: isDeposit ? Math.round(amount / 11 * 100) / 100 : 0,
          description: isDeposit
            ? `Holding deposit – ${property.title} – ${formData.name}`
            : `Qualified lead audit – ${property.title} – ${formData.name} (score: ${score})`,
          status: 'pending',
          property_id: property.id,
          payee_name: formData.name,
          reference: leadRow?.id ? `LEAD-${leadRow.id.slice(0, 8).toUpperCase()}` : null,
          created_by: user.id,
        });
      }

      setStep(3);
      toast({
        title: '✅ Qualified Lead Submitted',
        description: depositAmount
          ? `Lead score: ${score}/100. Holding deposit of $${depositAmount.toLocaleString()} recorded.`
          : `Lead score: ${score}/100. ${agent.name} will contact you soon.`,
      });
    } catch (err) {
      console.error('Lead submission error:', err);
      toast({ title: 'Error', description: 'Failed to submit. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const trackEvent = async (eventType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('lead_events').insert({
        agent_id: agent.id,
        property_id: property.id,
        event_type: eventType,
        user_id: user?.id || null,
      });
    } catch { /* silent */ }
  };

  const whatsappMessage = encodeURIComponent(
    `Hi ${agent.name}, I'm interested in the property at ${property.address}, ${property.suburb}. ${property.priceFormatted}. Could you provide more information?`
  );
  const whatsappUrl = `https://wa.me/${agent.phone?.replace(/\D/g, '')}?text=${whatsappMessage}`;

  const scoreColor = leadScore >= 70 ? 'text-emerald-500' : leadScore >= 40 ? 'text-amber-500' : 'text-muted-foreground';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] bg-card rounded-t-3xl shadow-drawer overflow-y-auto md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-2xl md:max-h-[85vh]"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Drag indicator (mobile) */}
            <div className="sticky top-0 z-10 flex justify-center pt-3 pb-1 bg-card rounded-t-3xl md:hidden">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            <div className="p-5 space-y-5">
              <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                <X size={16} />
              </button>

              {/* Step indicator */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`w-full h-1.5 rounded-full transition-colors ${
                      s <= step ? 'bg-primary' : 'bg-border'
                    }`} />
                  </div>
                ))}
              </div>

              {/* Agent header (compact) */}
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-primary">
                  <AvatarImage src={agent.avatarUrl} alt={agent.name} className="object-cover" />
                  <AvatarFallback className="font-bold">{agent.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground text-sm truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{property.title} · {property.priceFormatted}</p>
                </div>
                <div className="flex flex-col items-center">
                  <TrendingUp size={14} className={scoreColor} />
                  <span className={`text-xs font-bold ${scoreColor}`}>{leadScore}</span>
                </div>
              </div>

              {/* Quick contact (always visible) */}
              {agent.isSubscribed && step < 3 && (
                <div className="flex gap-2">
                  <a href={`tel:${agent.phone}`} onClick={() => trackEvent('call_click')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-foreground text-xs font-medium hover:bg-accent transition-colors">
                    <Phone size={14} /> Call
                  </a>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('whatsapp_click')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-foreground text-xs font-medium hover:bg-accent transition-colors">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>
              )}

              {/* ─── STEP 1: Buyer Intent ─────────────────────── */}
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-3">
                    <h4 className="font-display font-semibold text-foreground text-sm">Step 1 · Buyer Intent</h4>

                    <div>
                      <input type="text" placeholder="Your name *" value={formData.name}
                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                      {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input type="email" placeholder="Email *" value={formData.email}
                          onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                      </div>
                      <div>
                        <input type="tel" placeholder="Phone *" value={formData.phone}
                          onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                        {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                      </div>
                    </div>

                    {/* Timeframe */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">When are you looking to buy?</p>
                      <div className="flex flex-wrap gap-1.5">
                        {TIMEFRAMES.map(tf => (
                          <button key={tf} type="button" onClick={() => setFormData(p => ({ ...p, timeframe: tf }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${formData.timeframe === tf ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Purpose */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Buying for</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PURPOSES.map(p => (
                          <button key={p} type="button" onClick={() => setFormData(prev => ({ ...prev, buyingPurpose: p }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${formData.buyingPurpose === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pre-approval */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Mortgage pre-approval</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PRE_APPROVALS.map(pa => (
                          <button key={pa.value} type="button" onClick={() => setFormData(p => ({ ...p, preApproval: pa.value }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${formData.preApproval === pa.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                            {pa.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Budget */}
                    <input type="text" placeholder="Budget range, e.g. $500K – $800K (optional)" value={formData.budgetRange}
                      onChange={e => setFormData(p => ({ ...p, budgetRange: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />

                    {/* Interests */}
                    <div className="flex flex-wrap gap-1.5">
                      {INTERESTS.map(interest => (
                        <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${formData.interests.includes(interest) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                          {interest}
                        </button>
                      ))}
                    </div>

                    <textarea placeholder="Message (optional)" value={formData.message}
                      onChange={e => setFormData(p => ({ ...p, message: e.target.value }))} rows={2}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none" />

                    <button onClick={handleStep1Next}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                      Continue to Deposit <ArrowRight size={16} />
                    </button>
                  </motion.div>
                )}

                {/* ─── STEP 2: Trust Deposit ────────────────────── */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                    <h4 className="font-display font-semibold text-foreground text-sm">Step 2 · Holding Deposit</h4>
                    <p className="text-xs text-muted-foreground">
                      Secure your interest with a holding deposit. This creates a pending trust entry and signals serious intent to the agent.
                    </p>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={16} className="text-primary" />
                        <p className="text-xs font-medium text-primary">Trust Account Protected</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Deposits are held in the agent's regulated trust account and fully refundable until contracts are exchanged.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {DEPOSIT_AMOUNTS.map(amt => (
                        <button key={amt} onClick={() => setDepositAmount(depositAmount === amt ? null : amt)}
                          className={`p-3 rounded-xl border text-center transition-colors ${
                            depositAmount === amt
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-secondary text-foreground hover:border-primary/30'
                          }`}>
                          <DollarSign size={16} className="mx-auto mb-1" />
                          <span className="text-sm font-semibold">${amt.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>

                    {/* Lead score preview */}
                    <div className="p-3 rounded-xl bg-secondary flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Your Lead Score</p>
                        <p className={`text-lg font-bold ${scoreColor}`}>{leadScore}/100</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Priority</p>
                        <p className="text-sm font-semibold text-foreground">
                          {leadScore >= 70 ? '🔥 High' : leadScore >= 40 ? '⚡ Medium' : '📋 Standard'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setStep(1)}
                        className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
                        <ArrowLeft size={16} /> Back
                      </button>
                      <button onClick={handleSubmitAll} disabled={submitting}
                        className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
                        {submitting ? (
                          <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                        ) : depositAmount ? (
                          <>Submit & Deposit</>
                        ) : (
                          <>Submit Without Deposit</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ─── STEP 3: Confirmation ─────────────────────── */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-6 text-center space-y-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10, delay: 0.1 }}>
                      <CheckCircle2 size={56} className="text-primary" />
                    </motion.div>
                    <div>
                      <h4 className="font-display font-bold text-foreground text-lg">Qualified Lead Submitted!</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {agent.name} has been notified and will prioritize your inquiry.
                      </p>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-secondary text-center">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Lead Score</p>
                        <p className={`text-xl font-bold ${scoreColor}`}>{leadScore}/100</p>
                      </div>
                      <div className="p-3 rounded-xl bg-secondary text-center">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Deposit</p>
                        <p className="text-xl font-bold text-foreground">
                          {depositAmount ? `$${depositAmount.toLocaleString()}` : 'None'}
                        </p>
                      </div>
                    </div>

                    {depositAmount && (
                      <div className="w-full p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-xs text-primary font-medium">
                          ✅ Pending trust entry created for ${depositAmount.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          The agent will confirm receipt and process the holding deposit.
                        </p>
                      </div>
                    )}

                    <button onClick={onClose}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                      Done
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
