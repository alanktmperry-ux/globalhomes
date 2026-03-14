import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Zap, Eye, MessageSquare, TrendingUp, Copy, Sparkles, Key } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PocketListingForm from '@/components/pocket-listing/PocketListingForm';
import ListingSuccess from '@/components/pocket-listing/ListingSuccess';
import { useAgentListings } from '@/hooks/useAgentListings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';

const PocketListingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const duplicateId = searchParams.get('duplicate');
  const [showForm, setShowForm] = useState(!!editId || !!duplicateId);
  const [showSuccess, setShowSuccess] = useState(false);
  const [listingTitle, setListingTitle] = useState('');
  const { listings, agentId } = useAgentListings();
  const { toast } = useToast();

  const activeCount = listings.filter(l => ('_mock_status' in l ? l._mock_status !== 'sold' : (l as any).status !== 'sold')).length;
  const totalLeads = listings.reduce((sum, l) => sum + ('_mock_leads' in l ? l._mock_leads : l.contact_clicks), 0);

  const stats = [
    { label: 'Active', value: String(activeCount), icon: <Zap size={16} /> },
    { label: 'Matched', value: String(totalLeads), icon: <MessageSquare size={16} /> },
    { label: 'Offers Pending', value: '0', icon: <TrendingUp size={16} /> },
  ];

  const handlePublish = (title: string) => {
    setListingTitle(title);
    setShowForm(false);
    setShowSuccess(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-background text-foreground min-h-screen">
        {/* Header */}
        <header className="border-b border-border sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="font-display text-lg font-bold">Pocket Listings</h1>
                <p className="text-xs text-muted-foreground">Agent Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5 text-xs" onClick={() => {
                // Find most recent real (db) listing
                const realListing = listings.find(l => '_source' in l && l._source === 'db');
                if (realListing) {
                  navigate(`/pocket-listing?duplicate=${realListing.id}`);
                  setShowForm(true);
                  setShowSuccess(false);
                } else {
                  toast({ title: 'No previous listing to duplicate', description: 'Create your first listing first.', variant: 'destructive' });
                }
              }}>
                <Copy size={14} /> Duplicate Previous
              </Button>
              <Button
                size="sm"
                onClick={() => { setShowForm(true); setShowSuccess(false); }}
                className="gap-1.5 relative text-xs font-bold"
              >
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
                <Plus size={14} /> Create Pocket Listing
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-5xl">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {stats.map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                  {s.icon}
                  <span className="text-xs">{s.label}</span>
                </div>
                <p className="font-display text-2xl font-extrabold text-primary">{s.value}</p>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {showSuccess ? (
              <ListingSuccess
                key="success"
                title={listingTitle}
                onDone={() => setShowSuccess(false)}
              />
            ) : showForm ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <PocketListingForm
                  onPublish={handlePublish}
                  onCancel={() => { setShowForm(false); if (editId || duplicateId) navigate('/pocket-listing'); }}
                  editPropertyId={editId}
                  duplicatePropertyId={duplicateId}
                />
              </motion.div>
            ) : (
              <motion.div
                key="listings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Tabs defaultValue="whisper">
                  <TabsList className="w-full bg-secondary mb-4">
                    <TabsTrigger value="whisper" className="flex-1 text-xs">
                      <Sparkles size={14} className="mr-1" /> Whisper
                    </TabsTrigger>
                    <TabsTrigger value="coming-soon" className="flex-1 text-xs">
                      <Eye size={14} className="mr-1" /> Coming Soon
                    </TabsTrigger>
                    <TabsTrigger value="public" className="flex-1 text-xs">
                      <Zap size={14} className="mr-1" /> Public
                    </TabsTrigger>
                  </TabsList>

                  {['whisper', 'coming-soon', 'public'].map((tab) => (
                    <TabsContent key={tab} value={tab}>
                      <div className="border border-dashed border-border rounded-2xl p-12 text-center">
                        <p className="text-muted-foreground text-sm mb-3">No {tab} listings yet</p>
                        <Button size="sm" onClick={() => setShowForm(true)}>
                          <Plus size={14} className="mr-1" /> Create Your First
                        </Button>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default PocketListingPage;
