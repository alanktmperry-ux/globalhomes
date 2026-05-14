import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CAREERS_ROLES, type CareersRole } from '../data/roles';

interface Props {
  selectedRole: CareersRole['id'] | '';
  onRoleChange: (id: CareersRole['id'] | '') => void;
}

const MAX_CV_BYTES = 5 * 1024 * 1024;

export function CareersApplicationForm({ selectedRole, onRoleChange }: Props) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [why, setWhy] = useState('');
  const whyRemaining = 500 - why.length;

  // Scroll to form when role changes externally
  useEffect(() => {
    if (selectedRole && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedRole]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const fd = new FormData(e.currentTarget);
    const cvFile = fd.get('cv') as File | null;
    const payload = {
      full_name: String(fd.get('full_name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      role_applied: String(fd.get('role_applied') || ''),
      linkedin_url: String(fd.get('linkedin_url') || '').trim(),
      portfolio_url: String(fd.get('portfolio_url') || '').trim() || undefined,
      location: String(fd.get('location') || '').trim(),
      why_listhq: String(fd.get('why_listhq') || '').trim(),
      has_work_rights: fd.get('has_work_rights') === 'on',
    };

    if (!payload.has_work_rights) {
      toast({ title: 'Work rights required', description: 'We can only accept applications from candidates with Australian work rights at this stage.', variant: 'destructive' });
      return;
    }
    if (payload.why_listhq.length > 500) {
      toast({ title: 'Too long', description: '"Why ListHQ" must be 500 characters or fewer.', variant: 'destructive' });
      return;
    }
    if (cvFile && cvFile.size > 0) {
      if (cvFile.size > MAX_CV_BYTES) {
        toast({ title: 'CV too large', description: 'CV must be 5MB or smaller.', variant: 'destructive' });
        return;
      }
      if (cvFile.type !== 'application/pdf') {
        toast({ title: 'PDF only', description: 'Please upload your CV as a PDF.', variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-careers-application', { body: payload });
      if (error || !data?.application_id) {
        const msg = (data as { error?: string } | null)?.error || error?.message || 'Submission failed.';
        toast({ title: 'Submission failed', description: msg, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const applicationId = data.application_id as string;

      if (cvFile && cvFile.size > 0) {
        const path = `${applicationId}/cv.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('careers-uploads')
          .upload(path, cvFile, { contentType: 'application/pdf', upsert: true });
        if (uploadError) {
          console.error('[careers] CV upload failed', uploadError);
          toast({ title: 'CV upload failed', description: 'Your application was received, but the CV upload failed. Please email careers@listhq.com.au with your CV.', variant: 'destructive' });
        }
      }

      setSuccess('Thanks — your application is in. We review every application personally and will be in touch within 5 business days.');
      formRef.current?.reset();
      setWhy('');
      onRoleChange('');
    } catch (err) {
      console.error('[careers] submit error', err);
      toast({ title: 'Something went wrong', description: 'Please try again or email careers@listhq.com.au directly.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border bg-card p-8 sm:p-10 text-center">
        <h3 className="text-2xl font-light text-foreground mb-3">Application received</h3>
        <p className="text-muted-foreground font-light max-w-xl mx-auto">{success}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 sm:p-10 space-y-5">
      <div>
        <h3 className="text-2xl font-light text-foreground">Apply now</h3>
        <p className="text-sm text-muted-foreground font-light mt-1">
          We read every application. Expect a reply within 5 business days.
        </p>
      </div>

      <Field label="Full name" name="full_name" required />
      <Field label="Email" name="email" type="email" required />

      <div>
        <label htmlFor="role_applied" className="block text-sm font-medium text-foreground mb-1.5">Role <span className="text-destructive">*</span></label>
        <select
          id="role_applied"
          name="role_applied"
          required
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value as CareersRole['id'] | '')}
          className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>Select a role…</option>
          {CAREERS_ROLES.map((r) => (
            <option key={r.id} value={r.id}>{r.title}</option>
          ))}
        </select>
      </div>

      <Field label="LinkedIn URL" name="linkedin_url" type="url" required placeholder="https://linkedin.com/in/…" />
      <Field label="Portfolio / website (optional)" name="portfolio_url" type="url" placeholder="https://…" />
      <Field label="Location" name="location" required placeholder="Melbourne, Australia" />

      <div>
        <label htmlFor="why_listhq" className="block text-sm font-medium text-foreground mb-1.5">Why ListHQ? <span className="text-destructive">*</span></label>
        <textarea
          id="why_listhq"
          name="why_listhq"
          required
          maxLength={500}
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="In a few sentences — why this team, this mission, this moment?"
        />
        <p className={`mt-1 text-xs ${whyRemaining < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{whyRemaining} characters left</p>
      </div>

      <div>
        <label htmlFor="cv" className="block text-sm font-medium text-foreground mb-1.5">CV (PDF, optional, max 5MB)</label>
        <input
          id="cv"
          name="cv"
          type="file"
          accept="application/pdf"
          className="w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-secondary file:text-secondary-foreground file:text-sm hover:file:bg-secondary/80"
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-foreground">
        <input type="checkbox" name="has_work_rights" required className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-ring" />
        <span>I confirm I have the right to work in Australia. <span className="text-destructive">*</span></span>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Submit application'}
      </button>

      <p className="text-xs text-muted-foreground font-light">
        By applying, you consent to ListHQ storing your application details for recruitment purposes. See our{' '}
        <a href="/privacy" className="underline">privacy policy</a>.
      </p>
    </form>
  );
}

function Field({ label, name, type = 'text', required, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={255}
        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
