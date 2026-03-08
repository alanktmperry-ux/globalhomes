import { User, Mail, Phone, Shield, Bell, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import DashboardHeader from './DashboardHeader';

const SettingsPage = () => {
  return (
    <div>
      <DashboardHeader title="Settings" subtitle="Manage your agent profile and preferences" />

      <div className="p-4 sm:p-6 max-w-2xl space-y-6">
        {/* Profile */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5"><User size={14} /> Agent Profile</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input defaultValue="Jane Smith" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs">Agency</Label>
              <Input defaultValue="Ray White" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input defaultValue="jane@raywhite.com" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input defaultValue="+61 412 345 678" className="bg-secondary border-border" />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5"><Bell size={14} /> Notifications</h3>
          {[
            { label: 'New voice match alerts', desc: 'When a buyer voice search matches your listing', default: true },
            { label: 'Lead qualification updates', desc: 'When a lead provides pre-approval or contact info', default: true },
            { label: 'Network co-broke requests', desc: 'When another agent wants to bring a buyer', default: true },
            { label: 'Weekly analytics digest', desc: 'Performance summary every Monday', default: false },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch defaultChecked={n.default} />
            </div>
          ))}
        </div>

        {/* Territory */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5"><Globe size={14} /> Territory</h3>
          <p className="text-xs text-muted-foreground">Your primary suburbs for voice lead matching</p>
          <div className="flex flex-wrap gap-1.5">
            {['Berwick', 'Narre Warren', 'Officer', 'Clyde North', 'Pakenham'].map((s) => (
              <span key={s} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">{s}</span>
            ))}
          </div>
          <Button variant="outline" size="sm" className="text-xs">Edit Suburbs</Button>
        </div>

        <Button className="w-full">Save Changes</Button>
      </div>
    </div>
  );
};

export default SettingsPage;
