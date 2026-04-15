import { createClient } from "npm:@supabase/supabase-js@2";

const DOMAIN = "https://listhq.com.au";

const STATIC_PAGES = [
  { url: "/",                        changefreq: "daily",   priority: "1.0" },
  { url: "/for-agents",              changefreq: "monthly", priority: "0.8" },
  { url: "/agents",                  changefreq: "weekly",  priority: "0.8" },
  { url: "/rent",                    changefreq: "daily",   priority: "0.9" },
  { url: "/buy",                     changefreq: "daily",   priority: "0.9" },
  { url: "/suburbs",                 changefreq: "weekly",  priority: "0.7" },
  { url: "/help/agents",             changefreq: "monthly", priority: "0.5" },
  { url: "/help/buyers",             changefreq: "monthly", priority: "0.5" },
  { url: "/help/renters",            changefreq: "monthly", priority: "0.5" },
  { url: "/help/vendors",            changefreq: "monthly", priority: "0.5" },
  { url: "/strata",                  changefreq: "monthly", priority: "0.6" },
  { url: "/mortgage-calculator",     changefreq: "monthly", priority: "0.7" },
  { url: "/stamp-duty-calculator",   changefreq: "monthly", priority: "0.7" },
  { url: "/help",                    changefreq: "monthly", priority: "0.5" },
  { url: "/help/faq",                changefreq: "monthly", priority: "0.5" },
  { url: "/terms",                   changefreq: "yearly",  priority: "0.3" },
  { url: "/privacy",                 changefreq: "yearly",  priority: "0.3" },
];

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: string): string {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod     ? `    <lastmod>${lastmod}</lastmod>`         : "",
    changefreq  ? `    <changefreq>${changefreq}</changefreq>` : "",
    priority    ? `    <priority>${priority}</priority>`       : "",
    "  </url>",
  ].filter(Boolean).join("\n");
}

function toDate(ts?: string): string {
  if (ts) return ts.split("T")[0];
  return new Date().toISOString().split("T")[0];
}

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all data in parallel
    const [suburbsRes, propertiesRes, agentsRes] = await Promise.all([
      supabase
        .from("suburbs")
        .select("slug, state, updated_at")
        .order("name", { ascending: true })
        .limit(10000),

      supabase
        .from("properties")
        .select("id, slug, updated_at")
        .eq("is_active", true)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(10000),

      supabase
        .from("agents")
        .select("id, slug, updated_at")
        .eq("is_approved", true)
        .eq("is_public_profile", true)
        .order("updated_at", { ascending: false })
        .limit(5000),
    ]);

    const entries: string[] = [];

    // Static pages
    for (const page of STATIC_PAGES) {
      entries.push(urlEntry(`${DOMAIN}${page.url}`, undefined, page.changefreq, page.priority));
    }

    // Suburb pages — buy and rent variants
    for (const s of suburbsRes.data ?? []) {
      const state = s.state.toLowerCase();
      const lastmod = toDate(s.updated_at);
      entries.push(urlEntry(`${DOMAIN}/suburb/${state}/${s.slug}`, lastmod, "weekly", "0.8"));
      entries.push(urlEntry(`${DOMAIN}/buy/${state}/${s.slug}`,    lastmod, "weekly", "0.7"));
      entries.push(urlEntry(`${DOMAIN}/rent/${state}/${s.slug}`,   lastmod, "weekly", "0.6"));
    }

    // Property pages
    for (const p of propertiesRes.data ?? []) {
      entries.push(urlEntry(
        `${DOMAIN}/property/${p.slug ?? p.id}`,
        toDate(p.updated_at),
        "daily",
        "0.9",
      ));
    }

    // Agent profile pages
    for (const a of agentsRes.data ?? []) {
      entries.push(urlEntry(
        `${DOMAIN}/agent/${a.slug ?? a.id}`,
        toDate(a.updated_at),
        "weekly",
        "0.7",
      ));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${entries.join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    return new Response(
      `<!-- Sitemap generation error: ${error instanceof Error ? error.message : "unknown"} -->`,
      { status: 500, headers: { "Content-Type": "application/xml" } },
    );
  }
});
