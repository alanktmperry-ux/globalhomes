import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/shared/lib/i18n";

type Props = {
  parsedFilters: {
    intent?: string;
    suburb?: string;
    bedsMin?: number;
    bedsMax?: number;
    bathsMin?: number;
    parkingMin?: number;
    minPrice?: number;
    maxPrice?: number;
    propertyTypes?: string[];
    features?: string[];
    rawQuery?: string;
  };
  resultCount: number;
};

function formatPrice(n: number): string {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : `$${(n / 1_000).toFixed(0)}k`;
}

export function SmartSearchBanner({ parsedFilters, resultCount }: Props) {
  const { t } = useTranslation();

  const hasAnyFilter = Boolean(
    parsedFilters.suburb ||
      parsedFilters.bedsMin ||
      parsedFilters.maxPrice ||
      parsedFilters.propertyTypes?.length ||
      parsedFilters.rawQuery,
  );
  if (!hasAnyFilter) return null;
  if (resultCount > 0 && !(resultCount < 3 && parsedFilters.suburb)) return null;

  const params = new URLSearchParams();
  params.set("source", "search");
  if (parsedFilters.intent) params.set("intent", parsedFilters.intent);
  if (parsedFilters.suburb) params.set("suburb", parsedFilters.suburb);
  if (parsedFilters.bedsMin != null) params.set("beds_min", String(parsedFilters.bedsMin));
  if (parsedFilters.bedsMax != null) params.set("beds_max", String(parsedFilters.bedsMax));
  if (parsedFilters.bathsMin != null) params.set("baths_min", String(parsedFilters.bathsMin));
  if (parsedFilters.parkingMin != null) params.set("parking_min", String(parsedFilters.parkingMin));
  if (parsedFilters.minPrice != null) params.set("min_price", String(parsedFilters.minPrice));
  if (parsedFilters.maxPrice != null) params.set("max_price", String(parsedFilters.maxPrice));
  if (parsedFilters.propertyTypes?.length) params.set("type", parsedFilters.propertyTypes.join(","));
  if (parsedFilters.features?.length) params.set("features", parsedFilters.features.join(","));
  if (parsedFilters.rawQuery) params.set("raw_q", parsedFilters.rawQuery);

  const haloHref = `/halo/new?${params.toString()}`;

  const summaryParts: string[] = [];
  if (parsedFilters.bedsMin) summaryParts.push(`${parsedFilters.bedsMin}-${t("bed")}`);
  if (parsedFilters.parkingMin) summaryParts.push(`${parsedFilters.parkingMin}-${t("car")}`);
  if (parsedFilters.propertyTypes?.[0]) summaryParts.push(t(parsedFilters.propertyTypes[0]));
  if (parsedFilters.suburb) summaryParts.push(`${t("in")} ${parsedFilters.suburb}`);
  if (parsedFilters.maxPrice) summaryParts.push(`${t("under")} ${formatPrice(parsedFilters.maxPrice)}`);
  const summary = summaryParts.join(" ").trim() || (parsedFilters.rawQuery ?? "");

  const headline =
    resultCount === 0
      ? `${t("No matches today for")} ${summary}.`
      : `${t("Only")} ${resultCount} ${t("match for")} ${summary}.`;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-6 md:p-8 my-6">
      <div className="flex flex-col md:flex-row gap-5 md:gap-6">
        <div className="shrink-0">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">{headline}</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
            {t(
              "Want agents to find this for you? Post your criteria as a Halo. Pre-qualified agents reach out when they have a match — usually within hours. Free to post.",
            )}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to={haloHref}>
                {t("Post as a Halo")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("Free to post · No account upgrade needed")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
