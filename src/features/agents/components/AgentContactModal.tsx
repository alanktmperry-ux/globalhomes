import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Phone, MessageCircle, CheckCircle2,
  Loader2
} from 'lucide-react';
import { Property } from '@/shared/lib/types';
import type { SearchContext } from '@/features/properties/components/PropertyDrawer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

/* ── Validation ─────────────────────────────────────────────── */

const enquirySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().min(6, 'Phone is required').max(20),
  message: z.string().trim().max(1000).optional(),
});

/* ── Component ──────────────────────────────────────────────── */

interface AgentContactModalProps {
  property: Property;
  open: boolean;
  onClose: () => void;
  searchContext?: SearchContext;
}

export function AgentContactModal({ property, open, onClose, searchContext }: AgentContactModalProps) {
  const { agent } = property;

  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '',
    message: `Hi, I'm interested in ${property.title}`,
  });
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Increment contact_clicks once per modal open ──────────
  const contactTracked = useRef(false);
  useEffect(() => {
    if (!open) {
      contactTracked.current = false;
      return;
    }
    if (contactTracked.current) return;
    contactTracked.current = true;

    supabase.rpc('increment_contact_clicks', { property_id: property.id }).then(({ error }) => {
      if (error) {
        supabase
          .from('properties')
          .update({ contact_clicks: (property.contactClicks || 0) + 1 })
          .eq('id', property.id)
          .then(({ error: updateError }) => {
            if (updateError) console.warn('[AgentContactModal] contact_clicks increment failed:', updateError.message);
          });
      }
    });
  }, [open, property.id, property.contactClicks]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSubmitted(false);
        setErrors({});
        setSubmitting(false);
        setHoneypot('');
      }, 300);
    }
  }, [open]);

  // Update default message when property changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      message: `Hi, I'm interested in ${property.title}`,
    }));
  }, [property.title]);

  /* ── Submit ─────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setErrors({});
    const result = enquirySchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Honeypot check
    if (honeypot) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

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

      // Insert lead directly
      const { data: leadRow, error } = await supabase
        .from('leads')
        .insert({
          property_id: property.id,
          agent_id: agent.id,
          user_name: formData.name,
          user_email: formData.email,
          user_phone: formData.phone,
          message: formData.message || null,
          search_context: contextPayload,
          user_id: user?.id || null,
        })
        .select('id')
        .maybeSingle();

      if (error) throw error;

      // Create conversation so agent & buyer can chat (client-side, needs user auth)
      if (user?.id) {
        const { data: agentRow } = await supabase
          .from('agents')
          .select('user_id')
          .eq('id', agent.id)
          .maybeSingle();

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
            .maybeSingle();

          if (convo) {
            await supabase.from('messages').insert({
              conversation_id: convo.id,
              sender_id: user.id,
              content: formData.message || `Hi, I'm interested in ${property.title}`,
            });
          }
        }
      }

      // Create notification for the agent
      await supabase.functions.invoke('send-notification-email', {
        body: {
          agent_id: agent.id,
          type: 'lead',
          title: `New enquiry from ${formData.name}`,
          message: formData.message || `Interested in ${property.title}`,
          property_id: property.id,
          lead_id: leadRow?.id || null,
        },
      });

      setSubmitted(true);

      // Track buyer enquiry
      try {
        const { capture } = await import('@/shared/lib/posthog');
        capture('buyer_enquiry_sent', { listing_id: property.id, agent_id: agent.id });
      } catch {}

      toast.success('Enquiry sent — the agent will be in touch shortly.');
    } catch (err) {
      console.error('Lead submission error:', err);
      toast.error('Error — Failed to submit. Please try again.');
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

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div
        className="fixed inset-x-0 top-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-50 bg-card rounded-t-3xl shadow-drawer flex flex-col md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-2xl md:max-h-[80vh]"
      >
        {/* Drag indicator (mobile) */}
        <div className="sticky top-0 z-10 flex justify-center pt-3 pb-1 bg-card rounded-t-3xl md:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="p-5 pb-8 md:pb-6 space-y-5 overflow-y-auto overscroll-contain flex-1 min-h-0">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
            <X size={16} />
          </button>

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
          </div>

          {/* Quick contact (always visible) */}
          {agent.isSubscribed && !submitted && (
            <div className="flex gap-2">
              <a href={`tel:${agent.phone}`} onClick={() => trackEvent('call_click')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-foreground text-xs font-medium hover:bg-accent transition-colors">
                <Phone size={14} /> Call
              </a>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('whatsapp_click')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-foreground text-xs font-medium hover:bg-accent transition-colors">
                <MessageCircle size={14} /> WhatsApp
              </a>
            </div>
          )}

          {!submitted ? (
            <div className="space-y-3">
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

              {/* Honeypot — hidden from real users, bots fill it in */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              <textarea placeholder="Message (optional)" value={formData.message}
                onChange={e => setFormData(p => ({ ...p, message: e.target.value }))} rows={3}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none" />

              <button onClick={handleSubmit} disabled={submitting}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Sending…</>
                ) : (
                  'Send Enquiry'
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-center space-y-4">
              <CheckCircle2 size={56} className="text-primary" />
              <div>
                <h4 className="font-display font-bold text-foreground text-lg">Enquiry Sent!</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {agent.name} has been notified and will be in touch shortly.
                </p>
              </div>
              <button onClick={onClose}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
