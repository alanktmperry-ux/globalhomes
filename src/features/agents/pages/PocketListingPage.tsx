import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Zap, Eye, MessageSquare, TrendingUp, Copy, Sparkles, Key, Link } from 'lucide-react';
import { ImportListingDialog } from '@/features/agents/components/pocket-listing/ImportListingDialog';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import PocketListingForm from '@/features/agents/components/pocket-listing/PocketListingForm';
import ListingSuccess from '@/features/agents/components/pocket-listing/ListingSuccess';
import { useAgentListings } from '@/features/agents/hooks/useAgentListings';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import { useToast } from '@/shared/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

const PocketListingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const duplicateId = searchParams.get('duplicate');
  const typeParam = searchParams.get('type');
  const routeState = location.state as { type?: 'sale' | 'rent' | 'rental', _ts?: number } | null;
  const stateType = routeState?.type === 'rental'
    ? 'rent'
    : routeState?.type === 'sale' || routeState?.type === 'rent'
      ? routeState.type
      : null;
  const isDashboardNewRoute = location.pathname === '/dashboard/listings/new';
  const requestedListingType = stateType ?? (typeParam === 'sale' || typeParam === 'rent' ? typeParam : null);
  const isExplicitNewListing = !editId && !duplicateId && (isDashboardNewRoute || requestedListingType !== null);

  const [showForm, setShowForm] = useState(!!editId || !!duplicateId || isExplicitNewListing);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createListingType, setCreateListingType] = useState<'sale' | 'rent'>(requestedListingType ?? 'sale');
  const [listingTitle, setListingTitle] = useState('');
  const [formKey, setFormKey] = useState(0);
  const lastTsRef = useRef<number | null>(null);

  // React to navigation state changes (including same-route re-navigations)
  useEffect(() => {
    if (!isExplicitNewListing) return;
    const ts = routeState?._ts ?? 0;
    if (lastTsRef.current === ts && ts !== 0) return;
    lastTsRef.current = ts;

    localStorage.removeItem('pocket-listing-draft');
    setCreateListingType(requestedListingType ?? 'sale');
    setShowForm(true);
    setShowSuccess(false);
    setFormKey(k => k + 1); // force form remount for blank state
  }, [isExplicitNewListing, routeState?._ts, requestedListingType]);

  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const { listings, agentId } = useAgentListings();
  const { toast } = useToast();
  const sub = useSubscription();
  const [showImportDialog, setShowImportDialog] = useState(false);

  const activeCount = listings.filter(l => l.status !== 'sold').length;
  const totalLeads = listings.reduce((sum, l) => sum + l.contact_clicks, 0);

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

  const checkLimitAndCreate = (type: 'sale' | 'rent') => {
    if (sub.isStarter && activeCount >= sub.listingLimit) {
      setShowLimitDialog(true);
      return;
    }
    // Clear any previous auto-saved draft so the form starts blank
    localStorage.removeItem('pocket-listing-draft');
    setCreateListingType(type);
    setShowForm(true);
    setShowSuccess(false);
  };

  const handleImportListing = (imported: any) => {
    const draft = {
      address: imported.address || '',
      suburb: imported.suburb || '',
      state: imported.state || '',
      listingType: imported.listingType || 'sale',
      priceMin: imported.priceMin || 0,
      priceMax: imported.priceMax || 0,
      priceDisplay: imported.priceDisplay || 'contact',
      propertyType: imported.propertyType || 'House',
      beds: imported.beds || 0,
      baths: imported.baths || 0,
      cars: imported.cars || 0,
      sqm: imported.sqm || 0,
      landSize: imported.landSize || 0,
      photos: imported.photos || [],
      primaryPhoto: 0,
      features: imported.features || [],
      voiceTranscript: imported.description || '',
      generatedTitle: imported.address ? `${imported.propertyType || 'Property'} at ${imported.address}` : '',
      generatedBullets: [],
      visibility: 'whisper' as const,
      exclusiveDays: 14,
      buyerRequirements: 'none',
      showContact: true,
      allowCoBroke: true,
      autoDeclineBelow: 0,
      scheduledAt: null,
      estimatedRentalWeekly: 0,
      rentalWeekly: 0,
      rentalBondWeeks: 4,
      availableFrom: '',
      leaseTerm: '12 months',
      furnished: false,
      petsAllowed: false,
      screeningLevel: 'Basic',
      ensuites: 0,
      studyRooms: 0,
      garageType: '',
      hasPool: false,
      hasOutdoorEnt: false,
      hasAlfresco: false,
      hasSolar: false,
      airConType: '',
      heatingType: '',
      auctionDate: '',
      auctionTime: '',
      waterIncluded: false,
      electricityIncluded: false,
      internetIncluded: false,
      hasInternalLaundry: false,
      hasDishwasher: false,
      hasWashingMachine: false,
      hasAirCon: false,
      hasBalcony: false,
      hasPoolAccess: false,
      hasGymAccess: false,
      smokingAllowed: false,
      maxOccupants: 0,
      rentalParkingType: '',
      yearBuilt: '',
      councilRates: 0,
      waterRates: 0,
      strataFees: 0,
    };
    localStorage.setItem('pocket-listing-draft', JSON.stringify(draft));
    setCreateListingType(imported.listingType || 'sale');
    setShowForm(true);
    setShowSuccess(false);
  };

  return (
    <div className="bg-background text-foreground">
      <div className="bg-background text-foreground">
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
                variant="outline"
                size="sm"
                onClick={() => setShowImportDialog(true)}
                className="gap-1.5 text-xs font-medium"
              >
                <Link size={14} /> Import from REA/Domain
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkLimitAndCreate('rent')}
                className="gap-1.5 text-xs font-bold"
              >
                <Key size={14} /> Create Rental Listing
              </Button>
              <Button
                size="sm"
                onClick={() => checkLimitAndCreate('sale')}
                className="gap-1.5 text-xs font-bold"
              >
                <Plus size={14} /> Create Sale Listing
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

          {showSuccess ? (
              <ListingSuccess
                key="success"
                title={listingTitle}
                onDone={() => setShowSuccess(false)}
              />
            ) : showForm ? (
              <div>
                {!editId && !duplicateId && (
                  <h2 className="text-xl font-bold font-display mb-4 text-foreground">
                    {createListingType === 'rent' ? 'New Rental Listing' : 'New Sale Listing'}
                  </h2>
                )}
                <PocketListingForm
                  key={formKey}
                  onPublish={handlePublish}
                  onCancel={() => { setShowForm(false); if (editId || duplicateId) navigate('/pocket-listing'); }}
                  editPropertyId={editId}
                  duplicatePropertyId={duplicateId}
                  initialListingType={createListingType}
                />
              </div>
            ) : (
              <div>
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
                        <p className="text-muted-foreground text-sm">No {tab} listings yet</p>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

          {/* Listing Limit Dialog */}
          <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Listing limit reached</DialogTitle>
                <DialogDescription>
                  You have reached your {sub.listingLimit} listing limit on the Starter plan. Upgrade to Pro for unlimited listings.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowLimitDialog(false)}>Cancel</Button>
                <Button onClick={() => navigate('/dashboard/billing')}>View Plans</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>

        <ImportListingDialog
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImport={handleImportListing}
        />
      </div>
    </div>
  );
};

export default PocketListingPage;
