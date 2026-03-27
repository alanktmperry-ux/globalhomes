import { useEffect, useState, useCallback, DragEvent } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, FileText } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import OfferModal from './pipeline/OfferModal';
import OfferOutcomeTracker from './pipeline/OfferOutcomeTracker';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface PipelineCard {
  id: string;
  address: string;
  contactName: string;
  estimatedValue: number;
  stage: string;
  movedAt: string;
  propertyId: string;
  sentOfferId?: string; // set after offer is marked as sent
}

const STAGES = [
  { key: 'prospecting', label: 'Prospecting', description: 'Initial contact made', color: 'bg-blue-500' },
  { key: 'appraisal', label: 'Appraisal', description: 'Property valued', color: 'bg-purple-500' },
  { key: 'listed', label: 'Listed', description: 'Property on market', color: 'bg-amber-500' },
  { key: 'under_offer', label: 'Under Offer', description: 'Offer accepted', color: 'bg-emerald-500' },
  { key: 'settled', label: 'Settled', description: 'Deal closed', color: 'bg-slate-500' },
] as const;

const daysInStage = (movedAt: string) => {
  const diff = Date.now() - new Date(movedAt).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
};

const mapLeadStatusToStage = (status: string | null): string => {
  switch (status) {
    case 'new': return 'prospecting';
    case 'contacted': return 'appraisal';
    case 'qualified': return 'listed';
    case 'negotiating': return 'under_offer';
    case 'won': return 'settled';
    default: return 'prospecting';
  }
};

const mapStageToLeadStatus = (stage: string): string => {
  switch (stage) {
    case 'prospecting': return 'new';
    case 'appraisal': return 'contacted';
    case 'listed': return 'qualified';
    case 'under_offer': return 'negotiating';
    case 'settled': return 'won';
    default: return 'new';
  }
};

const PipelinePage = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [offerCard, setOfferCard] = useState<PipelineCard | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchPipeline = async () => {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!agent) return;
      setAgentId(agent.id);

      const { data: leads } = await supabase
        .from('leads')
        .select('id, message, user_name, created_at, status, search_context, property_id, properties!inner(address, estimated_value)')
        .eq('agent_id', agent.id);

      if (!leads) return;

      // Check for sent offers
      const leadIds = leads.map((l: any) => l.id);
      const { data: offers } = await supabase
        .from('offers')
        .select('id, lead_id, status')
        .eq('agent_id', agent.id)
        .eq('status', 'sent')
        .in('lead_id', leadIds.length > 0 ? leadIds : ['__none__']);

      const offerMap = new Map((offers || []).map((o: any) => [o.lead_id, o.id]));

      const mapped: PipelineCard[] = leads.map((lead: any) => ({
        id: lead.id,
        address: lead.properties?.address || 'Unknown address',
        contactName: lead.user_name || 'Unknown',
        estimatedValue: parseInt(lead.properties?.estimated_value || '0', 10) || 0,
        stage: mapLeadStatusToStage(lead.status),
        movedAt: lead.created_at,
        propertyId: lead.property_id,
        sentOfferId: offerMap.get(lead.id) || undefined,
      }));
      setCards(mapped);
    };

    fetchPipeline();
  }, [user]);

  const handleDragStart = (e: DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(cardId);
  };

  const handleDragOver = (e: DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageKey);
  };

  const handleDragLeave = () => setDragOverStage(null);

  const handleDrop = useCallback(async (e: DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    setDraggingId(null);
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || card.stage === targetStage) return;

    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, stage: targetStage, movedAt: new Date().toISOString() } : c
    ));

    const newStatus = mapStageToLeadStatus(targetStage);
    await supabase.from('leads').update({ status: newStatus }).eq('id', cardId);
  }, [cards]);

  const handleOfferSent = (sentOfferId: string) => {
    if (!offerCard) return;
    setCards(prev => prev.map(c =>
      c.id === offerCard.id ? { ...c, sentOfferId } : c
    ));
    setOfferCard(null);
  };

  const handleOfferOutcome = async (cardId: string, outcome: 'accepted' | 'rejected' | 'countered') => {
    const targetStage = outcome === 'accepted' ? 'settled' : outcome === 'rejected' ? 'listed' : 'under_offer';
    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, stage: targetStage, movedAt: new Date().toISOString(), sentOfferId: undefined } : c
    ));
    const newStatus = mapStageToLeadStatus(targetStage);
    await supabase.from('leads').update({ status: newStatus }).eq('id', cardId);
  };

  const totalValue = cards.reduce((sum, c) => sum + c.estimatedValue, 0);

  return (
    <div>
      <DashboardHeader
        title="Pipeline"
        subtitle={`${cards.length} deals · ${AUD.format(totalValue)} total value`}
      />

      <div className="p-4 sm:p-6 max-w-[1600px]">
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageCards = cards.filter(c => c.stage === stage.key);
            const stageValue = stageCards.reduce((s, c) => s + c.estimatedValue, 0);
            const isOver = dragOverStage === stage.key;

            return (
              <div
                key={stage.key}
                className={`flex-shrink-0 w-[260px] sm:w-[280px] flex flex-col rounded-xl border transition-all ${
                  isOver ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-card'
                }`}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                    <span className="text-sm font-bold">{stage.label}</span>
                    <span className="ml-auto text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {stageCards.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{stage.description}</p>
                  {stageValue > 0 && (
                    <p className="text-[10px] font-semibold text-muted-foreground mt-1">{AUD.format(stageValue)}</p>
                  )}
                </div>

                <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                  {stageCards.map((card) => {
                    const days = daysInStage(card.movedAt);
                    const daysColor = days <= 3 ? 'text-emerald-500' : days <= 7 ? 'text-primary' : 'text-destructive';

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
                              <p className="text-xs font-medium truncate flex-1">{card.address}</p>
                              {card.stage === 'under_offer' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOfferCard(card); }}
                                  className="p-1 rounded hover:bg-primary/10 transition-colors shrink-0"
                                  title="AI Offer Assistant"
                                >
                                  <FileText size={12} className="text-primary" />
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{card.contactName}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] font-bold">{AUD.format(card.estimatedValue)}</span>
                              <span className={`text-[10px] font-semibold ${daysColor}`}>{days}d</span>
                            </div>
                            {card.stage === 'under_offer' && card.sentOfferId && user && (
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
          card={offerCard}
          propertyId={offerCard.propertyId}
          agentId={agentId}
          onSent={handleOfferSent}
        />
      )}
    </div>
  );
};

export default PipelinePage;
