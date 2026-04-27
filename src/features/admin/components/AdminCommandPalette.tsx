import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Megaphone,
  Headphones,
  BarChart2,
  Settings,
  ShoppingBag,
  RefreshCw,
  Download,
  UserPlus,
  ClipboardCheck,
  Building2,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

const NAV_ITEMS = [
  { label: 'Command Centre', to: '/admin/overview', icon: LayoutDashboard },
  { label: 'Approvals', to: '/admin/approvals', icon: ClipboardCheck },
  { label: 'Agents', to: '/admin/agents', icon: Users },
  { label: 'Listings', to: '/admin/listings', icon: ShoppingBag },
  { label: 'Revenue', to: '/admin/revenue', icon: DollarSign },
  { label: 'Outreach', to: '/admin/outreach', icon: Megaphone },
  { label: 'Support', to: '/admin/support', icon: Headphones },
  { label: 'Buyers', to: '/admin/buyers', icon: BarChart2 },
  { label: 'Partners', to: '/admin/partners', icon: Building2 },
  { label: 'System', to: '/admin/system', icon: Settings },
] as const;

type AgentResult = { id: string; name: string; email: string };

const itemCls =
  'flex items-center gap-2.5 rounded-lg cursor-pointer aria-selected:bg-stone-100 text-[14px] text-stone-700 py-2.5 px-2';

export default function AdminCommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);

  // ⌘K toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Sidebar event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('admin:open-command-palette', handler);
    return () => window.removeEventListener('admin:open-command-palette', handler);
  }, []);

  // Reset search on close
  useEffect(() => {
    if (!open) {
      setSearchVal('');
      setAgentResults([]);
    }
  }, [open]);

  // Live agent search (debounced)
  useEffect(() => {
    if (searchVal.length < 2) {
      setAgentResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const safe = searchVal.replace(/[%,]/g, ' ').trim();
      if (!safe) return;
      const { data } = await (supabase as any)
        .from('agents')
        .select('id, name, email')
        .or(`name.ilike.%${safe}%,email.ilike.%${safe}%`)
        .limit(5);
      setAgentResults((data as AgentResult[]) || []);
    }, 300);
    return () => clearTimeout(t);
  }, [searchVal]);

  const go = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-[560px] rounded-2xl border-stone-200 shadow-2xl">
        <Command
          shouldFilter
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-stone-500 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4"
        >
          <div className="border-b border-stone-200 px-3">
            <Command.Input
              autoFocus
              placeholder="Search admin..."
              value={searchVal}
              onValueChange={setSearchVal}
              className="w-full border-0 bg-transparent outline-none focus:ring-0 text-[15px] placeholder:text-stone-400 py-3"
            />
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-[14px] text-stone-400">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigate">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.to}
                    value={item.label}
                    onSelect={() => go(item.to)}
                    className={itemCls}
                  >
                    <Icon size={16} className="text-stone-400" />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group heading="Actions">
              <Command.Item
                value="refresh command centre"
                onSelect={() => {
                  window.dispatchEvent(new Event('admin:refresh-cc'));
                  setOpen(false);
                  toast.success('Command Centre refreshed');
                }}
                className={itemCls}
              >
                <RefreshCw size={16} className="text-stone-400" /> Refresh Command Centre
              </Command.Item>
              <Command.Item
                value="export agents csv"
                onSelect={() => go('/admin/system?tab=reports')}
                className={itemCls}
              >
                <Download size={16} className="text-stone-400" /> Export agents CSV
              </Command.Item>
              <Command.Item
                value="invite partner"
                onSelect={() => go('/admin/partners')}
                className={itemCls}
              >
                <UserPlus size={16} className="text-stone-400" /> Invite partner
              </Command.Item>
              <Command.Item
                value="view pending approvals"
                onSelect={() => go('/admin/approvals')}
                className={itemCls}
              >
                <ClipboardCheck size={16} className="text-stone-400" /> View pending approvals
              </Command.Item>
            </Command.Group>

            {agentResults.length > 0 && (
              <Command.Group heading="Agents">
                {agentResults.slice(0, 5).map((agent) => (
                  <Command.Item
                    key={agent.id}
                    value={`${agent.name} ${agent.email}`}
                    onSelect={() =>
                      go(`/admin/agents?search=${encodeURIComponent(agent.email)}`)
                    }
                    className={itemCls}
                  >
                    <Building2 size={16} className="text-stone-400" />
                    <span>{agent.name}</span>
                    <span className="text-stone-400 text-[12px] ml-auto truncate max-w-[220px]">
                      {agent.email}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
