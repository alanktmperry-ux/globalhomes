const SOURCE_LABELS: Record<string, string> = {
  direct: 'Direct / Typed URL',
  search: 'Search Results',
  saved_search: 'Saved Search Alert',
  suburb: 'Suburb Profile Page',
  agent_profile: "Agent's Profile",
  external: 'External / Social',
};

const COLORS = ['hsl(217, 91%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(271, 91%, 65%)', 'hsl(38, 92%, 50%)', 'hsl(16, 90%, 55%)', 'hsl(330, 80%, 60%)'];

interface Props {
  viewSources: Record<string, number>;
}

export function TrafficSourceChart({ viewSources }: Props) {
  const entries = Object.entries(viewSources).sort(([, a], [, b]) => b - a);
  const max = entries.length > 0 ? entries[0][1] : 1;
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Traffic Sources</h3>
      <p className="text-xs text-muted-foreground mb-4">{total.toLocaleString()} total views</p>
      <div className="space-y-3">
        {entries.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 bg-muted rounded animate-pulse" style={{ width: `${100 - i * 20}%` }} />
            ))}
          </div>
        )}
        {entries.map(([source, count], i) => (
          <div key={source}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{SOURCE_LABELS[source] ?? source}</span>
              <span className="text-xs text-muted-foreground">{count.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(count / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
