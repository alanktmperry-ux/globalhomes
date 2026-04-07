import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, User, Briefcase, Home, Shield, MessageCircle, CheckCircle, Upload, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Property } from '@/shared/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errorUtils';

/* ── Validation schemas per step ── */
const step1Schema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(100),
  dob: z.string().min(1, 'Date of birth is required'),
  email: z.string().trim().email('Valid email required').max(255),
  phone: z.string().trim().min(6, 'Phone number is required').max(30),
  currentAddress: z.string().trim().min(5, 'Current address is required').max(300),
});

const step2Schema = z.object({
  employmentStatus: z.string().min(1, 'Select employment status'),
  employerName: z.string().max(100).optional(),
  annualIncome: z.string().optional(),
  employmentLength: z.string().max(50).optional(),
});

const step3Schema = z.object({
  previousAddress: z.string().max(300).optional(),
  previousLandlordName: z.string().max(100).optional(),
  previousLandlordContact: z.string().max(100).optional(),
  reasonForLeaving: z.string().max(500).optional(),
});

const step5Schema = z.object({
  message: z.string().max(2000).optional(),
});

type FormData = z.infer<typeof step1Schema> & z.infer<typeof step2Schema> & z.infer<typeof step3Schema> & z.infer<typeof step5Schema> & {
  identityFile: File | null;
  identityDocType: string;
};

const STEPS = [
  { icon: User, label: 'Personal' },
  { icon: Briefcase, label: 'Employment' },
  { icon: Home, label: 'History' },
  { icon: Shield, label: 'Identity' },
  { icon: MessageCircle, label: 'Submit' },
];

const EMPLOYMENT_OPTIONS = ['Full-time', 'Part-time', 'Casual', 'Self-employed', 'Student', 'Retired', 'Unemployed'];

interface Props {
  property: Property;
  open: boolean;
  onClose: () => void;
}

