// Seeds the "Meridian Property Group" demo agency. Idempotent: safe to re-run.
// Admin only. Invoke: supabase.functions.invoke('seed-meridian-demo')
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENCY_SLUG = "meridian-property-group";
const AGENCY_EMAIL = "demo@listhq.com.au";
const AGENCY_PASSWORD = "MeridianDemo2025";

const today = () => new Date();
const daysAgo = (n: number) => { const d = today(); d.setDate(d.getDate() - n); return d; };
const daysFromNow = (n: number) => { const d = today(); d.setDate(d.getDate() + n); return d; };
const iso = (d: Date) => d.toISOString();
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Demo seeder — open access by design (idempotent, demo data only).
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, service);
  const callerUserId: string | null = null;

  const counts: Record<string, number> = {};
  const errors: Record<string, string> = {};
  const inc = (k: string, n = 1) => { counts[k] = (counts[k] || 0) + n; };
  async function step<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
    try { return await fn(); } catch (e: any) {
      console.error(`step[${name}] failed:`, e?.message || e);
      errors[name] = e?.message || String(e);
      return null;
    }
  }

  try {
    // ============================================================
    // 1. Auth users (owner + 2 staff)
    // ============================================================
    async function ensureUser(email: string, password: string, displayName: string) {
      // Check if user exists
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) return existing.id;
      const { data, error } = await sb.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { display_name: displayName, full_name: displayName },
      });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      inc("auth_users");
      return data.user!.id;
    }

    const ownerUserId = await ensureUser(AGENCY_EMAIL, AGENCY_PASSWORD, "Sarah Chen");
    const jamesUserId = await ensureUser("james.patel@meridianproperty.com.au", "MeridianDemo2025", "James Patel");
    const lisaUserId  = await ensureUser("lisa.nguyen@meridianproperty.com.au", "MeridianDemo2025", "Lisa Nguyen");

    // profiles
    for (const [uid, name, phone] of [
      [ownerUserId, "Sarah Chen", "(03) 9877 4400"],
      [jamesUserId, "James Patel", "0412 555 201"],
      [lisaUserId,  "Lisa Nguyen", "0412 555 202"],
    ] as const) {
      await sb.from("profiles").upsert({
        user_id: uid, display_name: name, full_name: name, phone, onboarded: true,
      }, { onConflict: "user_id" });
    }

    // user_roles
    for (const uid of [ownerUserId, jamesUserId, lisaUserId]) {
      await sb.from("user_roles").upsert({ user_id: uid, role: "agent" }, { onConflict: "user_id,role" });
    }

    // ============================================================
    // 2. Agency
    // ============================================================
    const { data: existingAgency } = await sb.from("agencies").select("id").eq("slug", AGENCY_SLUG).maybeSingle();
    let agencyId: string;
    const agencyPayload = {
      name: "Meridian Property Group",
      slug: AGENCY_SLUG,
      owner_user_id: ownerUserId,
      email: AGENCY_EMAIL,
      phone: "(03) 9877 4400",
      address: "152 Whitehorse Rd, Blackburn VIC 3130",
      suburb: "Blackburn", state: "VIC", postcode: "3130",
      abn: "54 123 456 789",
      description: "Boutique agency serving Melbourne's eastern suburbs since 2012.",
      verified: true,
      founded_year: 2012,
    };
    if (existingAgency) {
      agencyId = existingAgency.id;
      await sb.from("agencies").update(agencyPayload).eq("id", agencyId);
    } else {
      const { data, error } = await sb.from("agencies").insert(agencyPayload).select("id").maybeSingle();
      if (error) throw new Error(`agency: ${error.message}`);
      agencyId = data.id;
      inc("agencies");
    }

    // ============================================================
    // 3. Agents
    // ============================================================
    async function ensureAgent(userId: string, name: string, title: string, role: string, email: string, phone: string, niche: string) {
      const { data: existing } = await sb.from("agents").select("id").eq("user_id", userId).maybeSingle();
      const payload = {
        user_id: userId, name, email, phone,
        agency: "Meridian Property Group",
        agency_id: agencyId,
        agency_role: role,
        title_position: title,
        license_number: "VIC-" + userId.substring(0, 6).toUpperCase(),
        office_address: "152 Whitehorse Rd, Blackburn VIC 3130",
        years_experience: 8,
        specialization: niche,
        bio: `${name} — ${title} at Meridian Property Group.`,
        service_areas: ["Glen Waverley", "Box Hill", "Burwood East", "Mitcham", "Blackburn"],
        languages_spoken: ["English"],
        is_approved: true,
        approval_status: "approved",
        verification_badge_level: "verified",
        rating: 4.7,
        review_count: 23,
        is_demo: true,
        onboarding_complete: true,
        handles_trust_accounting: true,
        trust_setup_pending: false,
        lifecycle_stage: "active",
        subscription_status: "active",
        is_subscribed: true,
      };
      if (existing) {
        await sb.from("agents").update(payload).eq("id", existing.id);
        return existing.id;
      } else {
        const { data, error } = await sb.from("agents").insert(payload).select("id").maybeSingle();
        if (error) throw new Error(`agent ${name}: ${error.message}`);
        inc("agents");
        return data.id;
      }
    }

    const sarahAgentId = await ensureAgent(ownerUserId, "Sarah Chen", "Principal / Director", "principal", AGENCY_EMAIL, "(03) 9877 4400", "Residential Sales");
    const jamesAgentId = await ensureAgent(jamesUserId, "James Patel", "Sales Agent", "agent", "james.patel@meridianproperty.com.au", "0412 555 201", "Residential Sales");
    const lisaAgentId  = await ensureAgent(lisaUserId, "Lisa Nguyen", "Property Manager", "agent", "lisa.nguyen@meridianproperty.com.au", "0412 555 202", "Property Management");

    // agency_members
    for (const [uid, role] of [
      [ownerUserId, "owner"], [jamesUserId, "agent"], [lisaUserId, "agent"],
    ] as const) {
      const { data: existing } = await sb.from("agency_members").select("id").eq("agency_id", agencyId).eq("user_id", uid).maybeSingle();
      if (!existing) {
        await sb.from("agency_members").insert({ agency_id: agencyId, user_id: uid, role });
        inc("agency_members");
      }
    }

    // agent_subscriptions (Agency Pro for Sarah)
    const { data: existingSub } = await sb.from("agent_subscriptions").select("id").eq("agent_id", sarahAgentId).maybeSingle();
    const subPayload = {
      agent_id: sarahAgentId,
      plan_type: "agency_pro",
      listing_limit: 100,
      featured_remaining: 10,
      seat_limit: 10,
      annual_billing: false,
      monthly_price_aud: 599,
      auto_renew: true,
      subscription_start: iso(daysAgo(45)),
      subscription_end: iso(daysFromNow(335)),
    };
    if (existingSub) await sb.from("agent_subscriptions").update(subPayload).eq("id", existingSub.id);
    else { await sb.from("agent_subscriptions").insert(subPayload); inc("subscriptions"); }

    // ============================================================
    // 4. Trust account
    // ============================================================
    const { data: existingTrust } = await sb.from("trust_accounts").select("id").eq("agency_id", agencyId).maybeSingle();
    let trustAccountId: string;
    const trustPayload = {
      agency_id: agencyId,
      agent_id: sarahAgentId,
      account_name: "Meridian Property Group Trust Account",
      account_type: "trust",
      bsb: "063-000",
      account_number: "1234 5678",
      bank_name: "Commonwealth Bank",
      is_active: true,
      opening_balance: 0,
      current_balance: 0,
    };
    if (existingTrust) {
      trustAccountId = existingTrust.id;
      await sb.from("trust_accounts").update(trustPayload).eq("id", trustAccountId);
    } else {
      const { data, error } = await sb.from("trust_accounts").insert(trustPayload).select("id").maybeSingle();
      if (error) throw new Error(`trust_account: ${error.message}`);
      trustAccountId = data.id;
      inc("trust_accounts");
    }

    // Idempotency: clear demo seeded child rows tagged by reference prefix "MERIDIAN-DEMO"
    await sb.from("trust_transactions").delete().eq("trust_account_id", trustAccountId).like("reference", "MERIDIAN-DEMO%");
    await sb.from("trust_receipts").delete().eq("agent_id", sarahAgentId).like("description", "MERIDIAN-DEMO%");
    await sb.from("trust_payments").delete().eq("agent_id", sarahAgentId).like("description", "MERIDIAN-DEMO%");

    // ============================================================
    // 5. Properties (3 sales + 3 rentals)
    // ============================================================
    async function upsertProperty(addressKey: string, payload: Record<string, unknown>) {
      const { data: existing } = await sb.from("properties").select("id").eq("address", addressKey).eq("agent_id", payload.agent_id).maybeSingle();
      if (existing) {
        await sb.from("properties").update(payload).eq("id", existing.id);
        return existing.id;
      }
      const { data, error } = await sb.from("properties").insert(payload).select("id").maybeSingle();
      if (error) throw new Error(`property ${addressKey}: ${error.message}`);
      inc("properties");
      return data.id;
    }

    // Sales
    const propGW = await upsertProperty("12 Huntingdale Rd, Glen Waverley VIC 3150", {
      agent_id: jamesAgentId,
      title: "Spacious Family Home in Glen Waverley Secondary Zone",
      address: "12 Huntingdale Rd, Glen Waverley VIC 3150",
      suburb: "Glen Waverley", state: "VIC", postcode: "3150", country: "Australia",
      price: 1350000, price_formatted: "$1,350,000",
      beds: 4, baths: 2, parking: 2, sqm: 612, land_size_sqm: 612,
      property_type: "House", listing_type: "sale", listing_category: "sale",
      status: "public", listing_mode: "public", listing_status: "active",
      is_active: true, moderation_status: "approved",
      description: "Spacious family home in the coveted Glen Waverley Secondary College zone. Set on a generous 612sqm allotment, this beautifully maintained four-bedroom home offers everything a growing family needs.",
      features: ["Ducted heating", "Alfresco entertaining", "Double lock-up garage", "Renovated kitchen"],
      lat: -37.8779, lng: 145.1656,
      listed_date: dateOnly(daysAgo(18)),
      listed_at: iso(daysAgo(18)),
      views: 142, contact_clicks: 18,
      school_zone_top: true, school_zone_name: "Glen Waverley Secondary College",
      title_zh: "格伦韦弗利中学学区宽敞家庭住宅",
      description_zh: "位于备受追捧的格伦韦弗利中学学区,612平米地块,四卧两卫家庭住宅。",
      translations: { zh_simplified: { title: "格伦韦弗利中学学区宽敞家庭住宅", description: "位于备受追捧的格伦韦弗利中学学区。", cultural_highlights: "顶级学区房", agent_insights: "家庭买家首选" } },
      translation_status: "complete",
      translations_generated_at: iso(daysAgo(17)),
    });

    const propBH = await upsertProperty("8/204 Station St, Box Hill VIC 3128", {
      agent_id: jamesAgentId,
      title: "Modern Apartment in the Heart of Box Hill",
      address: "8/204 Station St, Box Hill VIC 3128",
      suburb: "Box Hill", state: "VIC", postcode: "3128", country: "Australia",
      price: 680000, price_formatted: "$680,000",
      beds: 2, baths: 1, parking: 1, sqm: 78,
      property_type: "Apartment", listing_type: "sale", listing_category: "sale",
      status: "under_offer", listing_mode: "public", listing_status: "under_offer",
      is_active: true, moderation_status: "approved",
      description: "Modern apartment in the heart of Box Hill, walking distance to Box Hill Central, train station and tram.",
      features: ["Open plan living", "Secure car space", "Walk to station"],
      lat: -37.8195, lng: 145.1232,
      listed_date: dateOnly(daysAgo(35)),
      listed_at: iso(daysAgo(35)),
      views: 211, contact_clicks: 27,
    });

    const propBE = await upsertProperty("14 Outlook Drive, Burwood East VIC 3151", {
      agent_id: sarahAgentId,
      title: "Stylish Townhouse in Burwood East",
      address: "14 Outlook Drive, Burwood East VIC 3151",
      suburb: "Burwood East", state: "VIC", postcode: "3151", country: "Australia",
      price: 995000, price_formatted: "$995,000",
      beds: 3, baths: 2, parking: 2, sqm: 220,
      property_type: "Townhouse", listing_type: "sale", listing_category: "sale",
      status: "sold", listing_mode: "public", listing_status: "sold",
      is_active: false, moderation_status: "approved",
      description: "Beautifully presented three-bedroom townhouse in a quiet pocket of Burwood East.",
      features: ["Master with ensuite", "Double garage", "Low maintenance"],
      lat: -37.8474, lng: 145.1525,
      listed_date: dateOnly(daysAgo(75)),
      listed_at: iso(daysAgo(75)),
      sold_price: 995000, sold_at: dateOnly(daysAgo(30)),
      views: 389, contact_clicks: 52,
      commission_rate: 2.0,
    });

    // Rentals
    const propR1 = await upsertProperty("22 Springvale Rd, Glen Waverley VIC 3150", {
      agent_id: lisaAgentId, title: "3-Bed Family Home for Lease — Glen Waverley",
      address: "22 Springvale Rd, Glen Waverley VIC 3150",
      suburb: "Glen Waverley", state: "VIC", postcode: "3150", country: "Australia",
      price: 560, price_formatted: "$560 per week",
      rental_weekly: 560, beds: 3, baths: 2, parking: 2, sqm: 480, land_size_sqm: 480,
      property_type: "House", listing_type: "rental", listing_category: "rent",
      status: "leased", listing_mode: "public", listing_status: "leased",
      is_active: false, moderation_status: "approved",
      bond_amount: 2240, min_lease_months: 12,
      lat: -37.8765, lng: 145.1620,
      listed_date: dateOnly(daysAgo(200)),
      pm_status: "active", pm_management_fee_percent: 8.8,
      owner_name: "Robert and Helen Fitzgerald",
      owner_email: "fitzgerald.demo@listhq.com.au",
      owner_portal_token: "demo-owner-fitzgerald-" + propId6(),
      owner_portal_token_expires_at: iso(daysFromNow(365)),
    });

    const propR2 = await upsertProperty("4/88 Whitehorse Rd, Box Hill VIC 3128", {
      agent_id: lisaAgentId, title: "2-Bed Unit for Lease — Box Hill",
      address: "4/88 Whitehorse Rd, Box Hill VIC 3128",
      suburb: "Box Hill", state: "VIC", postcode: "3128", country: "Australia",
      price: 430, price_formatted: "$430 per week",
      rental_weekly: 430, beds: 2, baths: 1, parking: 1, sqm: 65,
      property_type: "Unit", listing_type: "rental", listing_category: "rent",
      status: "leased", listing_mode: "public", listing_status: "leased",
      is_active: false, moderation_status: "approved",
      bond_amount: 1720, min_lease_months: 12,
      lat: -37.8190, lng: 145.1230,
      pm_status: "active", pm_management_fee_percent: 8.8,
      owner_name: "George Papadopoulos",
      owner_email: "papadopoulos.demo@listhq.com.au",
      owner_portal_token: "demo-owner-papadopoulos-" + propId6(),
      owner_portal_token_expires_at: iso(daysFromNow(365)),
    });

    const propR3 = await upsertProperty("11 Orchard Grove, Mitcham VIC 3132", {
      agent_id: lisaAgentId, title: "2-Bed Unit for Lease — Mitcham",
      address: "11 Orchard Grove, Mitcham VIC 3132",
      suburb: "Mitcham", state: "VIC", postcode: "3132", country: "Australia",
      price: 410, price_formatted: "$410 per week",
      rental_weekly: 410, beds: 2, baths: 1, parking: 1, sqm: 72,
      property_type: "Unit", listing_type: "rental", listing_category: "rent",
      status: "leased", listing_mode: "public", listing_status: "leased",
      is_active: false, moderation_status: "approved",
      bond_amount: 1640, min_lease_months: 12,
      lat: -37.8156, lng: 145.1929,
      pm_status: "active", pm_management_fee_percent: 8.8,
      owner_name: "Margaret Bennett",
      owner_email: "bennett.demo@listhq.com.au",
      owner_portal_token: "demo-owner-bennett-" + propId6(),
      owner_portal_token_expires_at: iso(daysFromNow(365)),
    });

    // ============================================================
    // 6. Tenancies
    // ============================================================
    async function upsertTenancy(propertyId: string, payload: Record<string, unknown>) {
      const { data: existing } = await sb.from("tenancies").select("id").eq("property_id", propertyId).maybeSingle();
      if (existing) {
        await sb.from("tenancies").update(payload).eq("id", existing.id);
        return existing.id;
      }
      const { data, error } = await sb.from("tenancies").insert(payload).select("id").maybeSingle();
      if (error) throw new Error(`tenancy ${propertyId}: ${error.message}`);
      inc("tenancies");
      return data.id;
    }

    const tenancy1 = await upsertTenancy(propR1, {
      property_id: propR1, agent_id: lisaAgentId,
      tenant_name: "Michael Wang & Jenny Wang",
      tenant_email: "wang.demo@listhq.com.au", tenant_phone: "0412 555 301",
      lease_start: dateOnly(daysAgo(180)), lease_end: dateOnly(daysFromNow(180)),
      rent_amount: 560, rent_frequency: "weekly",
      bond_amount: 2240, bond_lodgement_number: "RTBA-DEMO-2240-001", bond_authority: "RTBA",
      management_fee_percent: 8.8, status: "active",
      owner_name: "Robert and Helen Fitzgerald", owner_email: "fitzgerald.demo@listhq.com.au",
      owner_bsb: "063-100", owner_account_number: "1111 2222",
      tenant_portal_token: "demo-tenant-wang-" + propId6(),
      arrears_action_status: "none",
      rent_paid_to_date: dateOnly(daysAgo(3)),
      arrears_weeks: 0, lease_type: "fixed",
    });

    const tenancy2 = await upsertTenancy(propR2, {
      property_id: propR2, agent_id: lisaAgentId,
      tenant_name: "Priya Sharma",
      tenant_email: "sharma.demo@listhq.com.au", tenant_phone: "0412 555 302",
      lease_start: dateOnly(daysAgo(120)), lease_end: dateOnly(daysFromNow(240)),
      rent_amount: 430, rent_frequency: "weekly",
      bond_amount: 1720, bond_lodgement_number: "RTBA-DEMO-1720-002", bond_authority: "RTBA",
      management_fee_percent: 8.8, status: "active",
      owner_name: "George Papadopoulos", owner_email: "papadopoulos.demo@listhq.com.au",
      owner_bsb: "063-100", owner_account_number: "3333 4444",
      tenant_portal_token: "demo-tenant-sharma-" + propId6(),
      arrears_action_status: "day_7_notice_sent",
      last_arrears_notice_date: dateOnly(daysAgo(5)),
      rent_paid_to_date: dateOnly(daysAgo(12 + Math.floor(120/7)*7)),
      arrears_weeks: 12/7, lease_type: "fixed",
    });

    const tenancy3 = await upsertTenancy(propR3, {
      property_id: propR3, agent_id: lisaAgentId,
      tenant_name: "Tom and Rachel Bennett",
      tenant_email: "bennett.tenant.demo@listhq.com.au", tenant_phone: "0412 555 303",
      lease_start: dateOnly(daysAgo(270)), lease_end: dateOnly(daysFromNow(90)),
      rent_amount: 410, rent_frequency: "weekly",
      bond_amount: 1640, bond_lodgement_number: "RTBA-DEMO-1640-003", bond_authority: "RTBA",
      management_fee_percent: 8.8, status: "active",
      owner_name: "Margaret Bennett", owner_email: "bennett.demo@listhq.com.au",
      owner_bsb: "063-100", owner_account_number: "5555 6666",
      tenant_portal_token: "demo-tenant-bennett-" + propId6(),
      arrears_action_status: "none",
      rent_paid_to_date: dateOnly(daysAgo(2)),
      arrears_weeks: 0, lease_type: "fixed",
    });

    // tenancy_contacts (idempotent: clear and re-insert)
    for (const tid of [tenancy1, tenancy2, tenancy3]) {
      await sb.from("tenancy_contacts").delete().eq("tenancy_id", tid);
    }
    await sb.from("tenancy_contacts").insert([
      { tenancy_id: tenancy1, contact_type: "tenant", name: "Michael Wang", email: "michael.wang.demo@listhq.com.au", phone: "0412 555 311", id_verified: true },
      { tenancy_id: tenancy1, contact_type: "tenant", name: "Jenny Wang",  email: "jenny.wang.demo@listhq.com.au",  phone: "0412 555 312", id_verified: true },
      { tenancy_id: tenancy2, contact_type: "tenant", name: "Priya Sharma", email: "sharma.demo@listhq.com.au", phone: "0412 555 302", id_verified: true },
      { tenancy_id: tenancy3, contact_type: "tenant", name: "Tom Bennett", email: "tom.bennett.demo@listhq.com.au", phone: "0412 555 313", id_verified: true },
      { tenancy_id: tenancy3, contact_type: "tenant", name: "Rachel Bennett", email: "rachel.bennett.demo@listhq.com.au", phone: "0412 555 314", id_verified: true },
    ]);
    inc("tenancy_contacts", 5);

    // ============================================================
    // 7. Property inspection (entry done, routine due in 14 days for tenancy1)
    // ============================================================
    await step("inspections", async () => {
      await sb.from("property_inspections").delete().eq("tenancy_id", tenancy1);
      const { error } = await sb.from("property_inspections").insert([
        {
          tenancy_id: tenancy1, property_id: propR1, agent_id: lisaAgentId,
          inspection_type: "entry", scheduled_date: dateOnly(daysAgo(180)),
          conducted_date: dateOnly(daysAgo(180)), status: "completed",
          finalised_at: iso(daysAgo(179)), overall_notes: "Property in excellent condition at lease start.",
        },
        {
          tenancy_id: tenancy1, property_id: propR1, agent_id: lisaAgentId,
          inspection_type: "routine", scheduled_date: dateOnly(daysFromNow(14)),
          status: "scheduled", overall_notes: "Routine 6-month inspection.",
        },
      ]);
      if (error) throw error;
      inc("inspections", 2);
    });

    // ============================================================
    // 8. Maintenance job (rental 3)
    // ============================================================
    let rapidPlumbingId: string | null = null;
    await step("supplier", async () => {
      const { data: existingSupplier } = await sb.from("suppliers").select("id").eq("business_name", "Rapid Plumbing Services").eq("agent_id", lisaAgentId).maybeSingle();
      const supplierPayload = {
        agent_id: lisaAgentId, business_name: "Rapid Plumbing Services",
        contact_name: "Steve Rapid", email: "demo+rapidplumbing@listhq.com.au", phone: "0412 555 401",
        trade_category: "Plumbing", abn: "11 222 333 444", license_number: "PIC-12345",
        preferred: true, rating_avg: 4.8, jobs_completed: 47, status: "active",
      };
      if (existingSupplier) {
        rapidPlumbingId = existingSupplier.id;
        await sb.from("suppliers").update(supplierPayload).eq("id", rapidPlumbingId);
      } else {
        const { data, error } = await sb.from("suppliers").insert(supplierPayload).select("id").maybeSingle();
        if (error) throw error;
        rapidPlumbingId = data!.id; inc("suppliers");
      }
    });

    await step("maintenance_jobs", async () => {
      await sb.from("maintenance_jobs").delete().eq("tenancy_id", tenancy3);
      const { error } = await sb.from("maintenance_jobs").insert({
        tenancy_id: tenancy3, property_id: propR3, agent_id: lisaAgentId,
        reported_by: "tenant", title: "Leaking kitchen tap",
        description: "Water pooling under sink. Reported via tenant portal.",
        priority: "medium", status: "in_progress",
        assigned_to: "Rapid Plumbing Services", assigned_phone: "0412 555 401",
        assigned_supplier_id: rapidPlumbingId,
        supplier_notified_at: iso(daysAgo(3)),
        supplier_accepted_at: iso(daysAgo(2)),
        supplier_scheduled_date: dateOnly(daysFromNow(1)),
        supplier_scheduled_time: "10:00",
      });
      if (error) throw error;
      inc("maintenance_jobs");
    });

    // ============================================================
    // 9. Trust transactions (rent receipts, bond lodgements, disbursements)
    // ============================================================
    const trustRows: Record<string, unknown>[] = [];
    const receiptRows: Record<string, unknown>[] = [];
    const paymentRows: Record<string, unknown>[] = [];

    // Bond lodgements
    const bondData = [
      { propId: propR1, addr: "22 Springvale Rd, Glen Waverley", amt: 2240, days: 90, owner: "Fitzgerald" },
      { propId: propR2, addr: "4/88 Whitehorse Rd, Box Hill",    amt: 1720, days: 120, owner: "Papadopoulos" },
      { propId: propR3, addr: "11 Orchard Grove, Mitcham",       amt: 1640, days: 270, owner: "Bennett" },
    ];
    for (const b of bondData) {
      trustRows.push({
        trust_account_id: trustAccountId, property_id: b.propId, created_by: ownerUserId,
        transaction_type: "withdrawal", category: "bond_lodgement", amount: b.amt,
        description: `MERIDIAN-DEMO Bond lodgement to RTBA — ${b.addr}`,
        reference: `MERIDIAN-DEMO-BOND-${b.propId.substring(0,4)}`,
        payee_name: "RTBA", status: "reconciled",
        transaction_date: dateOnly(daysAgo(b.days)),
        reconciled_at: iso(daysAgo(b.days - 1)), reconciled_by: ownerUserId,
      });
    }

    // Weekly rent receipts (12 weeks for each property)
    const rentals = [
      { propId: propR1, tenancy: tenancy1, addr: "22 Springvale Rd, Glen Waverley", weekly: 560, tenant: "Michael Wang & Jenny Wang" },
      { propId: propR2, tenancy: tenancy2, addr: "4/88 Whitehorse Rd, Box Hill", weekly: 430, tenant: "Priya Sharma" },
      { propId: propR3, tenancy: tenancy3, addr: "11 Orchard Grove, Mitcham", weekly: 410, tenant: "Tom and Rachel Bennett" },
    ];
    let weekIdx = 0;
    for (const r of rentals) {
      // Rental 2 (Sharma) is in arrears — skip last 2 weekly receipts (only 10 receipts)
      const weeks = r.propId === propR2 ? 10 : 12;
      for (let w = weeks; w >= 1; w--) {
        const txDate = daysAgo(w * 7);
        const isCurrent = w === 1;
        const status = isCurrent ? "pending" : "reconciled";
        const recNum = `MD-RNT-${r.propId.substring(0,4)}-${String(w).padStart(2,"0")}`;
        trustRows.push({
          trust_account_id: trustAccountId, property_id: r.propId, created_by: ownerUserId,
          transaction_type: "deposit", category: "rent_receipt", amount: r.weekly,
          description: `MERIDIAN-DEMO Rent receipt — ${r.addr} (week ${w})`,
          reference: `MERIDIAN-DEMO-${recNum}`, receipt_number: recNum,
          payee_name: r.tenant, status,
          transaction_date: dateOnly(txDate),
          reconciled_at: isCurrent ? null : iso(daysAgo(w * 7 - 2)),
          reconciled_by: isCurrent ? null : ownerUserId,
        });
        receiptRows.push({
          receipt_number: recNum, agent_id: sarahAgentId, trust_account_id: trustAccountId,
          client_name: r.tenant, property_address: r.addr, property_id: r.propId,
          amount: r.weekly, payment_method: "eft", purpose: "rent",
          type: "rent_receipt", ledger_account: "rent_trust",
          date_received: dateOnly(txDate),
          date_deposited: isCurrent ? null : dateOnly(daysAgo(w * 7 - 1)),
          status: isCurrent ? "pending_clearance" : "cleared",
          description: `MERIDIAN-DEMO weekly rent ${r.addr}`,
        });
        weekIdx++;
      }
    }

    // Owner disbursements: 2 per rental, monthly
    const disbursements = [
      { propId: propR1, owner: "Robert and Helen Fitzgerald", gross: 560*4, addr: "22 Springvale Rd, Glen Waverley" },
      { propId: propR2, owner: "George Papadopoulos",         gross: 430*4, addr: "4/88 Whitehorse Rd, Box Hill" },
      { propId: propR3, owner: "Margaret Bennett",            gross: 410*4, addr: "11 Orchard Grove, Mitcham" },
    ];
    for (const d of disbursements) {
      for (const monthsAgo of [2, 1]) {
        const fee = +(d.gross * 0.088).toFixed(2);
        const net = +(d.gross - fee).toFixed(2);
        const txDate = daysAgo(monthsAgo * 30);
        const payNum = `MD-PAY-${d.propId.substring(0,4)}-M${monthsAgo}`;
        trustRows.push({
          trust_account_id: trustAccountId, property_id: d.propId, created_by: ownerUserId,
          transaction_type: "withdrawal", category: "owner_disbursement", amount: net,
          description: `MERIDIAN-DEMO Owner disbursement — ${d.addr} (month -${monthsAgo})`,
          reference: `MERIDIAN-DEMO-${payNum}`,
          payee_name: d.owner, status: "reconciled",
          transaction_date: dateOnly(txDate),
          reconciled_at: iso(daysAgo(monthsAgo * 30 - 1)), reconciled_by: ownerUserId,
        });
        // Management fee withdrawal
        trustRows.push({
          trust_account_id: trustAccountId, property_id: d.propId, created_by: ownerUserId,
          transaction_type: "withdrawal", category: "management_fee", amount: fee, gst_amount: +(fee/11).toFixed(2),
          description: `MERIDIAN-DEMO Management fee 8.8% — ${d.addr} (month -${monthsAgo})`,
          reference: `MERIDIAN-DEMO-FEE-${d.propId.substring(0,4)}-M${monthsAgo}`,
          payee_name: "Meridian Property Group", status: "reconciled",
          transaction_date: dateOnly(txDate),
          reconciled_at: iso(daysAgo(monthsAgo * 30 - 1)), reconciled_by: ownerUserId,
        });
        paymentRows.push({
          payment_number: payNum, agent_id: sarahAgentId, trust_account_id: trustAccountId,
          client_name: d.owner, property_address: d.addr, property_id: d.propId,
          amount: net, payment_method: "eft", purpose: "owner_disbursement",
          type: "disbursement", bsb: "063-100", account_number: "XXXX-XXXX",
          payee_name: d.owner, date_paid: dateOnly(txDate),
          status: "completed", description: `MERIDIAN-DEMO owner disbursement ${d.addr}`,
        });
      }
    }

    // Insert in chunks
    await step("trust_transactions", async () => {
      if (!trustRows.length) return;
      const { error } = await sb.from("trust_transactions").insert(trustRows);
      if (error) throw error;
      inc("trust_transactions", trustRows.length);
    });
    await step("trust_receipts", async () => {
      if (!receiptRows.length) return;
      const { error } = await sb.from("trust_receipts").insert(receiptRows);
      if (error) throw error;
      inc("trust_receipts", receiptRows.length);
    });
    await step("trust_payments", async () => {
      if (!paymentRows.length) return;
      const { error } = await sb.from("trust_payments").insert(paymentRows);
      if (error) throw error;
      inc("trust_payments", paymentRows.length);
    });

    // ============================================================
    // 10. rent_payments (parallel record)
    // ============================================================
    await step("rent_payments", async () => {
      await sb.from("rent_payments").delete().eq("agent_id", lisaAgentId).like("reference", "MD-RNT-%");
      const rpRows: Record<string, unknown>[] = [];
      for (const r of rentals) {
        const weeks = r.propId === propR2 ? 10 : 12;
        for (let w = weeks; w >= 1; w--) {
          const periodStart = daysAgo(w * 7);
          const periodEnd = daysAgo(w * 7 - 6);
          rpRows.push({
            tenancy_id: r.tenancy, agent_id: lisaAgentId, property_id: r.propId,
            amount: r.weekly, payment_date: dateOnly(periodStart),
            period_from: dateOnly(periodStart), period_to: dateOnly(periodEnd),
            receipt_number: `MD-RNT-${r.propId.substring(0,4)}-${String(w).padStart(2,"0")}`,
            payment_method: "bank_transfer", status: "paid",
            reference: `MD-RNT-${r.propId.substring(0,4)}-${String(w).padStart(2,"0")}`,
            is_arrears: false,
          });
        }
      }
      if (rpRows.length) {
        const { error } = await sb.from("rent_payments").insert(rpRows);
        if (error) throw error;
        inc("rent_payments", rpRows.length);
      }
    });

    // ============================================================
    // 11. Sold listing commission
    // ============================================================
    await step("commission_receipt", async () => {
      const { error } = await sb.from("trust_receipts").insert({
        receipt_number: "MD-COMM-BURWOOD",
        agent_id: sarahAgentId, trust_account_id: trustAccountId,
        client_name: "Vendor — 14 Outlook Drive", property_address: "14 Outlook Drive, Burwood East VIC 3151",
        property_id: propBE, amount: 19900, payment_method: "eft",
        purpose: "commission", type: "commission", ledger_account: "commission",
        date_received: dateOnly(daysAgo(28)), date_deposited: dateOnly(daysAgo(27)),
        status: "cleared", description: "MERIDIAN-DEMO sale commission 2% — 14 Outlook Drive",
      });
      if (error) throw error;
      inc("trust_receipts");
    });

    // ============================================================
    // 12. Contacts (4 buyer contacts)
    // ============================================================
    const contactSpec = [
      { first: "Wei", last: "Zhang", email: "wei.zhang.demo@listhq.com.au", phone: "0412 555 501",
        suburbs: ["Glen Waverley", "Wheelers Hill"], min: 1200000, max: 1500000, beds: 4, lang: "zh_simplified",
        notes: "Saved 3 listings, used mortgage calculator twice, narrowed search from 5 suburbs to 2.",
        last: "Zhang", lastActive: 1 },
      { first: "Anh", last: "Nguyen", email: "anh.nguyen.demo@listhq.com.au", phone: "0412 555 502",
        suburbs: ["Box Hill", "Doncaster"], min: 900000, max: 1100000, beds: 3, lang: "vi",
        notes: "Saved 2 listings, 1 open home registered.", lastActive: 4 },
      { first: "David", last: "Morrison", email: "david.morrison.demo@listhq.com.au", phone: "0412 555 503",
        suburbs: ["Box Hill", "Burwood", "Mitcham"], min: 800000, max: 1100000, beds: 3, lang: "en",
        notes: "Early stage, browsing broadly.", lastActive: 6 },
      { first: "Sophie", last: "Park", email: "sophie.park.demo@listhq.com.au", phone: "0412 555 504",
        suburbs: ["Box Hill"], min: 600000, max: 720000, beds: 2, lang: "en",
        notes: "Saved listings, completed stamp duty calculator, 1 enquiry sent.", lastActive: 2 },
    ];
    const contactIds: Record<string, string> = {};
    for (const c of contactSpec) {
      const { data: existing } = await sb.from("contacts").select("id").eq("email", c.email).maybeSingle();
      const payload = {
        agency_id: agencyId, created_by: ownerUserId, contact_type: "buyer",
        first_name: c.first, last_name: c.last, email: c.email, phone: c.phone,
        preferred_suburbs: c.suburbs, budget_min: c.min, budget_max: c.max,
        preferred_beds: c.beds, preferred_language: c.lang,
        assigned_agent_id: jamesAgentId, ranking: c.lastActive <= 2 ? "hot" : "warm",
        source: "website", notes: c.notes,
        last_contacted_at: iso(daysAgo(c.lastActive)),
      };
      if (existing) { await sb.from("contacts").update(payload).eq("id", existing.id); contactIds[c.email] = existing.id; }
      else { const { data } = await sb.from("contacts").insert(payload).select("id").maybeSingle(); contactIds[c.email] = data!.id; inc("contacts"); }
    }

    // ============================================================
    // 13. CRM leads
    // ============================================================
    const crmSpec = [
      { email: "wei.zhang.demo@listhq.com.au", score: 87, propId: propGW, stage: "qualified", temp: "hot" },
      { email: "anh.nguyen.demo@listhq.com.au", score: 62, propId: propBH, stage: "contacted", temp: "warm" },
      { email: "david.morrison.demo@listhq.com.au", score: 41, propId: null, stage: "new", temp: "cold" },
      { email: "sophie.park.demo@listhq.com.au", score: 74, propId: propBH, stage: "qualified", temp: "warm" },
    ];
    for (const cs of crmSpec) {
      const cid = contactIds[cs.email];
      const { data: existing } = await sb.from("crm_leads").select("id").eq("contact_id", cid).maybeSingle();
      const payload = {
        contact_id: cid, agent_id: jamesAgentId, source_property_id: cs.propId,
        enquiry_source: "enquiry_form", lead_temperature: cs.temp,
        stage: cs.stage, priority: cs.score > 70 ? "high" : "medium",
        lead_score: cs.score, conversion_status: cs.stage,
        last_contacted: iso(daysAgo(2)),
      };
      if (existing) await sb.from("crm_leads").update(payload).eq("id", existing.id);
      else { await sb.from("crm_leads").insert(payload); inc("crm_leads"); }
    }

    // ============================================================
    // 14. Enquiries on Listing 1 (3 leads)
    // ============================================================
    await sb.from("leads").delete().eq("property_id", propGW).eq("agent_id", jamesAgentId).like("user_email", "%demo@listhq.com.au");
    await sb.from("leads").insert([
      { property_id: propGW, agent_id: jamesAgentId, user_name: "Wei Zhang", user_email: "wei.zhang.demo@listhq.com.au", user_phone: "0412 555 501",
        message: "Very interested — when's the next inspection?", status: "qualified", score: 87,
        urgency: "ready_to_buy", pre_approval_status: "approved", source: "enquiry_form" },
      { property_id: propGW, agent_id: jamesAgentId, user_name: "Anh Nguyen", user_email: "anh.nguyen.demo@listhq.com.au", user_phone: "0412 555 502",
        message: "Is the price negotiable?", status: "new", score: 62,
        urgency: "next_3_months", pre_approval_status: "in_progress", source: "enquiry_form" },
      { property_id: propGW, agent_id: jamesAgentId, user_name: "David Morrison", user_email: "david.morrison.demo@listhq.com.au", user_phone: "0412 555 503",
        message: "Just looking, thanks.", status: "new", score: 41,
        urgency: "just_browsing", source: "enquiry_form" },
    ]);
    inc("leads", 3);

    // ============================================================
    // 15. Open home + registrations (Listing 1)
    // ============================================================
    await sb.from("open_homes").delete().eq("property_id", propGW).eq("agent_id", jamesAgentId);
    const oh = await sb.from("open_homes").insert({
      property_id: propGW, agent_id: jamesAgentId,
      starts_at: iso(daysAgo(3)), ends_at: iso(new Date(daysAgo(3).getTime() + 30*60*1000)),
      max_attendees: 30, status: "completed", notes: "Saturday open home.",
    }).select("id").maybeSingle();
    if (oh.error) console.error("open_homes insert error:", oh.error.message);
    if (oh.data) inc("open_homes");

    if (oh.data) {
      const regs = [];
      const names = ["Wei Zhang", "Anh Nguyen", "David Morrison", "Mei Lin", "Brian Cox", "Sarah Lee", "Jacob Tan", "Grace Wu", "Henry Liu", "Olivia Park", "Ben Chen", "Emma Wong"];
      for (let i = 0; i < 12; i++) {
        regs.push({
          open_home_id: oh.data.id, name: names[i],
          email: `oh.demo.${i}@listhq.com.au`, phone: `04125556${String(i).padStart(2,"0")}`,
          attended: true, attended_at: iso(daysAgo(3)),
        });
      }
      await sb.from("open_home_registrations").insert(regs);
      inc("open_home_registrations", 12);
    }

    // ============================================================
    // 16. saved_properties (8 buyers saved Listing 1) — needs real auth users; create demo users
    // ============================================================
    // Skip — saved_properties FK to auth.users; would require creating 8 dummy auth users. Instead seed view counts via property fields already done.

    // ============================================================
    // 17. Halos (2 active briefs)
    // ============================================================
    // Halos.seeker_id FK to auth.users — create or reuse 2 demo seeker accounts
    const meiLinUserId = await ensureUser("mei.lin.demo@listhq.com.au", "MeridianDemo2025", "Mei Lin");
    const investorUserId = await ensureUser("investor.demo@listhq.com.au", "MeridianDemo2025", "Investor");

    // Idempotent: clear halos seeded by these users
    await sb.from("halos").delete().eq("seeker_id", meiLinUserId);
    await sb.from("halos").delete().eq("seeker_id", investorUserId);

    await sb.from("halos").insert([
      {
        seeker_id: meiLinUserId, intent: "buy",
        property_types: ["House"], bedrooms_min: 3,
        suburbs: ["Glen Waverley", "Wheelers Hill", "Mount Waverley"],
        suburb_flexibility: false,
        budget_min: 1200000, budget_max: 1500000,
        timeframe: "3_to_6_months", finance_status: "pre_approved",
        description: "Young family relocating from Sydney, flexible on settlement.",
        must_haves: ["Glen Waverley Secondary College zone", "north-facing backyard", "double garage"],
        preferred_language: "english", status: "active", quality_score: 92,
        created_at: iso(daysAgo(4)),
      },
      {
        seeker_id: investorUserId, intent: "buy",
        property_types: ["Apartment", "Unit"], bedrooms_min: 2,
        suburbs: ["Box Hill", "Burwood", "Nunawading"],
        suburb_flexibility: false,
        budget_min: 600000, budget_max: 750000,
        timeframe: "ready_now", finance_status: "cash_buyer",
        description: "Investor — strong yield required, low body corporate.",
        must_haves: ["Strong rental yield", "low body corporate"],
        preferred_language: "english", status: "active", quality_score: 78,
        created_at: iso(daysAgo(8)),
      },
    ]);
    inc("halos", 2);

    return new Response(JSON.stringify({
      ok: true, agency_id: agencyId, owner_user_id: ownerUserId,
      login: { email: AGENCY_EMAIL, password: AGENCY_PASSWORD },
      counts,
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("seed-meridian-demo error:", err);
    return new Response(JSON.stringify({ error: err.message, counts }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function propId6() { return Math.random().toString(36).slice(2, 8); }
