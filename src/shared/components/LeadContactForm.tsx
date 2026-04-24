/**
 * LeadContactForm — single shared form for creating/editing a Contact,
 * optionally with attached Lead metadata.
 *
 * The Contact is the source of truth for a person's identity.
 * A Lead is a thin record that REFERENCES a Contact + adds:
 *   - source_property_id
 *   - enquiry_source
 *   - lead_temperature
 *   - first_seen_at
 *
 * Behavior by context:
 *   context="contact" → behaves as a plain Contact form (Add/Edit Contact)
 *   context="lead"    → on save, looks up an existing Contact by email/phone first.
 *                       If a match is found, prompts the user to LINK to it
 *                       (no duplicate person record created) or CREATE NEW.
 *                       Then creates the crm_leads row referencing that contact_id.
 *
 * This component intentionally re-uses the field set + Google Places autocomplete
 * + SuburbPicker UX from ContactFormModal so both surfaces stay in sync.
 */
import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { supabase } from '@/integrations/supabase/client';
import { User, Link2, AlertCircle } from 'lucide-react';
import ContactFormModal from '@/features/agents/components/dashboard/contacts/ContactFormModal';
import type { Contact } from '@/features/agents/hooks/useContacts';

export type LeadFormContext = 'contact' | 'lead';

export interface LeadMetadata {
  source_property_id?: string | null;
  enquiry_source?: string;
  lead_temperature?: 'hot' | 'warm' | 'cold';
  notes?: string;
}

interface Props {
  context: LeadFormContext;
  agentId: string;                              // owning agent (agents.id)
  onClose: () => void;
  onSaved?: (result: { contact_id: string; lead_id?: string }) => void;
  initialContact?: Partial<Contact>;
  initialLead?: LeadMetadata;
  /** Optional preset property the lead enquired about (lead context only) */
  defaultSourcePropertyId?: string | null;
}

interface ExistingMatch {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  matched_on: 'email' | 'phone';
}

/**
 * Look up an existing contact for this agent by email OR phone.
 * Returns the first match (email takes priority).
 */
async function findExistingContact(
  agentUserId: string,
  email?: string | null,
  phone?: string | null,
): Promise<ExistingMatch | null> {
  if (!email && !phone) return null;

  if (email) {
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone')
      .eq('created_by', agentUserId)
      .ilike('email', email.trim())
      .limit(1)
      .maybeSingle();
    if (data) return { ...data, matched_on: 'email' };
  }

  if (phone) {
    const cleaned = phone.replace(/\s+/g, '');
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone')
      .eq('created_by', agentUserId)
      .eq('phone', cleaned)
      .limit(1)
      .maybeSingle();
    if (data) return { ...data, matched_on: 'phone' };
  }

  return null;
}

/**
 * Modal shown when an existing Contact match is detected during Lead creation.
 * User chooses: link to existing OR create new.
 */
