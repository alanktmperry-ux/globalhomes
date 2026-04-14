import { useState } from 'react';
import { useRentalApplication, type ApplicationFormData } from '../hooks/useRentalApplication';
import type { CoApplicant } from '../types';
import { CheckCircle, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

const INITIAL: ApplicationFormData = {
  full_name: '', email: '', phone: '',
  date_of_birth: '', current_address: '', time_at_address: '1-2 years',
  employment_status: 'full_time', employer_name: '', annual_income: 0,
  previous_landlord_name: '', previous_landlord_contact: '', reason_for_leaving: '',
  move_in_date: '', lease_term_months: 12, occupants: 1,
  has_pets: false, pet_description: '', additional_notes: '',
  co_applicants: [],
  declaration_accepted: false,
};

const STEPS = ['Personal', 'Employment', 'Rental History', 'Preferences'];

interface Props { propertyId: string; rentPw?: number; }

export function RentalApplicationForm({ propertyId, rentPw }: Props) {
  const { loading, error, submitted, submitApplication } = useRentalApplication(propertyId);
  const [form, setForm] = useState<ApplicationFormData>(INITIAL);
  const [step, setStep] = useState(0);

  const set = (key: keyof ApplicationFormData, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const InputField = ({ label, field, type = 'text', required = false, placeholder = '' }: {
    label: string; field: keyof ApplicationFormData;
    type?: string; required?: boolean; placeholder?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}{required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={String(form[field] ?? '')}
        onChange={e => set(field, type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );

  if (submitted) return (
    <div className="text-center py-12 space-y-3">
      <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
      <h3 className="text-xl font-bold text-foreground">Application Submitted!</h3>
      <p className="text-sm text-muted-foreground">
        The property manager will be in touch shortly. You'll receive a confirmation email.
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Privacy & consent notice */}
      <Alert className="border-primary/20 bg-primary/5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
          By submitting this application you consent to ListHQ and the listing agent collecting, storing, and using the personal information you provide for the purpose of assessing your rental application. This may include sharing your details with the property owner. Your information is handled in accordance with the Australian Privacy Act 1988 and our Privacy Policy. The listing agent — not ListHQ — may independently verify your identity and conduct reference checks. ListHQ does not perform credit checks; the agent may use a third-party tenancy database at their discretion.
        </AlertDescription>
      </Alert>
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition
              ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 mx-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{STEPS[step]}</h3>

      {/* Step 0: Personal */}
      {step === 0 && (
        <div className="space-y-3">
          <InputField label="Full Name" field="full_name" required />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Email" field="email" type="email" required />
            <InputField label="Phone" field="phone" type="tel" required />
          </div>
          <InputField label="Date of Birth" field="date_of_birth" type="date" />
          <InputField label="Current Address" field="current_address" required />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Time at current address</label>
            <select value={form.time_at_address}
              onChange={e => set('time_at_address', e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none">
              {['< 1 year', '1-2 years', '3-4 years', '5+ years'].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Co-applicants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Co-applicants</p>
              <button
                onClick={() => set('co_applicants', [...form.co_applicants, { name: '', email: '', income: 0 }])}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {form.co_applicants.map((co, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-end">
                <input placeholder="Name" value={co.name}
                  onChange={e => {
                    const arr = [...form.co_applicants];
                    arr[i] = { ...arr[i], name: e.target.value };
                    set('co_applicants', arr);
                  }}
                  className="border border-border rounded-xl px-3 py-2 text-xs bg-card text-foreground focus:outline-none" />
                <input placeholder="Email" value={co.email}
                  onChange={e => {
                    const arr = [...form.co_applicants];
                    arr[i] = { ...arr[i], email: e.target.value };
                    set('co_applicants', arr);
                  }}
                  className="border border-border rounded-xl px-3 py-2 text-xs bg-card text-foreground focus:outline-none" />
                <div className="flex gap-1">
                  <input placeholder="Income" type="number" value={co.income || ''}
                    onChange={e => {
                      const arr = [...form.co_applicants];
                      arr[i] = { ...arr[i], income: Number(e.target.value) };
                      set('co_applicants', arr);
                    }}
                    className="flex-1 border border-border rounded-xl px-3 py-2 text-xs bg-card text-foreground focus:outline-none" />
                  <button onClick={() => set('co_applicants', form.co_applicants.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Employment */}
      {step === 1 && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Employment Status *</label>
            <select value={form.employment_status}
              onChange={e => set('employment_status', e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none">
              {[
                ['full_time', 'Full-time'], ['part_time', 'Part-time'],
                ['casual', 'Casual'], ['self_employed', 'Self-employed'],
                ['retired', 'Retired'], ['student', 'Student'],
              ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <InputField label="Employer Name" field="employer_name" />
          <InputField label="Annual Income (AUD)" field="annual_income" type="number" required />
          {rentPw && form.annual_income > 0 && (
            <p className={`text-xs p-2.5 rounded-xl ${
              form.annual_income >= rentPw * 52 * 3
                ? 'bg-green-500/10 text-green-700 border border-green-500/20'
                : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
            }`}>
              {form.annual_income >= rentPw * 52 * 3
                ? `✅ Income is ${(form.annual_income / (rentPw * 52) * 100).toFixed(0)}% of annual rent (recommended: 3×)`
                : `⚠️ Lenders recommend income ≥ 3× annual rent ($${(rentPw * 52 * 3).toLocaleString()})`
              }
            </p>
          )}
        </div>
      )}

      {/* Step 2: Rental history */}
      {step === 2 && (
        <div className="space-y-3">
          <InputField label="Previous Landlord / Agent Name" field="previous_landlord_name" />
          <InputField label="Previous Landlord Phone" field="previous_landlord_contact" type="tel" />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reason for leaving</label>
            <textarea value={form.reason_for_leaving}
              onChange={e => set('reason_for_leaving', e.target.value)}
              rows={3} placeholder="e.g. End of lease, relocating for work…"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none resize-none" />
          </div>
        </div>
      )}

      {/* Step 3: Preferences */}
      {step === 3 && (
        <div className="space-y-3">
          <InputField label="Preferred Move-in Date" field="move_in_date" type="date" required />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Preferred Lease Term</label>
            <select value={form.lease_term_months}
              onChange={e => set('lease_term_months', Number(e.target.value))}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none">
              {[[6, '6 months'], [12, '12 months'], [18, '18 months'], [24, '24 months']].map(([v, l]) => (
                <option key={v} value={v}>{l as string}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Number of occupants</label>
            <input type="number" min={1} max={10} value={form.occupants}
              onChange={e => set('occupants', Number(e.target.value))}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="hasPets" checked={form.has_pets}
              onChange={e => set('has_pets', e.target.checked)}
              className="w-4 h-4 accent-primary" />
            <label htmlFor="hasPets" className="text-sm text-foreground">I have pets</label>
          </div>
          {form.has_pets && (
            <InputField label="Pet description (breed, size)" field="pet_description" />
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Additional notes</label>
            <textarea value={form.additional_notes}
              onChange={e => set('additional_notes', e.target.value)}
              rows={3} placeholder="Anything else you'd like the property manager to know…"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground focus:outline-none resize-none" />
          </div>
        </div>
      )}

      {/* Declaration checkbox on final step */}
      {step === 3 && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-secondary/30">
          <Checkbox
            id="declaration"
            checked={form.declaration_accepted}
            onCheckedChange={(checked) => set('declaration_accepted', checked === true)}
            className="mt-0.5"
          />
          <label htmlFor="declaration" className="text-xs text-foreground leading-relaxed cursor-pointer">
            I declare that all information provided in this application is true and correct to the best of my knowledge, and I consent to my personal information being used for tenancy assessment purposes.
          </label>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {/* Navigation */}
      <div className="flex gap-2 mt-6">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:border-foreground/30 transition">
            ← Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition">
            Continue →
          </button>
        ) : (
          <button
            onClick={() => submitApplication(form)}
            disabled={loading || !form.full_name || !form.email || !form.phone || !form.declaration_accepted}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
          >
            {loading ? 'Submitting…' : 'Submit Application →'}
          </button>
        )}
      </div>
    </div>
  );
}
