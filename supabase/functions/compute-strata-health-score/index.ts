import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scheme_id } = await req.json();
    if (!scheme_id) {
      return new Response(JSON.stringify({ error: "scheme_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: scheme, error } = await supabase
      .from("strata_schemes")
      .select("*")
      .eq("id", scheme_id)
      .single();

    if (error || !scheme) {
      return new Response(JSON.stringify({ error: "Scheme not found" }), { status: 404, headers: corsHeaders });
    }

    let score = 0;

    // 1. Sinking Fund Adequacy (30 pts)
    if (scheme.sinking_fund_balance != null && scheme.sinking_fund_target != null && scheme.sinking_fund_target > 0) {
      const ratio = scheme.sinking_fund_balance / scheme.sinking_fund_target;
      if (ratio >= 1.0) score += 30;
      else if (ratio >= 0.75) score += 22;
      else if (ratio >= 0.50) score += 14;
      else if (ratio >= 0.25) score += 7;
    } else {
      score += 15;
    }

    // 2. Special Levy History (25 pts)
    if (scheme.special_levy_issued_5yr === false) {
      score += 25;
    } else if (scheme.special_levy_issued_5yr === true && scheme.special_levy_amount != null) {
      const perLot = scheme.special_levy_amount / Math.max(scheme.total_lots, 1);
      if (perLot < 5000) score += 15;
      else if (perLot <= 20000) score += 7;
    } else {
      score += 12;
    }

    // 3. Levy-to-Value Ratio (20 pts)
    if (scheme.admin_fund_levy_per_lot != null && scheme.capital_works_levy_per_lot != null) {
      const annualLevy = (Number(scheme.admin_fund_levy_per_lot) + Number(scheme.capital_works_levy_per_lot)) * 4;
      const estimatedLotValue = 750000;
      const ratio = annualLevy / estimatedLotValue;
      if (ratio < 0.005) score += 20;
      else if (ratio < 0.010) score += 14;
      else if (ratio < 0.015) score += 8;
      else score += 3;
    } else {
      score += 10;
    }

    // 4. Capital Works Plan Currency (15 pts)
    if (scheme.capital_works_plan_year != null) {
      const age = new Date().getFullYear() - scheme.capital_works_plan_year;
      if (age <= 5) score += 15;
      else if (age <= 10) score += 8;
    }

    // 5. Defect Disclosure (10 pts)
    if (!scheme.building_defects_disclosed && !scheme.defect_bond_active) {
      score += 10;
    } else if (scheme.defect_bond_active) {
      score += 6;
    } else {
      score += 2;
    }

    const finalScore = Math.min(Math.max(Math.round(score * 10) / 10, 0), 100);

    await supabase
      .from("strata_schemes")
      .update({ strata_health_score: finalScore })
      .eq("id", scheme_id);

    await supabase
      .from("strata_listing_data")
      .update({ strata_health_score: finalScore })
      .eq("scheme_id", scheme_id);

    return new Response(JSON.stringify({ scheme_id, score: finalScore }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
