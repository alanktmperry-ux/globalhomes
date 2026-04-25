import { useEffect, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Globe2, Eye, Languages } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/AuthProvider";
import { capture } from "@/shared/lib/posthog";
import { SuburbAutocomplete } from "@/features/buyer-pool/components/SuburbAutocomplete";
import { LanguageBarChart } from "@/features/buyer-pool/components/LanguageBarChart";
import { ShareButtons } from "@/features/buyer-pool/components/ShareButtons";
import {
  getSuburbBySlug,
  getTopFallbackSuburbs,
  logLookup,
} from "@/features/buyer-pool/api";
import type { SuburbSuggestion } from "@/features/buyer-pool/types";

const SAMPLE_LISTING_ID = "efc647c7-9209-4929-a964-a84dfba284d5";

export default function BuyerPoolPage() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const resultRef = useRef<HTMLDivElement>(null);
  const loggedRef = useRef<string | null>(null);

  // Page-mount event
  useEffect(() => {
    capture("pool_calc_loaded");
  }, []);

  const {
    data: suburb,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["suburb-detail", slug],
    queryFn: () => (slug ? getSuburbBySlug(slug) : Promise.resolve(null)),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const { data: fallbacks = [] } = useQuery({
    queryKey: ["suburb-fallbacks"],
    queryFn: getTopFallbackSuburbs,
    enabled: !!slug && !isLoading && !suburb,
    staleTime: 5 * 60 * 1000,
  });

  // Result-shown event + lookup logging
  useEffect(() => {
    if (!suburb) return;
    if (loggedRef.current === suburb.sal_code) return;
    loggedRef.current = suburb.sal_code;

    capture("pool_calc_result_shown", {
      suburb_name: suburb.suburb_name,
      non_english_pct: suburb.non_english_pct,
      top_language: suburb.top_languages?.[0]?.lang ?? null,
      state: suburb.state,
    });

    logLookup({
      suburb_searched: suburb.suburb_name,
      sal_code_matched: suburb.sal_code,
    });

    // smooth scroll into view
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [suburb]);

  // Log "no match" lookups too
  useEffect(() => {
    if (slug && !isLoading && !suburb && loggedRef.current !== `miss:${slug}`) {
      loggedRef.current = `miss:${slug}`;
      logLookup({ suburb_searched: slug, sal_code_matched: null });
    }
  }, [slug, isLoading, suburb]);

  function handleSelect(s: SuburbSuggestion) {
    capture("pool_calc_searched", { suburb_name: s.suburb_name });
    navigate(`/buyer-pool/${s.suburb_slug}`);
  }

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !suburb) return "";
    return `${window.location.origin}/buyer-pool/${suburb.suburb_slug}`;
  }, [suburb]);

  const pageTitle = suburb
    ? `${suburb.non_english_pct}% of ${suburb.suburb_name} buyers don't search in English | ListHQ`
    : "Buyer Pool Calculator — How many buyers can't see your listings? | ListHQ";

  const pageDesc = suburb
    ? `${suburb.non_english_count.toLocaleString("en-AU")} people in ${suburb.suburb_name} (${suburb.state}) speak a language other than English at home. See the full breakdown — free, no signup. ABS Census 2021 data.`
    : "Free tool. Enter your Australian suburb. See what % of buyer demand you're missing because your listings are English-only. Powered by ABS Census 2021 data.";

  const isAgentSession = !!user;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link
          rel="canonical"
          href={`https://listhq.com.au/buyer-pool${slug ? `/${slug}` : ""}`}
        />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
        {/* HERO */}
        <section className="px-4 pt-10 pb-12 md:pt-16 md:pb-16">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Free · ABS Census 2021
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 leading-[1.1]">
              How many buyers can&apos;t see your listings?
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
              1 in 5 Australians speaks a language other than English at home.
              Check what % of buyers in your suburb you&apos;re invisible to.
            </p>

            <div className="max-w-xl mx-auto">
              <SuburbAutocomplete onSelect={handleSelect} />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Free
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                No signup
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                ABS Census 2021 data
              </span>
            </div>
          </div>
        </section>

        {/* RESULT */}
        {slug && (
          <section ref={resultRef} className="px-4 pb-16 scroll-mt-20">
            <div className="max-w-3xl mx-auto">
              {isLoading && (
                <Card className="p-8 text-center text-muted-foreground">
                  Loading suburb data…
                </Card>
              )}

              {!isLoading && !suburb && (
                <Card className="p-6 sm:p-8">
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    We don&apos;t have data for that suburb yet
                  </h2>
                  <p className="text-muted-foreground mb-5">
                    Try one of these high-multicultural suburbs:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {fallbacks.map((f) => (
                      <Link
                        key={f.suburb_slug}
                        to={`/buyer-pool/${f.suburb_slug}`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-background hover:bg-accent transition-colors text-sm"
                      >
                        <span className="font-medium">{f.suburb_name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {f.state}
                        </Badge>
                        {f.non_english_pct != null && (
                          <span className="text-xs text-muted-foreground">
                            {f.non_english_pct}%
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </Card>
              )}

              {!isLoading && suburb && (
                <div className="space-y-8 animate-fade-in">
                  {/* Headline stat */}
                  <Card className="p-6 sm:p-10 shadow-[var(--shadow-elevated)]">
                    <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-foreground">
                      <span className="text-destructive">
                        {suburb.non_english_pct}%
                      </span>{" "}
                      of {suburb.suburb_name} residents speak a language other
                      than English at home.
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
                      That&apos;s{" "}
                      <strong className="text-foreground">
                        {suburb.non_english_count.toLocaleString("en-AU")}
                      </strong>{" "}
                      people in {suburb.suburb_name} you can reach in their
                      first language with ListHQ — and your competitors
                      can&apos;t.
                    </p>

                    <div className="mt-8">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                        Top languages spoken at home
                      </h3>
                      <LanguageBarChart languages={suburb.top_languages ?? []} />
                    </div>
                  </Card>

                  {/* What this means */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="p-5">
                      <Eye className="h-6 w-6 text-destructive mb-3" />
                      <h4 className="font-semibold text-foreground mb-2">
                        {suburb.non_english_pct}% of buyer enquiries you&apos;re
                        invisible to
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Buyers who don&apos;t search in English use Google in
                        their own language and never see English-only
                        listings.
                      </p>
                    </Card>
                    <Card className="p-5">
                      <Globe2 className="h-6 w-6 text-primary mb-3" />
                      <h4 className="font-semibold text-foreground mb-2">
                        {suburb.top_languages?.[0]?.lang ?? "—"} is the #1
                        non-English language in {suburb.suburb_name}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Spoken at home by{" "}
                        {(
                          suburb.top_languages?.[0]?.count ?? 0
                        ).toLocaleString("en-AU")}{" "}
                        residents according to ABS Census 2021.
                      </p>
                    </Card>
                    <Card className="p-5">
                      <Languages className="h-6 w-6 text-primary mb-3" />
                      <h4 className="font-semibold text-foreground mb-2">
                        ListHQ translates your listings into 24 languages
                        automatically
                      </h4>
                      <Link
                        to={`/property/${SAMPLE_LISTING_ID}`}
                        className="text-sm font-medium text-primary inline-flex items-center gap-1 hover:gap-2 transition-all"
                      >
                        See an example listing
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Card>
                  </div>

                  {/* Agent CTA — only if no agent session */}
                  {!isAgentSession && (
                    <Card className="p-6 sm:p-8 bg-primary/5 border-primary/20">
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
                        Are you an agent in {suburb.suburb_name}?
                      </h3>
                      <p className="text-muted-foreground mb-5 leading-relaxed">
                        List once on ListHQ. Reach every buyer in{" "}
                        {suburb.suburb_name} in their first language. Free for
                        the first 90 days.
                      </p>
                      <Button
                        size="lg"
                        asChild
                        onClick={() =>
                          capture("pool_calc_agent_cta_clicked", {
                            suburb_name: suburb.suburb_name,
                          })
                        }
                      >
                        <Link to="/agents/login?mode=signup">
                          Get started free
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </Card>
                  )}

                  {/* Share */}
                  <Card className="p-6">
                    <h3 className="font-semibold text-foreground mb-1">
                      Share this with an agent who needs to see it.
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {suburb.suburb_name} agents are leaving{" "}
                      {suburb.non_english_pct}% of the buyer pool on the table.
                    </p>
                    <ShareButtons
                      url={shareUrl}
                      shareText={`${suburb.non_english_pct}% of ${suburb.suburb_name} residents speak a language other than English at home. See the buyer pool you're missing:`}
                    />
                  </Card>
                </div>
              )}

              {isError && (
                <Card className="p-6 text-center text-destructive">
                  Something went wrong loading suburb data. Please try again.
                </Card>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
