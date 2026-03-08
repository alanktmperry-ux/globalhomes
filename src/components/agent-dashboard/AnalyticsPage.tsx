import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, DollarSign, Clock, Search } from 'lucide-react';
import DashboardHeader from './DashboardHeader';

const DOM_DATA = [
  { month: 'Jan', offMarket: 8, public: 28 },
  { month: 'Feb', offMarket: 6, public: 32 },
  { month: 'Mar', offMarket: 5, public: 25 },
  { month: 'Apr', offMarket: 4, public: 30 },
  { month: 'May', offMarket: 7, public: 22 },
  { month: 'Jun', offMarket: 3, public: 35 },
];

const TREND_DATA = [
  { week: 'W1', pool: 12, renovated: 8, granny: 5, views: 3 },
  { week: 'W2', pool: 15, renovated: 10, granny: 7, views: 6 },
  { week: 'W3', pool: 18, renovated: 12, granny: 4, views: 8 },
  { week: 'W4', pool: 14, renovated: 15, granny: 9, views: 5 },
];

const TOP_KEYWORDS = [
  { keyword: 'Pool', searches: 142, trend: '+18%' },
  { keyword: 'Renovated kitchen', searches: 98, trend: '+12%' },
  { keyword: 'Granny flat', searches: 76, trend: '+31%' },
  { keyword: 'Ocean view', searches: 64, trend: '+8%' },
  { keyword: 'Near station', searches: 58, trend: '+22%' },
  { keyword: 'North facing', searches: 45, trend: '+5%' },
];

const AnalyticsPage = () => {
  return (
    <div>
      <DashboardHeader title="Analytics" subtitle="Performance metrics & market insights" />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: <Clock size={16} />, label: 'Avg Days Off-Market', value: '5.3', sub: 'vs 28 public', color: 'text-success' },
            { icon: <DollarSign size={16} />, label: 'Off-Market Commission', value: '2.1%', sub: 'vs 1.8% public', color: 'text-primary' },
            { icon: <TrendingUp size={16} />, label: 'Off-Market Premium', value: '+8.2%', sub: 'higher sale price', color: 'text-success' },
            { icon: <Search size={16} />, label: 'Voice Searches (Area)', value: '347', sub: 'this month', color: 'text-primary' },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <span className={s.color}>{s.icon}</span>
                <span className="text-[10px]">{s.label}</span>
              </div>
              <p className="font-display text-2xl font-extrabold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Days on Market comparison */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-display text-sm font-bold mb-4">Off-Market vs Public — Days on Market</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DOM_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="offMarket" name="Off-Market" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="public" name="Public" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Voice Search Trends */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-display text-sm font-bold mb-4">Voice Search Trends (Your Area)</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={TREND_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="pool" name="Pool" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="renovated" name="Renovated" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="granny" name="Granny flat" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Keywords */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-display text-sm font-bold mb-3">Top Performing Keywords</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Keyword</th>
                  <th className="text-center p-2">Searches</th>
                  <th className="text-right p-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {TOP_KEYWORDS.map((k, i) => (
                  <tr key={k.keyword} className="border-b border-border last:border-0">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2 font-medium">{k.keyword}</td>
                    <td className="p-2 text-center">{k.searches}</td>
                    <td className="p-2 text-right text-success font-semibold">{k.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commission Calculator */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <h3 className="font-display text-sm font-bold mb-2 flex items-center gap-1.5">
            <DollarSign size={16} className="text-primary" /> Commission Calculator
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Off-Market Average</p>
              <p className="font-display text-3xl font-extrabold text-primary">2.1%</p>
              <p className="text-xs text-muted-foreground mt-1">On $800K = <strong>$16,800</strong></p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Public Average</p>
              <p className="font-display text-3xl font-extrabold text-muted-foreground">1.8%</p>
              <p className="text-xs text-muted-foreground mt-1">On $800K = <strong>$14,400</strong></p>
            </div>
          </div>
          <p className="text-center text-xs text-success font-semibold mt-3">
            Off-market earns you $2,400 more per sale on average
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
