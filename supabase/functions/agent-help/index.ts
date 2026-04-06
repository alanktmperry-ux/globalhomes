import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FAQ_CONTEXT = `You have access to the following ListHQ FAQ knowledge base. Use it to answer agent questions accurately.

GETTING STARTED:
- Create account: Click "Sign Up", register with email or Google, select role. Agents complete profile verification.
- Create listing: Dashboard → My Listings → Add Listing. Fill details, upload photos, set price, choose type (sale, rental, off-market, EOI, auction). Save as draft or publish.
- Listing types: For Sale, For Rent, Auction, Off-Market (private), Expression of Interest (EOI).
- Upload photos: Listing editor → Photos tab. Drag/drop or click. JPEG/PNG/WEBP up to 10MB. First photo = hero image.

OPEN HOMES & INSPECTIONS:
- Schedule: Listing detail → Open Homes tab → Schedule Open Home. Set date, time, capacity. Auto reminders 24h and 1h before. Waitlisting supported.
- Buyers register on property page, receive confirmation and reminders.

AUCTIONS:
- Setup: Listing detail → Auction tab → Setup Auction. Enter date, time, location, auctioneer details, reserve price (confidential).
- Live auction: "Start Live Auction" opens console to record bids, declare vendor bids, conclude with SOLD or Passed In.
- Bidder registration: Buyers complete 3-step form (personal details, photo ID, confirmation). Agent reviews and approves. Approved bidders get paddle number.
- Reserve price: Minimum vendor will accept. Never disclosed. When reached, auctioneer announces "on the market".
- Vendor bid: Bid by auctioneer on behalf of vendor, up to reserve. Must be announced. Labelled orange in live feed.
- Cooling-off does NOT apply to auction purchases.
- Deposit: Standard 10% payable on day via bank cheque or approved transfer.
- Live watch: Public can watch live bid feed without account. Real-time via Supabase Realtime.
- Multilingual: English, Mandarin, Cantonese, Vietnamese available on live auction page.

CRM & LEADS:
- CRM at Dashboard → Leads. Every enquiry, open home registration, saved-property interaction creates a lead.
- Add notes, set follow-up reminders, tag leads (hot/warm/cold), track journey. Shows last contact, source, lead score.
- Pipeline: Dashboard → Pipeline shows Kanban board (New, Contacted, Qualified, Offer, Closed).

PROFILE & REVIEWS:
- Profile: Dashboard → Profile. Add headshot, banner, headline, bio, licence number. Public at listhq.com.au/agent/[slug].
- Reviews: Clients submit via profile page. Verification email required. 1-5 stars + comment. Cannot delete, can report.

DOCUMENTS:
- Document Vault on each listing. Upload Contract of Sale, Section 32, inspection reports, floor plans.
- Control access: agent only, vendor, verified buyers, or public. Downloads logged.

CMA (Comparative Market Analysis):
- Dashboard → CMA Reports → New CMA. Enter subject property, select comparable sales, set valuation range, add commentary. Share via secure link or email.

VENDOR REPORTS:
- Each listing has Performance tab: views, enquiries, saves, attendance, traffic sources, device breakdown.
- Generate shareable vendor report link (read-only, no login required).

BILLING & SUBSCRIPTION:
- Monthly via Stripe. Dashboard → Billing to view plan, update payment, download invoices, cancel.
- If subscription lapses, listings stay visible but can't publish new or access premium features.

OFF-MARKET:
- Visible only to subscribers for that suburb. Dashboard → Off-Market to manage subscriber lists.
- Matching subscribers get email notification. Not in public search.

RENTAL / PROPERTY MANAGEMENT:
- Create listing with "For Rent" type. Set weekly rent, bond, available date, lease terms.
- Applications reviewed in PM Dashboard → Applications. Shortlist, approve, decline.

SUBURB INTELLIGENCE:
- Dashboard → Suburb Intelligence. Median price, days on market, clearance rate, trends, demographics, amenity scores.

SAVED SEARCH ALERTS:
- Buyers save searches and get notified of matching new listings. Agents can see matching buyer count before listing.

TECHNICAL:
- Supports latest Chrome, Safari, Firefox, Edge. Fully responsive web app (no native app needed).
- Add to home screen on iOS for app-like experience.
- Privacy: Australian Privacy Act 1988 compliant. Data on Australian servers. No third-party data selling.
- Delete account: Account Settings → Privacy → Delete Account. Deactivate listings first for agent accounts.

TRUST ACCOUNTING:
- ListHQ provides trust accounting record-keeping tools only. Does NOT hold or process trust money.
- Record receipts: Dashboard → Trust → Trust Ledger → New Receipt.
- Reconciliation: Dashboard → Trust → Reconciliation (monthly workflow).

CONTACT:
- Support email: support@listhq.com.au (response within 1 business day AEST).
- Bug reports: Email with subject "Bug Report" including steps, expected vs actual behaviour, screenshots.`;

const SYSTEM_PROMPT = `You are the ListHQ help assistant. Answer agent questions clearly and concisely. If the question is in another language, answer in that language. Use the FAQ context provided to give accurate answers. If you don't know the answer, say so honestly and suggest contacting support@listhq.com.au. Format responses with markdown for readability.

${FAQ_CONTEXT}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-help error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
