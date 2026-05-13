import { supabase } from '@/integrations/supabase/client';

interface IngestArgs {
  propertyId: string;
  name: string;
  email: string;
  phone?: string | null;
  openHomeStartsAt?: string | null;
}

const formatOpenHomeDate = (iso?: string | null) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return null; }
};

/**
 * After an open_home_registrations row exists, ingest the visitor into CRM
 * (find-or-create contact + crm_lead) and send a thank-you email.
 * Non-blocking — all failures are swallowed.
 */
export async function ingestOpenHomeLead({
  propertyId, name, email, phone, openHomeStartsAt,
}: IngestArgs) {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const [first, ...rest] = (name || '').trim().split(/\s+/);
    const firstName = first || normalizedEmail.split('@')[0] || 'Visitor';
    const lastName = rest.join(' ') || null;

    // Resolve listing agent + property address
    const { data: prop } = await supabase
      .from('properties')
      .select('agent_id, address, suburb, agency_id')
      .eq('id', propertyId)
      .maybeSingle();
    const agentId = (prop as any)?.agent_id || null;
    const propertyAddress = [prop?.address, (prop as any)?.suburb].filter(Boolean).join(', ') || 'the property';

    if (agentId) {
      // Find-or-create contact by email
      let contactId: string | null = null;
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();
      contactId = (existing as any)?.id ?? null;

      if (!contactId) {
        const { data: inserted } = await supabase
          .from('contacts')
          .insert({
            first_name: firstName,
            last_name: lastName,
            email: normalizedEmail,
            phone: phone || null,
            contact_type: 'buyer',
            source: 'open_home',
            assigned_agent_id: agentId,
            agency_id: (prop as any)?.agency_id || null,
            buyer_pipeline_stage: 'new',
          } as any)
          .select('id')
          .maybeSingle();
        contactId = (inserted as any)?.id ?? null;
      }

      if (contactId) {
        await supabase.from('crm_leads').insert({
          agent_id: agentId,
          contact_id: contactId,
          source_property_id: propertyId,
          enquiry_source: 'open_home',
          stage: 'new',
          notes: `Open home sign-in: ${new Date().toLocaleDateString('en-AU')}`,
        } as any);
      }
    }

    // Confirmation email to visitor
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'open_home_confirmation',
          recipient_email: normalizedEmail,
          recipient_name: firstName,
          property_address: propertyAddress,
          open_home_date: formatOpenHomeDate(openHomeStartsAt),
        },
      });
    } catch { /* non-blocking */ }
  } catch { /* non-blocking */ }
}
