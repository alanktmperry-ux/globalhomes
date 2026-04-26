import { useEffect, useState, useCallback, DragEvent } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, FileText, Plus, Banknote, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OfferModal from './pipeline/OfferModal';
import OfferOutcomeTracker from './pipeline/OfferOutcomeTracker';
import SettlementModal from './pipeline/SettlementModal';
import { MortgageBrokerModal } from '@/features/mortgage/components/MortgageBrokerModal';
import { MortgageReferralModal } from '@/components/MortgageReferralModal';
import {
  usePipelineStages,
  isSettledStage,
  isUnderOfferStage,
  stageToPropertyStatus,
  DEFAULT_STAGES,
  type PipelineStage,
} from '@/features/agents/hooks/usePipelineStages';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface PipelineCard {
  id: string;
  address: string;
  contactName: string;
  estimatedValue: number;
  /** stage_id from pipeline_stages, or default-* for solo agents */
  stageId: string;
  movedAt: string;
  propertyId: string;
  listingType: string;
  sentOfferId?: string;
}

const daysInStage = (movedAt: string) => {
  const diff = Date.now() - new Date(movedAt).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
};

/** For solo agents (no stage_id stored), pick the default stage that matches
 *  the property's current status. */
const fallbackStageIdFromStatus = (status: string | null, isActive: boolean): string => {
  if (!isActive && status === 'pending') return 'default-prospecting';
  if (!isActive && status === 'coming-soon') return 'default-appraisal';
  if (status === 'public') return 'default-listed';
  if (status === 'under_offer') return 'default-under-offer';
  if (status === 'sold') return 'default-settled';
  return 'default-prospecting';
};

const PipelinePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stages, loading: stagesLoading, agencyId } = usePipelineStages();
  const isSoloAgent = !agencyId;
  const effectiveStages = stages.length > 0 ? stages : DEFAULT_STAGES;

  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [offerCard, setOfferCard] = useState<PipelineCard | null>(null);
  const [settlementCard, setSettlementCard] = useState<{ card: PipelineCard; previousStageId: string } | null>(null);
  const [brokerCard, setBrokerCard] = useState<PipelineCard | null>(null);
  const [mortgageOpen, setMortgageOpen] = useState(false);
  const [mortgagePrice, setMortgagePrice] = useState<number>(0);

  useEffect(() => {
    if (!user || stagesLoading) return;

    const fetchPipeline = async () => {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!agent) return;
      setAgentId(agent.id);

      const { data: properties } = await supabase
        .from('properties')
        .select('id, address, vendor_name, price, status, is_active, listed_date, updated_at, listing_type, stage_id')
        .eq('agent_id', agent.id)
        .neq('status', 'archived');

      if (!properties) return;

      const propertyIds = properties.map((p: any) => p.id);
      const { data: offers } = await supabase
        .from('offers')
        .select('id, property_id, status')
        .eq('agent_id', agent.id)
        .eq('status', 'sent')
        .in('property_id', propertyIds.length > 0 ? propertyIds : ['__none__']);

      const offerMap = new Map((offers || []).map((o: any) => [o.property_id, o.id]));

      const mapped: PipelineCard[] = properties.map((prop: any) => ({
        id: prop.id,
        address: prop.address || 'Unknown address',
        contactName: prop.vendor_name || 'No owner set',
        estimatedValue: prop.price || 0,
        stageId: prop.stage_id || fallbackStageIdFromStatus(prop.status, prop.is_active),
        movedAt: prop.updated_at || prop.listed_date || new Date().toISOString(),
        propertyId: prop.id,
        listingType: prop.listing_type || 'sale',
        sentOfferId: offerMap.get(prop.id) || undefined,
      }));
      setCards(mapped);
    };

    fetchPipeline();
  }, [user, stagesLoading]);

  const handleDragStart = (e: DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(cardId);
  };

  const handleDragOver = (e: DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStageId(stageId);
  };

  const handleDragLeave = () => setDragOverStageId(null);

  const persistStageMove = async (cardId: string, targetStage: PipelineStage) => {
    const { status, is_active } = stageToPropertyStatus(targetStage);
    const updates: any = { status, is_active };
    // Only persist stage_id for agency listings (solo agents have NULL stage_id)
    if (!isSoloAgent && !targetStage.id.startsWith('default-')) {
      updates.stage_id = targetStage.id;
    }
    const { error } = await supabase.from('properties').update(updates).eq('id', cardId);
    if (error) throw error;
  };

  const handleDrop = useCallback(async (e: DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    setDraggingId(null);
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    const card = cards.find(c => c.id === cardId);
    const targetStage = effectiveStages.find(s => s.id === targetStageId);
    if (!card || !targetStage || card.stageId === targetStageId) return;

    // Intercept moves into a Settled-equivalent stage — show modal first
    if (isSettledStage(targetStage) && !isSettledStage(effectiveStages.find(s => s.id === card.stageId) || targetStage)) {
      setSettlementCard({ card, previousStageId: card.stageId });
      return;
    }

    const previousCards = [...cards];

    try {
      await persistStageMove(cardId, targetStage);
      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, stageId: targetStageId, movedAt: new Date().toISOString() } : c
      ));
    } catch (err) {
      console.error('[Pipeline] persistStageMove failed:', err);
      setCards(previousCards);
      toast.error('Failed to move card — please try again');
      return;
    }

    const previousStage = effectiveStages.find(s => s.id === card.stageId);
    if (isUnderOfferStage(targetStage) && !(previousStage && isUnderOfferStage(previousStage))) {
      setMortgagePrice(card.estimatedValue || 0);
      setMortgageOpen(true);
    }
  }, [cards, effectiveStages, isSoloAgent]);

  const handleOfferSent = (sentOfferId: string) => {
    if (!offerCard) return;
    setCards(prev => prev.map(c =>
      c.id === offerCard.id ? { ...c, sentOfferId } : c
    ));
    setOfferCard(null);
  };

  const handleOfferOutcome = async (cardId: string, outcome: 'accepted' | 'rejected' | 'countered') => {
    // Find current Settled / Listed / Under Offer stages by semantics
    const settled = effectiveStages.find(isSettledStage);
    const listed  = effectiveStages.find(s => /listed|on market|marketing|public/i.test(s.label));
    const offer   = effectiveStages.find(isUnderOfferStage);
    const target = outcome === 'accepted' ? settled : outcome === 'rejected' ? listed : offer;
    if (!target) return;

    setCards(prev => prev.map(c =>
      c.id === cardId
        ? { ...c, stageId: target.id, movedAt: new Date().toISOString(), sentOfferId: undefined }
        : c
    ));
    await persistStageMove(cardId, target);
  };

  const totalValue = cards.reduce((sum, c) => sum + c.estimatedValue, 0);

  return (
    <div>
      <DashboardHeader
        title="Listings Pipeline"
        subtitle={`${cards.length} listings · ${AUD.format(totalValue)} total value`}
      />
      <div className="px-4 sm:px-6 pt-4 flex justify-end gap-2">
        {!isSoloAgent && (
          <button
            onClick={() => navigate('/dashboard/settings?tab=pipeline')}
            className="flex items-center gap-1.5 text-xs font-medium border border-border bg-card px-3 py-1.5 rounded-lg hover:bg-muted transition"
            title="Customise pipeline stages"
          >
            <SettingsIcon size={13} /> Stages
          </button>
        )}
        <button
          onClick={() => navigate('/pocket-listing')}
          className="flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition"
        >
          <Plus size={13} /> Add Listing
        </button>
      </div>

      <div className="p-4 sm:p-6 max-w-[1600px]">
        <div className="flex gap-3 overflow-x-auto pb-4">
          {effectiveStages.map((stage) => {
            const stageCards = cards.filter(c => c.stageId === stage.id);
            const stageValue = stageCards.reduce((s, c) => s + c.estimatedValue, 0);
            const isOver = dragOverStageId === stage.id;

            return (
              <div
                key={stage.id}
                className={`flex-shrink-0 w-[260px] sm:w-[280px] flex flex-col rounded-xl border transition-all ${
                  isOver ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-card'
                }`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-bold">{stage.label}</span>
                    <span className="ml-auto text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {stageCards.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{stage.probability}% win probability</p>
                  {stageValue > 0 && (
                    <p className="text-[10px] font-semibold text-muted-foreground mt-1">{AUD.format(stageValue)}</p>
                  )}
                </div>

                <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                  {stageCards.map((card) => {
                    const days = daysInStage(card.movedAt);
                    const daysColor = days <= 3 ? 'text-emerald-500' : days <= 7 ? 'text-primary' : 'text-destructive';
                    const isUnderOffer = isUnderOfferStage(stage);

                    return (
                      <motion.div
                        key={card.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: draggingId === card.id ? 0.5 : 1, scale: 1 }}
                        draggable
                        onDragStart={(e: any) => handleDragStart(e, card.id)}
                        onDragEnd={() => setDraggingId(null)}
                        className="bg-background border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all select-none"
                      >
                        <div className="flex items-start gap-1.5">
                          <GripVertical size={12} className="text-muted-foreground/50 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p
                                className="text-xs font-medium truncate flex-1 hover:text-primary hover:underline cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/listings/${card.propertyId}`); }}
                              >
                                {card.address}
                              </p>
                              {isUnderOffer && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOfferCard(card); }}
                                  className="p-1 rounded hover:bg-primary/10 transition-colors shrink-0"
                                  title="AI Offer Assistant"
                                >
                                  <FileText size={12} className="text-primary" />
                                </button>
                              )}
                              {isUnderOffer && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setBrokerCard(card); }}
                                  className="p-1 rounded hover:bg-primary/10 transition-colors shrink-0"
                                  title="Refer buyer to mortgage broker"
                                >
                                  <Banknote size={12} className="text-primary" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                card.listingType === 'rent'
                                  ? 'bg-blue-500/10 text-blue-600'
                                  : 'bg-amber-500/10 text-amber-600'
                              }`}>
                                {card.listingType === 'rent' ? 'Rent' : 'Sale'}
                              </span>
                              <p className="text-[10px] text-muted-foreground truncate">{card.contactName}</p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] font-bold">{AUD.format(card.estimatedValue)}</span>
                              <span className={`text-[10px] font-semibold ${daysColor}`}>{days}d</span>
                            </div>
                            {isUnderOffer && card.sentOfferId && user && (
                              <OfferOutcomeTracker
                                offerId={card.sentOfferId}
                                cardId={card.id}
                                userId={user.id}
                                onOutcome={handleOfferOutcome}
                              />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {stageCards.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground/50 border border-dashed border-border rounded-lg">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {offerCard && agentId && (
        <OfferModal
          open={!!offerCard}
          onOpenChange={(open) => { if (!open) setOfferCard(null); }}
          card={{ ...offerCard, stage: 'under_offer' } as any}
          propertyId={offerCard.propertyId}
          agentId={agentId}
          onSent={handleOfferSent}
        />
      )}

      {settlementCard && user && (() => {
        const settledStage = effectiveStages.find(isSettledStage);
        return (
          <SettlementModal
            open={!!settlementCard}
            onOpenChange={(open) => { if (!open) setSettlementCard(null); }}
            propertyId={settlementCard.card.propertyId}
            propertyAddress={settlementCard.card.address}
            initialPrice={settlementCard.card.estimatedValue}
            agentId={agentId}
            userId={user.id}
            onConfirmed={() => {
              if (!settledStage) return;
              setCards(prev => prev.map(c =>
                c.id === settlementCard.card.id
                  ? { ...c, stageId: settledStage.id, movedAt: new Date().toISOString() }
                  : c
              ));
              setSettlementCard(null);
            }}
            onCancel={() => setSettlementCard(null)}
          />
        );
      })()}

      {brokerCard && (
        <MortgageBrokerModal
          open={!!brokerCard}
          onOpenChange={(open) => { if (!open) setBrokerCard(null); }}
          sourcePage="pipeline_under_offer"
          defaultPrice={brokerCard.estimatedValue}
          propertyId={brokerCard.propertyId}
          agentId={agentId}
        />
      )}

      <MortgageReferralModal
        open={mortgageOpen}
        onOpenChange={setMortgageOpen}
        sourceLabel="pipeline_under_offer"
        purchasePrice={mortgagePrice}
      />
    </div>
  );
};

export default PipelinePage;