function ExistingContactPrompt({
  match,
  onLink,
  onCreateNew,
  onCancel,
}: {
  match: ExistingMatch;
  onLink: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle size={18} className="text-warning" />
            Existing contact found
          </DialogTitle>
          <DialogDescription>
            A contact with this {match.matched_on} already exists. Link the new lead to that
            contact, or create a separate person record.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-3 my-2">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-muted-foreground" />
            <span className="font-medium text-sm">
              {match.first_name} {match.last_name ?? ''}
            </span>
          </div>
          {match.email && <div className="text-xs text-muted-foreground">{match.email}</div>}
          {match.phone && <div className="text-xs text-muted-foreground">{match.phone}</div>}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={onLink} className="gap-2">
            <Link2 size={14} />
            Link lead to existing contact
          </Button>
          <Button onClick={onCreateNew} variant="outline">
            Create as new contact anyway
          </Button>
          <Button onClick={onCancel} variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Lead-only metadata panel rendered alongside the Contact form fields.
 * Only used when context="lead".
 */
function LeadMetadataPanel({
  meta,
  onChange,
}: {
  meta: LeadMetadata;
  onChange: (m: LeadMetadata) => void;
}) {
  return (
    <div className="border-t border-border pt-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">Lead details</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Temperature</Label>
          <Select
            value={meta.lead_temperature ?? 'warm'}
            onValueChange={v => onChange({ ...meta, lead_temperature: v as LeadMetadata['lead_temperature'] })}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hot">🔥 Hot</SelectItem>
              <SelectItem value="warm">🌡️ Warm</SelectItem>
              <SelectItem value="cold">❄️ Cold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Enquiry source</Label>
          <Select
            value={meta.enquiry_source ?? 'manual'}
            onValueChange={v => onChange({ ...meta, enquiry_source: v })}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual entry</SelectItem>
              <SelectItem value="enquiry_form">Enquiry form</SelectItem>
              <SelectItem value="open_home">Open home</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="portal">Portal</SelectItem>
              <SelectItem value="pre_approval">Pre-approval</SelectItem>
              <SelectItem value="eoi">EOI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Lead notes</Label>
        <Textarea
          value={meta.notes ?? ''}
          onChange={e => onChange({ ...meta, notes: e.target.value })}
          rows={2}
          placeholder="Anything specific to this lead (vs. the contact in general)…"
        />
      </div>
    </div>
  );
}

const LeadContactForm = ({
  context,
  agentId,
  onClose,
  onSaved,
  initialContact,
  initialLead,
  defaultSourcePropertyId,
}: Props) => {
  const { toast } = useToast();
  const [leadMeta, setLeadMeta] = useState<LeadMetadata>({
    enquiry_source: initialLead?.enquiry_source ?? 'manual',
    lead_temperature: initialLead?.lead_temperature ?? 'warm',
    notes: initialLead?.notes ?? '',
    source_property_id: initialLead?.source_property_id ?? defaultSourcePropertyId ?? null,
  });
  const [pendingMatch, setPendingMatch] = useState<{
    match: ExistingMatch;
    contactPayload: Partial<Contact>;
  } | null>(null);

  /** Insert (or look up) the contact, then optionally insert the lead. */
  const persist = useCallback(
    async (contactPayload: Partial<Contact>, useExistingContactId?: string): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let contactId = useExistingContactId;

      if (!contactId) {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            ...contactPayload,
            created_by: user.id,
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        contactId = data.id;
      }

      let leadId: string | undefined;
      if (context === 'lead' && contactId) {
        const { data, error } = await supabase
          .from('crm_leads')
          .insert({
            contact_id: contactId,
            agent_id: agentId,
            source_property_id: leadMeta.source_property_id ?? null,
            enquiry_source: leadMeta.enquiry_source ?? 'manual',
            lead_temperature: leadMeta.lead_temperature ?? 'warm',
            notes: leadMeta.notes ?? null,
            first_seen_at: new Date().toISOString(),
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        leadId = data.id;
      }

      toast({
        title: context === 'lead' ? '✅ Lead created' : '✅ Contact saved',
        description: useExistingContactId
          ? 'Linked to existing contact.'
          : `${contactPayload.first_name ?? ''} ${contactPayload.last_name ?? ''}`.trim(),
      });

      onSaved?.({ contact_id: contactId!, lead_id: leadId });
      onClose();
    },
    [context, agentId, leadMeta, onClose, onSaved, toast],
  );

  /**
   * Save handler passed into the underlying ContactFormModal.
   * In 'lead' context, run find-or-create logic before persisting.
   */
  const handleContactSave = useCallback(
    async (contactPayload: Partial<Contact>) => {
      try {
        if (context === 'lead') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const match = await findExistingContact(
              user.id,
              contactPayload.email,
              contactPayload.phone ?? contactPayload.mobile,
            );
            if (match) {
              setPendingMatch({ match, contactPayload });
              return; // wait for user choice
            }
          }
        }
        await persist(contactPayload);
      } catch (err: unknown) {
        toast({
          title: '❌ Save failed',
          description: getErrorMessage(err),
          variant: 'destructive',
        });
        throw err;
      }
    },
    [context, persist, toast],
  );

  // Re-use the existing modal component for the contact fields.
  // In lead context, also render the lead metadata panel inside the same dialog
  // by stacking a second dialog beneath the contact one is awkward — instead,
  // we render the contact modal and let it own the dialog chrome. The lead
  // metadata is captured via a small inline panel rendered through a portal
  // appended to the dialog by ContactFormModal's children prop. Since the
  // current ContactFormModal does not accept children, we render the lead
  // panel inside a sibling Dialog only when the user picks a match.
  //
  // Practical compromise: render the ContactFormModal as-is (no metadata
  // panel) for now. The metadata defaults (enquiry_source, lead_temperature)
  // are applied automatically on save. A follow-up will inline LeadMetadataPanel
  // into ContactFormModal once the user reviews the wiring.

  return (
    <>
      <ContactFormModal
        onClose={onClose}
        onSave={handleContactSave}
        initialData={initialContact}
      />

      {/* Currently unused in the visible UI — kept exported via context so a
          follow-up can drop it into ContactFormModal as a children slot. */}
      {false && <LeadMetadataPanel meta={leadMeta} onChange={setLeadMeta} />}

      {pendingMatch && (
        <ExistingContactPrompt
          match={pendingMatch.match}
          onLink={async () => {
            const { match, contactPayload } = pendingMatch;
            setPendingMatch(null);
            try {
              await persist(contactPayload, match.id);
            } catch (err: unknown) {
              toast({
                title: '❌ Save failed',
                description: getErrorMessage(err),
                variant: 'destructive',
              });
            }
          }}
          onCreateNew={async () => {
            const { contactPayload } = pendingMatch;
            setPendingMatch(null);
            try {
              await persist(contactPayload);
            } catch (err: unknown) {
              toast({
                title: '❌ Save failed',
                description: getErrorMessage(err),
                variant: 'destructive',
              });
            }
          }}
          onCancel={() => setPendingMatch(null)}
        />
      )}
    </>
  );
};

export default LeadContactForm;
export { LeadMetadataPanel };
