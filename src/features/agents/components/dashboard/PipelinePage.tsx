import { useEffect, useState, useCallback, DragEvent } from 'react';
import { motion } from 'framer-motion';
import { Kanban, GripVertical } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface PipelineCard {
  id: string;
  address: string;
  contactName: string;
  estimatedValue: number;
  stage: string;
  movedAt: string; // ISO date when card entered this stage
}

const STAGES = [
  { key: 'prospecting', label: 'Prospecting', description: 'Initial contact made', color: 'bg-blue-500' },
  { key: 'appraisal', label: 'Appraisal', description: 'Property valued', color: 'bg-purple-500' },
  { key: 'listed', label: 'Listed', description: 'Property on market', color: 'bg-amber-500' },
  { key: 'under_offer', label: 'Under Offer', description: 'Offer accepted', color: 'bg-emerald-500' },
  { key: 'settled', label: 'Settled', description: 'Deal closed', color: 'bg-slate-500' },
] as const;

const DEMO_CARDS: PipelineCard[] = [
  { id: 'd1', address: '42 Panorama Drive, Berwick', contactName: 'Sarah Mitchell', estimatedValue: 890000, stage: 'prospecting', movedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'd2', address: '7 Elm Court, Toorak', contactName: 'James Chen', estimatedValue: 2150000, stage: 'prospecting', movedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'd3', address: '15 Station St, Narre Warren', contactName: 'David Park', estimatedValue: 720000, stage: 'appraisal', movedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'd4', address: '8 Ocean View Rd, Brighton', contactName: 'Lisa Wong', estimatedValue: 1450000, stage: 'listed', movedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: 'd5', address: '22 Park Avenue, Hawthorn', contactName: 'Michael Ross', estimatedValue: 1100000, stage: 'under_offer', movedAt: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'd6', address: '3 Bayview Terrace, Mentone', contactName: 'Karen Taylor', estimatedValue: 980000, stage: 'settled', movedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
];

const daysInStage = (movedAt: string) => {
  const diff = Date.now() - new Date(movedAt).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
};

const PipelinePage = () => {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Fetch leads and map to pipeline cards
  useEffect(() => {
    if (isDemoMode) {
      setCards(DEMO_CARDS);
      return;
    }
    if (!user) return;

    const fetchPipeline = async () => {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!agent) return;

      const { data: leads } = await supabase
        .from('leads')
        .select('id, message, user_name, created_at, status, search_context, property_id, properties!inner(address, estimated_value)')
        .eq('agent_id', agent.id);

      if (!leads) return;

      const mapped: PipelineCard[] = leads.map((lead: any) => ({
        id: lead.id,
        address: lead.properties?.address || 'Unknown address',
        contactName: lead.user_name || 'Unknown',
        estimatedValue: parseInt(lead.properties?.estimated_value || '0', 10) || 0,
        stage: mapLeadStatusToStage(lead.status),
        movedAt: lead.created_at,
      }));
      setCards(mapped);
    };

    fetchPipeline();
  }, [user, isDemoMode]);

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

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = useCallback(async (e: DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    setDraggingId(null);
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    const card = cards.find(c => c.id === cardId);
    if (!card || card.stage === targetStage) return;

    // Optimistic update
    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, stage: targetStage, movedAt: new Date().toISOString() } : c
    ));

    // Persist to DB if not demo
    if (!isDemoMode) {
      const newStatus = mapStageToLeadStatus(targetStage);
      await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', cardId);
    }
  }, [cards, isDemoMode]);

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
                {/* Column header */}
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

                {/* Cards area */}
                <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                  {stageCards.map((card) => {
                    const days = daysInStage(card.movedAt);
                    const daysColor = days <= 3 ? 'text-success' : days <= 7 ? 'text-primary' : 'text-destructive';

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
                            <p className="text-xs font-medium truncate">{card.address}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{card.contactName}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] font-bold">{AUD.format(card.estimatedValue)}</span>
                              <span className={`text-[10px] font-semibold ${daysColor}`}>{days}d</span>
                            </div>
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
    </div>
  );
};

export default PipelinePage;
