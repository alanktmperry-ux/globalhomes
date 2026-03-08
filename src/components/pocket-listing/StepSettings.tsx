import { Eye, EyeOff, Users, Shield, DollarSign, Clock, HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ListingDraft } from './PocketListingForm';

interface Props {
  draft: ListingDraft;
  update: (p: Partial<ListingDraft>) => void;
}

const VISIBILITIES = [
  { key: 'whisper', icon: <EyeOff size={16} />, label: 'Whisper', desc: 'Invite only' },
  { key: 'coming-soon', icon: <Eye size={16} />, label: 'Coming Soon', desc: 'Registered buyers' },
  { key: 'public', icon: <Users size={16} />, label: 'Public', desc: 'Full market' },
] as const;

const EXCLUSIVE_OPTIONS = [7, 14, 30];

const BUYER_REQS = [
  { key: 'none', label: 'None' },
  { key: 'pre-approved', label: 'Pre-approved' },
  { key: 'cash', label: 'Cash buyers' },
  { key: 'investors', label: 'Investors' },
];

const InfoTip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle size={12} className="text-muted-foreground cursor-help" />
    </TooltipTrigger>
    <TooltipContent className="max-w-[200px] text-xs">{text}</TooltipContent>
  </Tooltip>
);

const StepSettings = ({ draft, update }: Props) => {
  return (
    <div className="space-y-6">
      {/* Visibility */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Label className="text-sm font-semibold">Listing Visibility</Label>
          <InfoTip text="Off-market listings get 8-15% higher sale prices and maintain seller privacy." />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {VISIBILITIES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => update({ visibility: v.key })}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all text-center ${
                draft.visibility === v.key
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-secondary border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {v.icon}
              <span className="text-xs font-semibold">{v.label}</span>
              <span className="text-[10px] opacity-70">{v.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Exclusive Period */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Label className="text-sm font-semibold">Exclusive Period</Label>
          <InfoTip text="Days your listing stays exclusively on this platform before going to other portals." />
        </div>
        <div className="flex gap-2">
          {EXCLUSIVE_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => update({ exclusiveDays: d })}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                draft.exclusiveDays === d
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-foreground border-border'
              }`}
            >
              <Clock size={12} /> {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Buyer Requirements */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Buyer Requirements</Label>
        <div className="flex flex-wrap gap-1.5">
          {BUYER_REQS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => update({ buyerRequirements: b.key })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                draft.buyerRequirements === b.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-foreground border-border'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Protection */}
      <div className="bg-secondary/50 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-primary" />
          <Label className="text-sm font-semibold">Agent Protection</Label>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Show my contact details?</span>
          <Switch
            checked={draft.showContact}
            onCheckedChange={(v) => update({ showContact: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Allow co-broke (other agents bring buyers)?</span>
          <Switch
            checked={draft.allowCoBroke}
            onCheckedChange={(v) => update({ allowCoBroke: v })}
          />
        </div>

        <div>
          <Label className="text-xs mb-1 block flex items-center gap-1">
            <DollarSign size={12} /> Auto-decline offers below
          </Label>
          <Input
            type="number"
            value={draft.autoDeclineBelow || ''}
            onChange={(e) => update({ autoDeclineBelow: Number(e.target.value) || 0 })}
            placeholder="e.g. 750000"
            className="bg-card border-border"
          />
        </div>
      </div>
    </div>
  );
};

export default StepSettings;
