import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

const DEVICE_COLORS: Record<string, string> = {
  mobile: '#3B82F6',
  desktop: '#1F2937',
  tablet: '#9CA3AF',
  unknown: '#E5E7EB',
};

const DEVICE_ICONS: Record<string, typeof Smartphone> = {
  mobile: Smartphone,
  desktop: Monitor,
  tablet: Tablet,
};

interface Props {
  deviceSplit: Record<string, number>;
}

export function DeviceSplitPie({ deviceSplit }: Props) {
  const total = Object.values(deviceSplit).reduce((s, v) => s + v, 0) || 1;
  const data = Object.entries(deviceSplit).map(([name, value]) => ({ name, value }));

  const dominant = data.reduce((a, b) => (b.value > a.value ? b : a), { name: 'unknown', value: 0 });
  const dominantPct = Math.round((dominant.value / total) * 100);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">Devices</h3>
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={80} startAngle={90} endAngle={-270} paddingAngle={2}>
                {data.map((d) => (
                  <Cell key={d.name} fill={DEVICE_COLORS[d.name] ?? DEVICE_COLORS.unknown} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-foreground">{dominantPct}%</span>
            <span className="text-xs text-muted-foreground capitalize">{dominant.name}</span>
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          {data.map((d) => {
            const Icon = DEVICE_ICONS[d.name] ?? Smartphone;
            return (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DEVICE_COLORS[d.name] ?? DEVICE_COLORS.unknown }} />
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">{d.name} {Math.round((d.value / total) * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
