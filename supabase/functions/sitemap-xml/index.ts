import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://listhq.com.au";

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(
  loc: string,
  lastmod?: string,
  changefreq = "weekly",
  priority = "0.7"
): string {
  return [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().slice(0, 10);

    const staticUrls = [
      urlEntry(`${SITE_URL}/`, today, "daily", "1.0"),
      urlEntry(`${SITE_URL}/agents`, today, "daily", "0.9"),
      urlEntry(`${SITE_URL}/for-agents`, today, "monthly", "0.8"),
      urlEntry(`${SITE_URL}/privacy`, today, "monthly", "0.3"),
      urlEntry(`${SITE_URL}/terms`, today, "monthly", "0.3"),
    ];

    const { data: properties } = await supabase
      .from("properties")
      .select("id, updated_at, listing_type")
      .eq("status", "public")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(10000);

    const propertyUrls = (properties || []).map((p) =>
      urlEntry(
        `${SITE_URL}/property/${p.id}`,
        p.updated_at,
        "daily",
        p.listing_type === "sale" ? "0.8" : "0.7"
      )
    );

    const { data: agents } = await supabase
      .from("agents")
      .select("id, updated_at")
      .eq("onboarding_complete", true)
      .order("updated_at", { ascending: false })
      .limit(5000);

    const agentUrls = (agents || []).map((a) =>
      urlEntry(
        `${SITE_URL}/agent/${a.id}`,
        a.updated_at,
        "weekly",
        "0.6"
      )
    );

    const { data: agencies } = await supabase
      .from("agencies")
      .select("id, slug, updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000);

    const agencyUrls = (agencies || [])
      .filter((a) => a.slug)
      .map((a) =>
        urlEntry(
          `${SITE_URL}/agency/${xmlEscape(a.slug)}`,
          a.updated_at,
          "weekly",
          "0.6"
        )
      );

    const allUrls = [
      ...staticUrls,
      ...propertyUrls,
      ...agentUrls,
      ...agencyUrls,
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...allUrls,
      "</urlset>",
    ].join("\n");

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=14400, s-maxage=14400",
      },
    });
  } catch (error) {
    console.error("sitemap error:", error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
        },
      }
    );
  }
});
