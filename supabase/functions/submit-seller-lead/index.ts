// Submit a seller appraisal lead from the valuation tool.
// Inserts into seller_leads, finds matching agents (suburb + language), and
// dispatches in-app/email notifications to up to 3 of them.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SubmitBody {
  address: string;
  suburb: string;
  state: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  property_type: string;
  beds?: number | null;
  baths?: number | null;
  cars?: number | null;
  land_size_sqm?: number | null;
  renovations?: string | null;
  estimated_value_min?: number | null;
  estimated_value_max?: number | null;
  estimate_method?: string | null;
  user_name: string;
  user_email: string;
  user_phone?: string | null;
  preferred_contact?: string;
  preferred_language?: string;
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SubmitBody;

    // Required fields
    if (!body.address || !body.suburb || !body.state || !body.property_type ||
        !body.user_name || !body.user_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!isEmail(body.user_email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Length caps
    if (body.user_name.length > 120 || body.address.length > 300) {
      return new Response(JSON.stringify({ error: "Field too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Find matched agents in the suburb who speak the language (top 3)
    const lang = (body.preferred_language || 'en').toLowerCase();
    const suburbLower = body.suburb.toLowerCase();
    const stateUpper = body.state.toUpperCase();

    let matchedAgentIds: string[] = [];
    try {
      // Pull approved agents whose service_areas array contains the suburb
      const { data: agents } = await sb
        .from('agents')
        .select('id, user_id, name, email, languages_spoken, service_areas, rating, avg_rating')
        .eq('approval_status', 'approved')
        .eq('is_subscribed', true)
        .limit(50);

      const candidates = (agents ?? []).filter(a => {
        const areas = (a.service_areas ?? []) as string[];
        const langs = (a.languages_spoken ?? []) as string[];
        const inArea = areas.some(s => (s ?? '').toLowerCase().includes(suburbLower));
        const speaksLang = lang === 'en' || langs.some(l => (l ?? '').toLowerCase() === lang);
        return inArea && speaksLang;
      });

      // Sort by rating desc
      candidates.sort((a, b) =>
        ((b.avg_rating ?? b.rating ?? 0) as number) - ((a.avg_rating ?? a.rating ?? 0) as number)
      );

      matchedAgentIds = candidates.slice(0, 3).map(a => a.id as string);
    } catch (e) {
      console.error('agent matching failed', e);
    }

    // Insert seller lead
    const { data: lead, error: insertErr } = await sb
      .from('seller_leads')
      .insert({
        address: body.address,
        suburb: body.suburb,
        state: stateUpper,
        postcode: body.postcode ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        property_type: body.property_type,
        beds: body.beds ?? null,
        baths: body.baths ?? null,
        cars: body.cars ?? null,
        land_size_sqm: body.land_size_sqm ?? null,
        renovations: body.renovations ?? null,
        estimated_value_min: body.estimated_value_min ?? null,
        estimated_value_max: body.estimated_value_max ?? null,
        estimate_method: body.estimate_method ?? null,
        user_name: body.user_name,
        user_email: body.user_email,
        user_phone: body.user_phone ?? null,
        preferred_contact: body.preferred_contact ?? 'email',
        preferred_language: lang,
        status: matchedAgentIds.length > 0 ? 'matched' : 'new',
        matched_agent_ids: matchedAgentIds,
        source: 'valuation_tool',
      })
      .select()
      .single();

    if (insertErr) {
      console.error('seller_leads insert error', insertErr);
      return new Response(JSON.stringify({ error: 'Failed to submit lead' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fire-and-forget agent notifications via dispatch-notification
    if (matchedAgentIds.length > 0) {
      const title = `New seller lead in ${body.suburb}`;
      const message = `${body.user_name} wants an appraisal for ${body.address}.`;
      Promise.allSettled(matchedAgentIds.map(agentId =>
        sb.functions.invoke('dispatch-notification', {
          body: {
            agent_id: agentId,
            event_key: 'seller_lead_new',
            type: 'seller_lead',
            title,
            message,
            payload: {
              seller_lead_id: lead.id,
              address: body.address,
              suburb: body.suburb,
              state: stateUpper,
              estimated_value_min: body.estimated_value_min,
              estimated_value_max: body.estimated_value_max,
              user_name: body.user_name,
              user_email: body.user_email,
              user_phone: body.user_phone,
              preferred_contact: body.preferred_contact,
              preferred_language: lang,
            },
          },
        })
      )).catch(e => console.error('notify agents failed', e));
    }

    return new Response(JSON.stringify({
      success: true,
      lead_id: lead.id,
      matched_agents: matchedAgentIds.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error('submit-seller-lead error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
