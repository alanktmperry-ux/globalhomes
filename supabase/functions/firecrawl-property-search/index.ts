import { getCorsHeaders } from "../_shared/cors.ts";
interface ParsedListing {
  title: string;
  price: number;
  priceFormatted: string;
  address: string;
  beds: number;
  baths: number;
  parking: number;
  sqm: number;
  imageUrl: string;
  description: string;
  propertyType: string;
  source: string;
  sourceUrl: string;
}

function extractNumber(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  return match ? parseInt(match[1], 10) : 0;
}

function parsePrice(text: string): { price: number; formatted: string } {
  // Match patterns like $1,200,000 or $850K or $1.2M
  const priceMatch = text.match(/\$[\d,]+(?:\.\d+)?(?:\s*[kKmM])?/);
  if (!priceMatch) return { price: 0, formatted: '' };

  let raw = priceMatch[0];
  let formatted = raw;
  let num = parseFloat(raw.replace(/[$,]/g, ''));

  if (/[kK]$/i.test(raw)) num *= 1000;
  if (/[mM]$/i.test(raw)) num *= 1_000_000;

  return { price: Math.round(num), formatted };
}

function parseListingsFromMarkdown(markdown: string, sourceUrl: string): ParsedListing[] {
  const listings: ParsedListing[] = [];

  // Split by common listing patterns — headings, list items, or card-like blocks
  const blocks = markdown.split(/(?=^#{1,3}\s|\n---\n|\n\n(?=\d+\.\s))/m);

  for (const block of blocks) {
    if (block.trim().length < 30) continue;

    const { price, formatted } = parsePrice(block);
    if (price <= 0) continue; // Skip blocks without prices — likely not listings

    const titleMatch = block.match(/^#{1,3}\s*(.+)/m) || block.match(/\*\*(.+?)\*\*/);
    const title = titleMatch?.[1]?.replace(/[#*[\]]/g, '').trim() || '';
    if (!title || title.length < 5) continue;

    // Extract address — look for street patterns
    const addressMatch = block.match(/\d+[A-Za-z]?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ct|Court|Pl|Place|Ln|Lane|Blvd|Cres|Crescent|Way|Pde|Parade|Tce|Terrace)\b[^)\n]*/i);
    const address = addressMatch?.[0]?.trim() || title;

    const beds = extractNumber(block, /(\d+)\s*(?:bed(?:room)?s?|br)\b/i);
    const baths = extractNumber(block, /(\d+)\s*(?:bath(?:room)?s?|ba)\b/i);
    const parking = extractNumber(block, /(\d+)\s*(?:car|parking|garage)\b/i);
    const sqm = extractNumber(block, /(\d+)\s*(?:sqm|m²|sq\.?\s*m)\b/i);

    // Property type detection
    let propertyType = 'house';
    const lower = block.toLowerCase();
    if (/apartment|unit|flat/i.test(lower)) propertyType = 'apartment';
    else if (/townhouse/i.test(lower)) propertyType = 'townhouse';
    else if (/villa/i.test(lower)) propertyType = 'villa';
    else if (/land|block/i.test(lower)) propertyType = 'land';

    // Extract image URLs
    const imgMatch = block.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    const imageUrl = imgMatch?.[1] || '';

    // Build description from remaining text
    const description = block
      .replace(/^#{1,3}\s*.+/m, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .trim()
      .slice(0, 300);

    listings.push({
      title,
      price,
      priceFormatted: formatted || `$${price.toLocaleString()}`,
      address,
      beds,
      baths,
      parking,
      sqm,
      imageUrl,
      description,
      propertyType,
      source: 'Google',
      sourceUrl,
    });
  }

  return listings;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10, listing_type = 'sale' } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = listing_type === 'rent'
      ? `${query} rental property for rent weekly price`
      : `${query} property for sale listing price`;
    console.log('Firecrawl property search:', searchQuery);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit,
        scrapeOptions: { formats: ['markdown'] },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Firecrawl request failed (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse listings from search results
    const allListings: ParsedListing[] = [];
    const results = data.data || data.results || [];

    for (const result of results) {
      const markdown = result.markdown || result.description || '';
      const url = result.url || '';
      const parsed = parseListingsFromMarkdown(markdown, url);
      allListings.push(...parsed);
    }

    // Deduplicate by title similarity
    const seen = new Set<string>();
    const unique = allListings.filter((l) => {
      const key = l.title.toLowerCase().replace(/\s+/g, '').slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`Parsed ${unique.length} unique listings from ${results.length} search results`);

    return new Response(
      JSON.stringify({
        success: true,
        listings: unique,
        resultCount: unique.length,
        searchResultCount: results.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in firecrawl property search:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
