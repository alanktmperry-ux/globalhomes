import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Phone, Mail, MessageCircle, Calendar, CheckCircle2, BadgeCheck,
  Trophy, Zap, MapPin, Star, Loader2
} from 'lucide-react';
import { Property } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().min(6, 'Phone is required').max(20),
  message: z.string().trim().max(1000).optional(),
  interests: z.array(z.string()),
});

interface AgentContactModalProps {
  property: Property;
  open: boolean;
  onClose: () => void;
}

export function AgentContactModal({ property, open, onClose }: AgentContactModalProps) {
  const { agent } = property;
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', message: '',
    interests: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const whatsappMessage = encodeURIComponent(
    `Hi ${agent.name}, I'm interested in the property at ${property.address}, ${property.suburb}. ${property.priceFormatted}. Could you provide more information?`
  );
  const whatsappUrl = `https://wa.me/${agent.phone?.replace(/\D/g, '')}?text=${whatsappMessage}`;
  const emailSubject = encodeURIComponent(`Inquiry: ${property.title} - ${property.priceFormatted}`);
  const emailBody = encodeURIComponent(
    `Hi ${agent.name},\n\nI'm interested in the property at ${property.address}, ${property.suburb} (${property.priceFormatted}).\n\nCould you please provide more information?\n\nThank you.`
  );

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('lead_events').insert({
        agent_id: agent.id,
        property_id: property.id,
        event_type: 'inquiry',
        user_id: user?.id || null,
      });

      setSubmitted(true);
      toast({ title: '✅ Inquiry Sent', description: `${agent.name} will contact you within 2 hours.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to send inquiry. Please try again.', variant: 'destructive' });
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

  const INTERESTS = ['Viewing', 'More photos', 'Price info', 'Similar properties'];

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
              {/* Close button */}
              <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                <X size={16} />
              </button>

              {/* Agent header */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-2 border-primary">
                    <AvatarImage src={agent.avatarUrl} alt={agent.name} className="object-cover" />
                    <AvatarFallback className="text-lg font-bold">{agent.name[0]}</AvatarFallback>
                  </Avatar>
                  {agent.isSubscribed && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <BadgeCheck size={14} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-foreground text-lg">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">{agent.agency}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium text-foreground">4.8</span>
                    <span className="text-xs text-muted-foreground">(24 reviews)</span>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {agent.isSubscribed && (
                  <>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      <BadgeCheck size={12} /> Verified Agent
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-xs font-medium">
                      <Trophy size={12} /> Top Performer
                    </span>
                  </>
                )}
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                  <Zap size={12} /> Responds &lt; 1 hour
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-medium">
                  <MapPin size={12} /> Local Expert
                </span>
              </div>

              {/* Property reference */}
              <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground">Regarding</p>
                <p className="text-sm font-medium text-foreground truncate">{property.title}</p>
                <p className="text-xs text-muted-foreground">{property.address}, {property.suburb} · {property.priceFormatted}</p>
              </div>

              {/* Contact methods */}
              {agent.isSubscribed ? (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${agent.phone}`}
                    onClick={() => trackEvent('call_click')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Phone size={20} />
                    <span className="text-sm font-medium">Call</span>
                  </a>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('whatsapp_click')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-600 text-primary-foreground hover:bg-emerald-700 transition-colors"
                  >
                    <MessageCircle size={20} />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </a>
                  <a
                    href={`mailto:${agent.email}?subject=${emailSubject}&body=${emailBody}`}
                    onClick={() => trackEvent('email_click')}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary text-foreground hover:bg-accent transition-colors"
                  >
                    <Mail size={20} />
                    <span className="text-sm font-medium">Email</span>
                  </a>
                  <button
                    onClick={() => {
                      trackEvent('booking_click');
                      toast({ title: '📅 Coming Soon', description: 'Inspection booking will be available soon.' });
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary text-foreground hover:bg-accent transition-colors"
                  >
                    <Calendar size={20} />
                    <span className="text-sm font-medium">Book Inspection</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted text-center">
                  <p className="text-sm text-muted-foreground mb-2">Agent contact details are available for Pro Agents</p>
                </div>
              )}

              {/* Lead capture form */}
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <h4 className="font-display font-semibold text-foreground text-sm">Get more information</h4>

                  <div>
                    <input
                      type="text"
                      placeholder="Your name *"
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <input
                      type="email"
                      placeholder="Email address *"
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <input
                      type="tel"
                      placeholder="Phone number *"
                      value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                  </div>

                  {/* Interest checkboxes */}
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(interest => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          formData.interests.includes(interest)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>

                  <textarea
                    placeholder="Message (optional)"
                    value={formData.message}
                    onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <><Loader2 size={16} className="animate-spin" /> Sending…</>
                    ) : (
                      'Send to Agent'
                    )}
                  </button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10, delay: 0.1 }}
                  >
                    <CheckCircle2 size={48} className="text-success mb-3" />
                  </motion.div>
                  <h4 className="font-display font-bold text-foreground text-lg">Inquiry Sent!</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {agent.name} will contact you within 2 hours
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
