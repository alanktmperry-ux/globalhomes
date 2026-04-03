import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Property, InspectionSlot } from '@/shared/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const bookingSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().min(1, 'Phone is required').max(30),
  message: z.string().trim().max(500).optional(),
});

interface InspectionBookingProps {
  property: Property;
  inspectionTimes: InspectionSlot[];
  open: boolean;
  onClose: () => void;
}

export function InspectionBookingModal({ property, inspectionTimes, open, onClose }: InspectionBookingProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const upcomingSlots = inspectionTimes.filter(slot => {
    const slotDate = new Date(`${slot.date}T${slot.start}`);
    return slotDate > new Date();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (selectedSlot === null) {
      toast.error('Please select an inspection time');
      return;
    }

    const result = bookingSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const slot = upcomingSlots[selectedSlot];
    const slotStr = `${new Date(slot.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} ${slot.start}–${slot.end}`;

    try {
      // Create lead with inspection type
      const { error } = await supabase.from('leads').insert({
        property_id: property.id,
        agent_id: property.agent.id,
        user_name: result.data.name,
        user_email: result.data.email,
        user_phone: result.data.phone,
        message: `🏠 Inspection booking: ${slotStr}${result.data.message ? `\n\n${result.data.message}` : ''}`,
        buying_purpose: 'inspection',
        urgency: 'ready_to_inspect',
        status: 'new',
      });

      if (error) throw error;

      // Send confirmation email via existing edge function
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            agent_id: property.agent.id,
            type: 'lead',
            title: `Inspection booked: ${slotStr}`,
            message: `${result.data.name} has booked an inspection for ${property.title}`,
            property_id: property.id,
            lead_name: result.data.name,
            lead_email: result.data.email,
            lead_phone: result.data.phone,
            lead_message: `Inspection: ${slotStr}${result.data.message ? ` — ${result.data.message}` : ''}`,
          },
        });
      } catch {
        // Email is best-effort, don't block booking
      }

      setSuccess(true);
    } catch {
      toast.error('Something went wrong — Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setSelectedSlot(null);
    setForm({ name: '', email: '', phone: '', message: '' });
    setErrors({});
    onClose();
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors';

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">Inspection Booked!</h3>
            <p className="text-sm text-muted-foreground">
              The agent will confirm your booking shortly. You'll receive a confirmation at <strong>{form.email}</strong>.
            </p>
            <button onClick={handleClose} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
              Done
            </button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Book Inspection</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{property.title} — {property.suburb}</p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Time slot selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Select a time *</label>
                <div className="space-y-2">
                  {upcomingSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No upcoming inspection times available.</p>
                  ) : (
                    upcomingSlots.map((slot, i) => {
                      const dateObj = new Date(slot.date);
                      const dayStr = dateObj.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
                      const isSelected = selectedSlot === i;
                      return (
                        <button
                          type="button"
                          key={`${slot.date}-${slot.start}`}
                          onClick={() => setSelectedSlot(i)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border bg-secondary hover:border-primary/40"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                          )}>
                            <Calendar size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{dayStr}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock size={10} /> {slot.start} – {slot.end}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 size={18} className="text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name *</label>
                <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email *</label>
                <input type="email" className={inputClass} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@email.com" />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone *</label>
                <input type="tel" className={inputClass} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+61 400 000 000" />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message (optional)</label>
                <textarea className={`${inputClass} resize-none`} rows={2} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Any questions or special requirements..." />
              </div>

              <button
                type="submit"
                disabled={submitting || upcomingSlots.length === 0}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Booking…' : 'Book Inspection'}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
