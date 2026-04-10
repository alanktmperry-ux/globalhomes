import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get all active alerts not emailed in the last 24 hours
    const { data: alerts, error: alertsErr } = await supabase
      .from('saved_search_alerts')
      .select('*')
      .eq('is_active', true)
      .or(`last_alerted_at.is.null,last_alerted_at.lt.${oneDayAgo}`);

    if (alertsErr) throw alertsErr;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ matched: 0, message: 'No alerts to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let emailsSent = 0;

    for (const alert of alerts) {
      // Determine the "since" timestamp: last alert or 24h ago
      const since = alert.last_alerted_at || oneDayAgo;

      // Build property query based on saved search filters
      let query = supabase
        .from('properties')
        .select('id, title, address, suburb, state, price, price_formatted, beds, baths, parking, sqm, image_url, listing_type, rental_weekly, currency_code')
        .eq('is_active', true)
        .gte('created_at', since);

      const filters = alert.filters || {};

      // Apply filter criteria
      if (filters.minPrice) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
      if (filters.minBeds) query = query.gte('beds', filters.minBeds);
      if (filters.minBaths) query = query.gte('baths', filters.minBaths);
      if (filters.propertyTypes && filters.propertyTypes.length > 0) {
        query = query.in('property_type', filters.propertyTypes);
      }

      // Text search on suburb/address
      if (alert.search_query) {
        const q = alert.search_query.toLowerCase();
        query = query.or(`suburb.ilike.%${q}%,address.ilike.%${q}%,title.ilike.%${q}%`);
      }

      // Listing type filter
      if (filters.listingType && filters.listingType !== 'all') {
        query = query.eq('listing_type', filters.listingType);
      }

      query = query.limit(10);

      const { data: newProps, error: propErr } = await query;
      if (propErr) {
        console.error(`Query error for alert ${alert.id}:`, propErr);
        continue;
      }

      if (!newProps || newProps.length === 0) continue;

      // Get user email
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(alert.user_id);
      if (userErr || !userData?.user?.email) {
        console.error(`No email for user ${alert.user_id}`);
        continue;
      }

      const userEmail = userData.user.email;
      const displayName = userData.user.user_metadata?.display_name || 'there';

      // Build email
      const emailHtml = buildAlertEmail({
        name: displayName,
        searchLabel: alert.label,
        properties: newProps,
        count: newProps.length,
      });

      // Send email
      if (lovableApiKey) {
        const subject = `${newProps.length} new ${newProps.length === 1 ? 'property matches' : 'properties match'} your "${alert.label}" search`;

        const emailRes = await fetch('https://api.lovable.dev/v1/email/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: userEmail,
            subject,
            html: emailHtml,
            purpose: 'transactional',
          }),
        });

        if (!emailRes.ok) {
          console.error(`Email failed for ${userEmail}:`, await emailRes.text());
          continue;
        }
      } else {
        console.log(`[DRY RUN] Would email ${userEmail}: ${newProps.length} matches for "${alert.label}"`);
      }

      // Update last_alerted_at
      await supabase
        .from('saved_search_alerts')
        .update({ last_alerted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', alert.id);

      emailsSent++;
    }

    return new Response(JSON.stringify({ matched: emailsSent, total_alerts: alerts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('match-saved-searches error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface PropertyCard {
  title: string;
  address: string;
  suburb: string;
  state: string;
  price_formatted: string;
  beds: number;
  baths: number;
  parking: number;
  sqm: number;
  image_url: string | null;
  listing_type: string | null;
  rental_weekly: number | null;
  currency_code: string | null;
}

function buildAlertEmail(params: {
  name: string;
  searchLabel: string;
  properties: PropertyCard[];
  count: number;
}) {
  const { name, searchLabel, properties, count } = params;

  const propertyCards = properties.slice(0, 6).map(p => {
    const img = p.image_url || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=250&fit=crop';
    const priceDisplay = p.listing_type === 'rent' && p.rental_weekly
      ? `$${p.rental_weekly}/wk`
      : p.price_formatted;

    return `
    <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:16px;">
      <img src="${img}" alt="${p.title}" style="width:100%;height:180px;object-fit:cover;" />
      <div style="padding:14px;">
        <div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:4px;">${priceDisplay}</div>
        <div style="font-size:14px;color:#333;margin-bottom:4px;">${p.title}</div>
        <div style="font-size:13px;color:#666;margin-bottom:8px;">📍 ${p.suburb}, ${p.state}</div>
        <div style="font-size:12px;color:#888;">
          🛏 ${p.beds} &nbsp; 🚿 ${p.baths} &nbsp; 🚗 ${p.parking} &nbsp; 📐 ${p.sqm}m²
        </div>
      </div>
    </div>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:24px;font-weight:700;color:#1a1a2e;">ListHQ</div>
      <div style="font-size:12px;color:#888;margin-top:4px;">Property Alert</div>
    </div>

    <div style="background:#ffffff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:12px 16px;text-align:center;margin-bottom:20px;">
        <span style="font-size:14px;font-weight:600;color:#2563EB;">🔔 ${count} new ${count === 1 ? 'match' : 'matches'} for "${searchLabel}"</span>
      </div>

      <p style="font-size:15px;color:#333;margin:0 0 20px;">Hi ${name}, we found ${count} new ${count === 1 ? 'property' : 'properties'} matching your saved search.</p>

      ${propertyCards}

      <div style="text-align:center;margin-top:24px;">
        <a href="https://listhq.lovable.app" style="display:inline-block;background:#2563EB;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:10px;text-decoration:none;">View All Matches</a>
      </div>
    </div>

    <div style="text-align:center;padding-top:20px;">
      <p style="font-size:11px;color:#aaa;margin:0;">You're receiving this because you saved the search "${searchLabel}" on ListHQ.</p>
      <p style="font-size:11px;color:#aaa;margin:4px 0 0;">To stop these alerts, remove the saved search from your account.</p>
    </div>
  </div>
</body>
</html>`;
}