export function RentalApplicationModal({ property, open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    fullName: '', dob: '', email: '', phone: '', currentAddress: '',
    employmentStatus: '', employerName: '', annualIncome: '', employmentLength: '',
    previousAddress: '', previousLandlordName: '', previousLandlordContact: '', reasonForLeaving: '',
    identityFile: null, identityDocType: 'drivers_licence',
    message: '',
  });

  const set = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateStep = (): boolean => {
    try {
      if (step === 0) step1Schema.parse(form);
      if (step === 1) step2Schema.parse(form);
      if (step === 2) step3Schema.parse(form);
      if (step === 4) step5Schema.parse(form);
      setErrors({});
      return true;
    } catch (e: unknown) {
      if (e instanceof z.ZodError) {
        const errs: Record<string, string> = {};
        e.errors.forEach(err => { if (err.path[0]) errs[err.path[0] as string] = getErrorMessage(err); });
        setErrors(errs);
      }
      return false;
    }
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, 4)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      // Upload identity document if provided
      let identityUrl: string | null = null;
      if (form.identityFile) {
        const ext = form.identityFile.name.split('.').pop() || 'jpg';
        const path = `${property.id}/${userId || 'anon'}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('rental-applications')
          .upload(path, form.identityFile, { cacheControl: '3600', upsert: false });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('rental-applications').getPublicUrl(path);
        identityUrl = urlData.publicUrl;
      }

      // Generate reference number
      const ref = `RA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { error } = await supabase.from('rental_applications' as any).insert({
        property_id: property.id,
        agent_id: property.agent.id || null,
        user_id: userId,
        reference_number: ref,
        full_name: form.fullName,
        date_of_birth: form.dob,
        email: form.email,
        phone: form.phone,
        current_address: form.currentAddress,
        employment_status: form.employmentStatus,
        employer_name: form.employerName || null,
        annual_income: form.annualIncome ? Number(form.annualIncome) : null,
        employment_length: form.employmentLength || null,
        previous_address: form.previousAddress || null,
        previous_landlord_name: form.previousLandlordName || null,
        previous_landlord_contact: form.previousLandlordContact || null,
        reason_for_leaving: form.reasonForLeaving || null,
        identity_document_url: identityUrl,
        identity_document_type: form.identityDocType,
        message_to_landlord: form.message || null,
        status: 'pending',
      } as any);

      if (error) throw error;

      setRefNumber(ref);
      setSubmitted(true);

      // Notify agent
      if (property.agent.id) {
        supabase.functions.invoke('send-notification-email', {
          body: {
            agent_id: property.agent.id,
            type: 'lead',
            title: `New rental application from ${form.fullName}`,
            message: `${form.fullName} submitted a rental application for ${property.title}`,
            property_id: property.id,
            lead_name: form.fullName,
            lead_email: form.email,
            lead_phone: form.phone,
            lead_message: form.message || 'Rental application submitted',
          },
        }).catch(() => {});
      }
    } catch (err: unknown) {
      toast.error(`Application failed — ${(getErrorMessage(err) || 'Please try again')}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setStep(0);
      setSubmitted(false);
      setRefNumber('');
      setErrors({});
      setForm({
        fullName: '', dob: '', email: '', phone: '', currentAddress: '',
        employmentStatus: '', employerName: '', annualIncome: '', employmentLength: '',
        previousAddress: '', previousLandlordName: '', previousLandlordContact: '', reasonForLeaving: '',
        identityFile: null, identityDocType: 'drivers_licence', message: '',
      });
    }, 300);
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors';
  const labelCls = 'block text-sm font-medium text-foreground mb-1.5';
  const errCls = 'text-xs text-destructive mt-1';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} />
          <motion.div
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] z-50 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-card rounded-2xl shadow-drawer flex flex-col overflow-hidden"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="font-display text-lg font-bold text-foreground">Rental Application</h2>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Step indicator */}
            {!submitted && (
              <div className="px-5 py-3 border-b border-border shrink-0">
                <div className="flex items-center justify-between">
                  {STEPS.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        i < step ? 'bg-primary text-primary-foreground' :
                        i === step ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {i < step ? <CheckCircle size={14} /> : <s.icon size={14} />}
                      </div>
                      <span className={`text-[9px] font-medium ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {submitted ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle size={32} className="text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground">Application Submitted!</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Your rental application for <span className="font-semibold text-foreground">{property.title}</span> has been submitted successfully.
                  </p>
                  <div className="p-4 rounded-xl bg-secondary w-full max-w-xs">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Reference Number</p>
                    <p className="text-lg font-mono font-bold text-primary mt-1">{refNumber}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The agent will review your application and get back to you via email.
                  </p>
                  <button onClick={handleClose} className="mt-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
                    Done
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    {/* Step 0: Personal */}
                    {step === 0 && (
                      <>
                        <p className="text-sm text-muted-foreground mb-2">Tell us about yourself</p>
                        <div>
                          <label className={labelCls}>Full Name *</label>
                          <input className={inputCls} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Jane Smith" />
                          {errors.fullName && <p className={errCls}>{errors.fullName}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Date of Birth *</label>
                          <input type="date" className={inputCls} value={form.dob} onChange={e => set('dob', e.target.value)} />
                          {errors.dob && <p className={errCls}>{errors.dob}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Email *</label>
                          <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
                          {errors.email && <p className={errCls}>{errors.email}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Phone *</label>
                          <input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+61 400 000 000" />
                          {errors.phone && <p className={errCls}>{errors.phone}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Current Address *</label>
                          <input className={inputCls} value={form.currentAddress} onChange={e => set('currentAddress', e.target.value)} placeholder="123 Main St, Sydney NSW 2000" />
                          {errors.currentAddress && <p className={errCls}>{errors.currentAddress}</p>}
                        </div>
                      </>
                    )}

                    {/* Step 1: Employment */}
                    {step === 1 && (
                      <>
                        <p className="text-sm text-muted-foreground mb-2">Your employment details</p>
                        <div>
                          <label className={labelCls}>Employment Status *</label>
                          <select className={inputCls} value={form.employmentStatus} onChange={e => set('employmentStatus', e.target.value)}>
                            <option value="">Select…</option>
                            {EMPLOYMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          {errors.employmentStatus && <p className={errCls}>{errors.employmentStatus}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Employer Name</label>
                          <input className={inputCls} value={form.employerName} onChange={e => set('employerName', e.target.value)} placeholder="Company Pty Ltd" />
                        </div>
                        <div>
                          <label className={labelCls}>Annual Income (AUD)</label>
                          <input type="number" className={inputCls} value={form.annualIncome} onChange={e => set('annualIncome', e.target.value)} placeholder="85000" />
                        </div>
                        <div>
                          <label className={labelCls}>Employment Length</label>
                          <input className={inputCls} value={form.employmentLength} onChange={e => set('employmentLength', e.target.value)} placeholder="e.g. 3 years" />
                        </div>
                      </>
                    )}

                    {/* Step 2: Rental History */}
                    {step === 2 && (
                      <>
                        <p className="text-sm text-muted-foreground mb-2">Your rental history</p>
                        <div>
                          <label className={labelCls}>Previous Address</label>
                          <input className={inputCls} value={form.previousAddress} onChange={e => set('previousAddress', e.target.value)} placeholder="Previous rental address" />
                        </div>
                        <div>
                          <label className={labelCls}>Previous Landlord / Agent Name</label>
                          <input className={inputCls} value={form.previousLandlordName} onChange={e => set('previousLandlordName', e.target.value)} placeholder="John Doe" />
                        </div>
                        <div>
                          <label className={labelCls}>Landlord Contact (phone or email)</label>
                          <input className={inputCls} value={form.previousLandlordContact} onChange={e => set('previousLandlordContact', e.target.value)} placeholder="john@agency.com" />
                        </div>
                        <div>
                          <label className={labelCls}>Reason for Leaving</label>
                          <textarea className={`${inputCls} resize-none`} rows={3} value={form.reasonForLeaving} onChange={e => set('reasonForLeaving', e.target.value)} placeholder="e.g. Lease ended, relocating for work" />
                        </div>
                      </>
                    )}

                    {/* Step 3: Identity */}
                    {step === 3 && (
                      <>
                        <p className="text-sm text-muted-foreground mb-2">Upload identification for verification</p>
                        <div>
                          <label className={labelCls}>Document Type</label>
                          <select className={inputCls} value={form.identityDocType} onChange={e => set('identityDocType', e.target.value)}>
                            <option value="drivers_licence">Driver's Licence</option>
                            <option value="passport">Passport</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Upload Document</label>
                          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => set('identityFile', e.target.files?.[0] || null)} />
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className={`${inputCls} flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors`}
                          >
                            <Upload size={18} className="text-primary shrink-0" />
                            <span className="truncate">{form.identityFile ? form.identityFile.name : 'Choose file…'}</span>
                          </button>
                          <p className="text-[10px] text-muted-foreground mt-1">Accepted: JPG, PNG, PDF · Max 10 MB</p>
                        </div>
                        {form.identityFile && (
                          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                            <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                              <CheckCircle size={12} />
                              {form.identityFile.name} ({(form.identityFile.size / 1024 / 1024).toFixed(1)} MB)
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Step 4: Message + Submit */}
                    {step === 4 && (
                      <>
                        <p className="text-sm text-muted-foreground mb-2">Any message for the landlord/agent?</p>
                        <div>
                          <label className={labelCls}>Message (optional)</label>
                          <textarea className={`${inputCls} resize-none`} rows={5} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell the agent why you'd be a great tenant…" />
                        </div>
                        <div className="p-4 rounded-xl bg-secondary space-y-2">
                          <p className="text-xs font-medium text-foreground">Application Summary</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Name:</span><span className="text-foreground font-medium">{form.fullName}</span>
                            <span>Email:</span><span className="text-foreground font-medium">{form.email}</span>
                            <span>Employment:</span><span className="text-foreground font-medium">{form.employmentStatus || '—'}</span>
                            <span>Income:</span><span className="text-foreground font-medium">{form.annualIncome ? `$${Number(form.annualIncome).toLocaleString()}` : '—'}</span>
                            <span>ID uploaded:</span><span className="text-foreground font-medium">{form.identityFile ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Footer nav */}
            {!submitted && (
              <div className="px-5 py-4 border-t border-border flex items-center gap-3 shrink-0">
                {step > 0 && (
                  <button onClick={prev} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-secondary text-foreground text-sm font-medium hover:bg-accent transition-colors">
                    <ChevronLeft size={14} /> Back
                  </button>
                )}
                <div className="flex-1" />
                {step < 4 ? (
                  <button onClick={next} className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Next <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    {submitting ? 'Submitting…' : 'Submit Application'}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
