import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, LayoutList, Kanban } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { useContacts } from '@/features/agents/hooks/useContacts';
import ContactsList from './contacts/ContactsList';
import ContactFormModal from './contacts/ContactFormModal';
import ContactDetailDrawer from './contacts/ContactDetailDrawer';
import PipelineBoard from './contacts/PipelineBoard';
import CsvImportModal from './contacts/CsvImportModal';
import type { Contact } from '@/features/agents/hooks/useContacts';

const ContactsPage = () => {
  const { contacts, loading, createContact, updateContact, deleteContact, addActivity, getActivities } = useContacts();
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [pipelineType, setPipelineType] = useState<'buyer' | 'seller'>('buyer');

  const exportCsv = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Mobile', 'Type', 'Ranking', 'Suburb', 'State', 'Budget Min', 'Budget Max', 'Source', 'Notes'];
    const rows = contacts.map(c => [
      c.first_name, c.last_name || '', c.email || '', c.phone || '', c.mobile || '',
      c.contact_type, c.ranking, c.suburb || '', c.state || '',
      c.budget_min || '', c.budget_max || '', c.source || '', c.notes || '',
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
          <div className="ml-auto flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <Button
              size="sm"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              onClick={() => setView('list')}
              className="h-7 px-2 gap-1 text-xs"
            >
              <LayoutList size={14} /> List
            </Button>
            <Button
              size="sm"
              variant={view === 'pipeline' ? 'secondary' : 'ghost'}
              onClick={() => setView('pipeline')}
              className="h-7 px-2 gap-1 text-xs"
            >
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
            contacts={contacts}
            loading={loading}
            onSelect={setSelectedContact}
            onDelete={deleteContact}
          />
        ) : (
          <PipelineBoard
            contacts={contacts}
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
      </div>
    </div>
  );
};

export default ContactsPage;
