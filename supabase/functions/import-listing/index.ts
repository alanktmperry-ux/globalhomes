import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function detectPortal(url: string): string {
  if (/realestate\.com\.au/i.test(url)) return "rea";
  if (/domain\.com\.au/i.test(url)) return "domain";
  if (/homely\.com\.au/i.test(url)) return "homely";
  if (/allhomes\.com\.au/i.test(url)) return "allhomes";
  return "unknown";
}

function parsePrice(text: string): { min: number; max: number; formatted: string; display: string } {
  const t = text.replace(/\s+/g, ' ');
  const rangeMatch = t.match(/\$?([\d,]+\.?\d*)\s*[kKmM]?\s*[-–to]\s*\$?([\d,]+\.?\d*)\s*([kKmM]?)/i);
  if (rangeMatch) {
    const mult = (s: string) => /[kK]/.test(s) ? 1000 : /[mM]/.test(s) ? 1_000_000 : 1;
    const min = parseFloat(rangeMatch[1].replace(/,/g, '')) * mult(rangeMatch[3] || '');
    const max = parseFloat(rangeMatch[2].replace(/,/g, '')) * mult(rangeMatch[3] || '');
    const fmt = (v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(2).replace(/\.?0+$/, '')}M` : `$${(v/1000).toFixed(0)}K`;
    return { min, max, formatted: `${fmt(min)} – ${fmt(max)}`, display: 'range' };
  }
  const single = t.match(/\$?([\d,]+\.?\d*)\s*([kKmM]?)/i);
  if (single) {
    const mult = /[kK]/.test(single[2]) ? 1000 : /[mM]/.test(single[2]) ? 1_000_000 : 1;
    const val = parseFloat(single[1].replace(/,/g, '')) * mult;
    if (val < 50000) return { min: 0, max: 0, formatted: '', display: 'contact' };
    const fmt = (v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(2).replace(/\.?0+$/, '')}M` : `$${(v/1000).toFixed(0)}K`;
    return { min: Math.round(val * 0.95), max: val, formatted: fmt(val), display: 'exact' };
  }
  return { min: 0, max: 0, formatted: '', display: 'contact' };
}

function extractNumber(text: string, pattern: RegExp): number {
  const m = text.match(pattern);
  return m ? parseInt(m[1], 10) : 0;
}

function parsePropertyType(text: string): string {
  const t = text.toLowerCase();
  if (/\bapartment\b|\bunit\b|\bflat\b/.test(t)) return 'Apartment';
  if (/\btownhouse\b|\btown house\b/.test(t)) return 'Townhouse';
  if (/\bland\b|\bblock\b|\bvacant\b/.test(t)) return 'Land';
  if (/\bcommercial\b|\boffice\b|\bwarehouse\b|\bshop\b/.test(t)) return 'Commercial';
  return 'House';
}

function parseFromMarkdown(markdown: string, url: string) {
  const portal = detectPortal(url);
  const addressPatterns = [
    /^#{1,2}\s*(.+?\d{4})/m,
    /(\d+[A-Za-z]?\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Lane|Ln|Crescent|Cres|Way|Parade|Pde|Terrace|Tce|Boulevard|Blvd|Circuit|Cct|Close|Cl)[,\s]+[A-Za-z\s]+\s+\w{2,3}\s+\d{4})/i,
  ];
  let fullAddress = '';
  for (const pat of addressPatterns) {
    const m = markdown.match(pat);
    if (m) { fullAddress = m[1].trim(); break; }
  }
  let address = '', suburb = '', state = '';
  const addrParts = fullAddress.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2,3})\s*(\d{4})?$/);
  if (addrParts) {
    address = addrParts[1].trim();
    suburb = addrParts[2].trim();
    state = addrParts[3].trim();
  } else {
    const stateMatch = fullAddress.match(/\b(VIC|NSW|QLD|WA|SA|TAS|ACT|NT)\b/);
    if (stateMatch) state = stateMatch[1];
    address = fullAddress.split(',')[0]?.trim() || fullAddress;
    suburb = fullAddress.split(',')[1]?.trim() || '';
  }
  const priceSection = markdown.match(/(?:price|asking|offers?|guide)[:\s]*(\$[\d,\.]+\s*[kKmM]?(?:\s*[-–]\s*\$[\d,\.]+\s*[kKmM]?)?)/i)
    || markdown.match(/(\$[\d,\.]+\s*[kKmM]?(?:\s*[-–]\s*\$[\d,\.]+\s*[kKmM]?)?)/);
  const priceData = priceSection ? parsePrice(priceSection[1]) : { min: 0, max: 0, formatted: '', display: 'contact' };
  const beds = extractNumber(markdown, /(\d+)\s*(?:bed(?:room)?s?|br)\b/i);
  const baths = extractNumber(markdown, /(\d+)\s*(?:bath(?:room)?s?|ba)\b/i);
  const cars = extractNumber(markdown, /(\d+)\s*(?:car(?:s|port)?|garage|parking)\b/i);
  const sqm = extractNumber(markdown, /(\d+)\s*(?:sqm|m²|sq\.?\s*m|square\s*met)/i);
  const landSize = extractNumber(markdown, /(?:land|block|lot)[:\s]*(\d+)\s*(?:sqm|m²)/i);
  const propertyType = parsePropertyType(markdown + ' ' + url);
  const listingType = /for\s+(?:rent|lease)|per\s+week|\$\d+\s*pw|rental/i.test(markdown) ? 'rent' : 'sale';
  const descMatch = markdown.match(/(?:about this|property description|overview)[:\s\n]+([\s\S]{100,800}?)(?:\n#{1,3}|\n\n\n|features:|$)/i);
  const description = descMatch
    ? descMatch[1].trim().replace(/\n{3,}/g, '\n\n').slice(0, 600)
    : markdown.replace(/^#{1,3}.+$/gm, '').replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[.*?\]\(.*?\)/g, '').trim().slice(0, 600);
  const features: string[] = [];
  const featureSection = markdown.match(/(?:features?|inclusions?|highlights?)[:\s\n]+((?:[*\-]\s*.+\n?){2,})/i);
  if (featureSection) {
    featureSection[1].split('\n').forEach(line => {
      const feat = line.replace(/^[\s*\-]+/, '').trim();
      if (feat.length > 3 && feat.length < 60) features.push(feat);
    });
  }
  const imgMatches = [...markdown.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g)];
  const photos = imgMatches
    .map(m => m[1])
    .filter(u => /\.(jpg|jpeg|png|webp)/i.test(u) || /resizer|images|media/i.test(u))
    .slice(0, 12);
  return { address, suburb, state, listingType, priceMin: priceData.min, priceMax: priceData.max, priceFormatted: priceData.formatted, priceDisplay: priceData.display, propertyType, beds, baths, cars, sqm, landSize, description, features, photos, sourceUrl: url, portal };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: "URL is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const portal = detectPortal(url);
    if (!['rea','domain','homely','allhomes'].includes(portal)) {
      return new Response(JSON.stringify({ error: "Only realestate.com.au, domain.com.au, homely.com.au, and allhomes.com.au URLs are supported." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!scrapeRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch listing page. Check the URL is correct and publicly accessible." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    if (!markdown || markdown.length < 100) {
      return new Response(JSON.stringify({ error: "Could not read listing content. Make sure the URL links directly to a property listing." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = parseFromMarkdown(markdown, url);
    if (!parsed.address && !parsed.suburb) {
      return new Response(JSON.stringify({ error: "Could not extract property details from this URL. Try copying the direct listing URL." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: true, listing: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Import failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
