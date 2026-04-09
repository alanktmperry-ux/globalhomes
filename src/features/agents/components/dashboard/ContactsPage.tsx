import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, LayoutList, Kanban, ArrowRightLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { useContacts } from '@/features/agents/hooks/useContacts';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTeamAgents } from '@/features/agents/hooks/useTeamAgents';
import ContactsList from './contacts/ContactsList';
import ContactFormModal from './contacts/ContactFormModal';
import ContactDetailDrawer from './contacts/ContactDetailDrawer';
import PipelineBoard from './contacts/PipelineBoard';
import CsvImportModal from './contacts/CsvImportModal';
import { supabase } from '@/integrations/supabase/client';
import { logAction } from '@/shared/lib/auditLog';
import { toast } from 'sonner';
import type { Contact } from '@/features/agents/hooks/useContacts';

const ContactsPage = () => {
  const { contacts, loading, createContact, updateContact, deleteContact, addActivity, getActivities, fetchContacts } = useContacts();
  const { user, isPrincipal, isAdmin, agencyId } = useAuth();
  const { agents } = useTeamAgents();
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [pipelineType, setPipelineType] = useState<'buyer' | 'seller'>('buyer');

  // Principal agent filter
  const [agentFilter, setAgentFilter] = useState('all');
  // Reassign modal
  const [reassignContact, setReassignContact] = useState<Contact | null>(null);
  const [reassignTo, setReassignTo] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const showPrincipalControls = (isPrincipal || isAdmin) && agencyId;

  const filteredContacts = agentFilter === 'all'
    ? contacts
    : contacts.filter(c => c.assigned_agent_id === agentFilter);

  const handleReassignContact = async () => {
    if (!reassignContact || !reassignTo || !user) return;
    setReassigning(true);
    try {
      await supabase.from('contacts').update({ assigned_agent_id: reassignTo } as any).eq('id', reassignContact.id);
      const toAgent = agents.find(a => a.id === reassignTo);
      logAction({
        agencyId, agentId: null, userId: user.id,
        actionType: 'reassigned', entityType: 'contact', entityId: reassignContact.id,
        description: `Reassigned ${reassignContact.first_name} ${reassignContact.last_name || ''} to ${toAgent?.name || 'another agent'}`,
      });
      toast.success('Contact reassigned');
      setReassignContact(null);
      setReassignTo('');
      fetchContacts();
    } catch {
      toast.error('Failed to reassign contact');
    } finally {
      setReassigning(false);
    }
  };

  const exportCsv = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Mobile', 'Type', 'Ranking', 'Suburb', 'State', 'Budget Min', 'Budget Max', 'Source', 'Assigned Agent', 'Notes'];
    const rows = filteredContacts.map(c => [
      c.first_name, c.last_name || '', c.email || '', c.phone || '', c.mobile || '',
      c.contact_type, c.ranking, c.suburb || '', c.state || '',
      c.budget_min || '', c.budget_max || '', c.source || '',
      c.assigned_agent?.name || '', c.notes || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <DashboardHeader title="Contacts" subtitle="Unified contact database" />
      <div className="p-4 sm:p-6 max-w-7xl space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus size={14} /> Add Contact
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1.5">
            <Upload size={14} /> Import CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
            <Download size={14} /> Export CSV
          </Button>

          {/* Principal: Agent filter */}
          {showPrincipalControls && (
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <Button size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} onClick={() => setView('list')} className="h-7 px-2 gap-1 text-xs">
              <LayoutList size={14} /> List
            </Button>
            <Button size="sm" variant={view === 'pipeline' ? 'secondary' : 'ghost'} onClick={() => setView('pipeline')} className="h-7 px-2 gap-1 text-xs">
              <Kanban size={14} /> Pipeline
            </Button>
          </div>
        </div>

        {view === 'pipeline' && (
          <Tabs value={pipelineType} onValueChange={(v) => setPipelineType(v as 'buyer' | 'seller')}>
            <TabsList>
              <TabsTrigger value="buyer">Buyer Pipeline</TabsTrigger>
              <TabsTrigger value="seller">Seller Pipeline</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Content */}
        {view === 'list' ? (
          <ContactsList
            contacts={filteredContacts}
            loading={loading}
            onSelect={setSelectedContact}
            onDelete={deleteContact}
            showAgentName={!!showPrincipalControls}
            onReassign={showPrincipalControls ? (c: Contact) => setReassignContact(c) : undefined}
          />
        ) : (
          <PipelineBoard
            contacts={filteredContacts}
            pipelineType={pipelineType}
            onUpdateContact={updateContact}
            onSelect={setSelectedContact}
          />
        )}

        {/* Modals */}
        {showForm && (
          <ContactFormModal
            onClose={() => setShowForm(false)}
            onSave={async (data) => {
              await createContact(data);
              setShowForm(false);
            }}
          />
        )}

        {showImport && (
          <CsvImportModal
            onClose={() => setShowImport(false)}
            onImport={async (rows) => {
              for (const row of rows) {
                await createContact(row);
              }
              setShowImport(false);
            }}
          />
        )}

        {selectedContact && (
          <ContactDetailDrawer
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
            onUpdate={updateContact}
            addActivity={addActivity}
            getActivities={getActivities}
          />
        )}

        {/* Reassign Dialog */}
        <Dialog open={!!reassignContact} onOpenChange={() => { setReassignContact(null); setReassignTo(''); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reassign Contact</DialogTitle>
              <DialogDescription>
                Move {reassignContact?.first_name} {reassignContact?.last_name || ''} to another agent.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Transfer to</Label>
                <Select value={reassignTo} onValueChange={setReassignTo}>
                  <SelectTrigger><SelectValue placeholder="Select agent..." /></SelectTrigger>
                  <SelectContent>
                    {agents.filter(a => a.id !== reassignContact?.assigned_agent_id).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleReassignContact} disabled={reassigning || !reassignTo} className="w-full">
                {reassigning ? <><Loader2 size={14} className="animate-spin mr-2" /> Reassigning...</> : 'Confirm Reassignment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ContactsPage;
