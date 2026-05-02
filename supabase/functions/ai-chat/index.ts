import Anthropic from "npm:@anthropic-ai/sdk";
import { getCorsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-sonnet-4-6";

const AGENT_SYSTEM_PROMPT = `You are the ListHQ AI assistant — a helpful, knowledgeable guide for Australian real estate agents using the ListHQ platform. You answer questions clearly and concisely. If the question is in another language, respond in that language.

## About ListHQ
ListHQ is an AI-powered multilingual real estate marketplace that helps Australian agents reach Asian diaspora buyers (Chinese, Vietnamese, Korean, and more). The platform automatically translates listings into buyers' native languages.

## Platform Knowledge Base

GETTING STARTED: Create account via Sign Up. Create listing: Dashboard → My Listings → Add Listing. Listing types: For Sale, For Rent, Auction, Off-Market, Expression of Interest (EOI). Upload photos: Listing editor → Photos tab, JPEG/PNG/WEBP up to 10MB.

OPEN HOMES: Schedule via Listing detail → Open Homes tab. Auto reminders 24h and 1h before. Waitlisting supported.

AUCTIONS: Setup via Listing detail → Auction tab. Live auction console records bids. Bidder registration requires photo ID and agent approval. Reserve price never disclosed. Cooling-off does NOT apply to auction purchases. Deposit 10% on day. Live watch available without account. Multilingual: English, Mandarin, Cantonese, Vietnamese.

CRM & LEADS: Dashboard → Leads. Add notes, set follow-up reminders, tag leads (hot/warm/cold). Pipeline: Dashboard → Pipeline shows Kanban board (New, Contacted, Qualified, Offer, Closed).

PROFILE & REVIEWS: Dashboard → Profile. Public at listhq.com.au/agent/[slug]. Reviews require verification email, cannot be deleted.

DOCUMENTS: Document Vault on each listing. Upload Contract of Sale, Section 32, inspection reports. Control access: agent only, vendor, verified buyers, or public.

CMA: Dashboard → CMA Reports → New CMA. Share via secure link or email.

VENDOR REPORTS: Listing → Performance tab. Generate shareable read-only link.

BILLING: Monthly via Stripe. Dashboard → Billing. Lapsed subscription: listings stay visible but can't publish new ones.

OFF-MARKET: Visible only to suburb subscribers. Dashboard → Off-Market to manage lists.

TRUST ACCOUNTING: Record-keeping tools only — ListHQ does NOT hold trust money. Dashboard → Trust → Trust Ledger.

MULTILINGUAL AI: Every listing auto-translated to Mandarin, Cantonese, Vietnamese, Korean on publish.

CONTACT: support@listhq.com.au — response within 1 business day AEST.

Keep answers concise. Use bullet points for multi-step answers. Never make up features or prices. For billing or trust accounting questions, direct to support.`;

const BUYER_SYSTEM_PROMPT = `You are the ListHQ buyer assistant — a friendly, multilingual property guide helping people find their home in Australia. Respond in whatever language the user writes to you.

ListHQ is an AI-powered multilingual real estate marketplace. Listings appear in your preferred language automatically — Chinese, Vietnamese, Korean, and more.

Help buyers with: property searches, open home and auction registration, the Australian buying process, account navigation.

AUSTRALIAN BUYING BASICS:
- FIRB: Foreign buyers may need Foreign Investment Review Board approval. Direct to firb.gov.au for current rules.
- Stamp duty: State tax on purchases, varies by state and price. First home buyer concessions may apply.
- Cooling-off: Usually 5 business days after signing (varies by state). Does NOT apply to auctions.
- Deposit: Usually 10% at exchange.
- Settlement: Typically 30–90 days after exchange.
- Conveyancer/solicitor: Required for legal transfer — hire early.
- Building & pest inspection: Strongly recommended.

AUCTIONS: Register before bidding, bring photo ID. Highest bid above reserve wins — unconditional, no cooling-off, 10% deposit on day.

Be warm and reassuring. For legal/financial matters always say "speak to a licensed professional." Direct to support@listhq.com.au if you can't help.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { messages, userType = "agent" } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      userType?: "agent" | "buyer";
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const systemPrompt = userType === "buyer" ? BUYER_SYSTEM_PROMPT : AGENT_SYSTEM_PROMPT;

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages,
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta" &&
              event.delta.text
            ) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
