import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

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

    // Properties with slug-based URLs
    const { data: properties } = await supabase
      .from("properties")
      .select("id, slug, updated_at, listing_type")
      .eq("status", "public")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(10000);

    const propertyUrls = (properties || []).map((p) =>
      urlEntry(
        `${SITE_URL}/property/${p.slug || p.id}`,
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

    // Suburb landing pages (deduplicated)
    const { data: suburbs } = await supabase
      .from("properties")
      .select("suburb, state")
      .eq("is_active", true)
      .not("suburb", "is", null);

    const suburbSet = new Set<string>();
    const suburbUrls: string[] = [];
    for (const s of suburbs || []) {
      if (!s.suburb || !s.state) continue;
      const key = `${s.suburb.toLowerCase()}-${s.state.toLowerCase()}`;
      if (suburbSet.has(key)) continue;
      suburbSet.add(key);
      const suburbSlug = s.suburb.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const stateSlug = s.state.toLowerCase();
      suburbUrls.push(
        urlEntry(`${SITE_URL}/buy/${stateSlug}/${suburbSlug}`, today, "daily", "0.8")
      );
    }

    // School pages
    const { data: schoolsData } = await supabase
      .from("schools")
      .select("name, state")
      .order("enrolment", { ascending: false })
      .limit(2000);

    const schoolUrls = (schoolsData || []).map((s: any) => {
      const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const st = s.state.toLowerCase();
      return urlEntry(`${SITE_URL}/school/${st}/${slug}`, undefined, "monthly", "0.6");
    });

    const allUrls = [
      ...staticUrls,
      ...propertyUrls,
      ...agentUrls,
      ...agencyUrls,
      ...suburbUrls,
      ...schoolUrls,
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
