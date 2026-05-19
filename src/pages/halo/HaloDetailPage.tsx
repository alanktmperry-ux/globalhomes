import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Languages, Loader2, Send, Check, Home as HomeIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { Halo } from '@/types/halo';
import { TIMEFRAME_LABELS, FINANCE_LABELS } from '@/types/halo';
import { useTranslation } from '@/shared/lib/i18n';
import { capture } from '@/shared/lib/posthog';

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-AU');

interface ResponseRow {
  id: string;
  body: string | null;
  suggested_property_ids: string[] | null;
  accepted: boolean | null;
  dismissed_by_seeker: boolean | null;
  template_label?: string | null;
}

interface PitchTemplate {
  id: string;
  label: string;
  body: string;
}

interface AgentProperty {
  id: string;
  title: string | null;
  address: string | null;
  suburb: string | null;
  price: number | null;
}

interface HaloMessage {
  id: string;
  sender_type: 'seeker' | 'agent';
  sender_id: string;
  body: string;
  read_by_recipient: boolean;
  created_at: string;
}

export default function HaloDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [halo, setHalo] = useState<Halo | null>(null);
  const [response, setResponse] = useState<ResponseRow | null>(null);
  const [seekerEmail, setSeekerEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [pitch, setPitch] = useState('');
  const [selectedPropIds, setSelectedPropIds] = useState<Set<string>>(new Set());
  const [agentProps, setAgentProps] = useState<AgentProperty[]>([]);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<PitchTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Thread state
  const [messages, setMessages] = useState<HaloMessage[]>([]);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data: resp } = await supabase
          .from('halo_responses')
          .select('id, body, suggested_property_ids, accepted, dismissed_by_seeker, template_label')
          .eq('halo_id', id)
          .eq('agent_id', user.id)
          .maybeSingle();
        if (!resp) {
          if (active) navigate('/dashboard/halo-board', { replace: true });
          return;
        }
        if (active) setResponse(resp as ResponseRow);

        const [haloRes, contactRes, propsRes, tplRes] = await Promise.all([
          supabase.from('halos').select('*').eq('id', id).maybeSingle(),
          supabase.functions.invoke('get-halo-contact', { body: { halo_id: id } }),
          supabase
            .from('properties')
            .select('id, title, address, suburb, price')
            .eq('agent_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('halo_pitch_templates')
            .select('id, label, body')
            .eq('agent_id', user.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
        ]);

        if (!active) return;
        if (haloRes.error || !haloRes.data) {
          setError(t('halo.detail.notFound'));
          return;
        }
        setHalo(haloRes.data as Halo);
        setAgentProps((propsRes.data || []) as AgentProperty[]);
        setTemplates(((tplRes.data || []) as PitchTemplate[]));
        capture('halo_viewed_by_agent', { halo_id: id, pitch_sent: !!(resp as ResponseRow).body });

        if (contactRes.error) {
          console.warn('[HaloDetail] contact fetch error', contactRes.error);
        } else {
          setSeekerEmail((contactRes.data as any)?.email ?? null);
        }
      } catch (e) {
        console.error('[HaloDetail] load error', e);
        if (active) setError(t('halo.detail.loadError'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, user, navigate, t]);

  // Load thread + mark seeker messages as read when response exists & is sent
  useEffect(() => {
    if (!response?.id || !response.body) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('halo_messages')
        .select('id, sender_type, sender_id, body, read_by_recipient, created_at')
        .eq('halo_response_id', response.id)
        .order('created_at', { ascending: true });
      if (!cancelled) setMessages((data || []) as HaloMessage[]);

      await supabase
        .from('halo_messages')
        .update({ read_by_recipient: true })
        .eq('halo_response_id', response.id)
        .eq('sender_type', 'seeker')
        .eq('read_by_recipient', false);
    })();
    return () => {
      cancelled = true;
    };
  }, [response?.id, response?.body]);

  const handleSendPitch = async () => {
    if (!response || !pitch.trim()) return;
    setSending(true);
    try {
      const ids = Array.from(selectedPropIds);
      const selectedTpl = templates.find((x) => x.id === selectedTemplateId);
      const { data, error: updErr } = await supabase
        .from('halo_responses')
        .update({
          body: pitch.trim(),
          suggested_property_ids: ids,
          template_id: selectedTpl?.id ?? null,
          template_label: selectedTpl?.label ?? null,
        })
        .eq('id', response.id)
        .select('id, body, suggested_property_ids, accepted, dismissed_by_seeker, template_label')
        .maybeSingle();
      if (updErr || !data) throw updErr ?? new Error('update failed');

      // Notify seeker (best effort)
      supabase.functions
        .invoke('send-halo-agent-response', { body: { halo_id: id } })
        .catch((e) => console.warn('[HaloDetail] notify seeker failed', e));

      capture('halo_response_sent', { halo_id: id, suggested_count: ids.length, template_label: selectedTpl?.label ?? null });
      setResponse(data as ResponseRow);
      toast.success(t('halo.detail.pitchSent') || 'Pitch sent to seeker');
    } catch (e) {
      console.error('[HaloDetail] send pitch error', e);
      toast.error(t('halo.detail.pitchError') || 'Could not send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async () => {
    if (!response || !user || !reply.trim()) return;
    setReplying(true);
    const { data, error: insErr } = await supabase
      .from('halo_messages')
      .insert({
        halo_response_id: response.id,
        halo_id: id!,
        sender_type: 'agent',
        sender_id: user.id,
        body: reply.trim(),
      })
      .select()
      .single();
    setReplying(false);
    if (insErr) {
      toast.error(t('halo.detail.replyError') || 'Reply failed');
      return;
    }
    setMessages((prev) => [...prev, data as HaloMessage]);
    setReply('');
  };

  const togglePropId = (pid: string) => {
    setSelectedPropIds((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else if (next.size < 3) next.add(pid);
      else toast.info(t('halo.detail.maxThreeProps') || 'Pick up to 3 properties');
      return next;
    });
  };

  const suggestedProperties = useMemo(
    () =>
      (response?.suggested_property_ids || [])
        .map((pid) => agentProps.find((p) => p.id === pid))
        .filter(Boolean) as AgentProperty[],
    [response?.suggested_property_ids, agentProps],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error || !halo || !response) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/dashboard/halo-board')} className="mb-4">
          <ArrowLeft size={16} /> {t('halo.detail.back')}
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error ?? t('halo.detail.notFound')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const intentLabel = halo.intent === 'buy' ? t('halo.detail.intent.buy') : t('halo.detail.intent.rent');
  const intentClass =
    halo.intent === 'buy'
      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      : 'bg-purple-100 text-purple-800 hover:bg-purple-100';

  const budgetValue = (() => {
    const hasMin = halo.budget_min != null && halo.budget_min > 0;
    const hasMax = halo.budget_max != null && halo.budget_max > 0;
    if (hasMin && hasMax) return t('halo.detail.budget.range', { min: fmt(halo.budget_min), max: fmt(halo.budget_max) });
    if (hasMax) return t('halo.detail.budget.upTo', { max: fmt(halo.budget_max) });
    if (hasMin) return t('halo.detail.budget.from', { min: fmt(halo.budget_min) });
    return t('halo.detail.budget.any');
  })();

  const bedroomsValue = (() => {
    const min = halo.bedrooms_min;
    const max = halo.bedrooms_max;
    if (!min && !max) return t('halo.detail.any');
    if (min && max) {
      if (min === max) {
        return t(min === 1 ? 'halo.detail.bedrooms.exact.one' : 'halo.detail.bedrooms.exact.other', { count: min });
      }
      return t('halo.detail.bedrooms.range', { min, max });
    }
    if (max) return t('halo.detail.bedrooms.upTo', { max });
    return t('halo.detail.bedrooms.min', { min: min ?? 0 });
  })();

  const pitchSent = !!response.body;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard/halo-board')}>
        <ArrowLeft size={16} /> {t('halo.detail.backToBoard')}
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className={intentClass} variant="secondary">
          {intentLabel}
        </Badge>
        {halo.preferred_language && halo.preferred_language !== 'en' && (
          <Badge variant="outline" className="gap-1">
            <Languages size={12} /> {halo.preferred_language.charAt(0).toUpperCase() + halo.preferred_language.slice(1)}
          </Badge>
        )}
        {response.accepted && (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
            <Check size={12} /> Seeker accepted
          </Badge>
        )}
        {response.dismissed_by_seeker && (
          <Badge variant="secondary">Seeker dismissed</Badge>
        )}
      </div>

      {/* === Composer or Sent Pitch === */}
      {!pitchSent ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Send your pitch</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Introduce yourself, what you can help with, and optionally attach up to 3 of your listings.
              </p>
            </div>

            {templates.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center justify-between">
                  <span>Use a template <span className="text-muted-foreground font-normal">(A/B tracked)</span></span>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/pitch-templates')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Manage
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {templates.map((tpl) => {
                    const active = selectedTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(tpl.id);
                          setPitch(tpl.body);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    );
                  })}
                  {selectedTemplateId && (
                    <button
                      type="button"
                      onClick={() => { setSelectedTemplateId(null); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-transparent text-muted-foreground hover:text-slate-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
            <Textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder={`Hi! I saw your Halo for ${halo.suburbs.slice(0, 2).join(', ') || 'this area'}. I specialise in this exact pocket and have a few options that might suit — happy to chat any time.`}
              rows={6}
              maxLength={1500}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {pitch.length}/1500
            </div>

            {agentProps.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Attach properties <span className="text-muted-foreground">({selectedPropIds.size}/3)</span>
                </div>
                <div className="max-h-56 overflow-y-auto border rounded-lg divide-y">
                  {agentProps.map((p) => {
                    const checked = selectedPropIds.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => togglePropId(p.id)}
                        />
                        <HomeIcon size={16} className="text-blue-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {p.title || p.address || 'Untitled listing'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {p.suburb}
                            {p.price ? ` · $${(p.price / 1000).toFixed(0)}k` : ''}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              onClick={handleSendPitch}
              disabled={sending || !pitch.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <Send size={16} className="mr-2" /> Send pitch
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your pitch</h2>
              <Badge variant="secondary" className="gap-1">
                <Check size={12} /> Sent
              </Badge>
            </div>
            <p className="text-sm whitespace-pre-wrap text-slate-700">{response.body}</p>

            {suggestedProperties.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Attached properties
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedProperties.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/property/${p.id}`)}
                      className="text-left border rounded-lg p-3 hover:border-blue-500 hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-2">
                        <HomeIcon size={14} className="text-blue-600 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {p.title || p.address}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {p.suburb}
                            {p.price ? ` · $${(p.price / 1000).toFixed(0)}k` : ''}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* === Message Thread === */}
      {pitchSent && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Conversation</h2>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No replies yet. You'll see the seeker's response here.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.map((m) => {
                  const mine = m.sender_type === 'agent';
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <div
                          className={`text-[10px] mt-1 ${
                            mine ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply…"
                rows={2}
                maxLength={1000}
                className="resize-none flex-1"
              />
              <Button
                onClick={handleSendReply}
                disabled={replying || !reply.trim()}
                className="bg-blue-600 hover:bg-blue-700 self-end"
              >
                {replying ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === Seeker Contact (only visible after seeker accepts) === */}
      {response.accepted && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('halo.detail.seekerContact')}</h2>
            {seekerEmail ? (
              <a
                href={`mailto:${seekerEmail}`}
                className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
              >
                <Mail size={16} /> {seekerEmail}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('halo.detail.contactUnavailable')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t('halo.detail.lookingFor')}</h2>
          <Field label={t('halo.detail.field.propertyTypes')} value={halo.property_types.join(', ') || '—'} />
          <Field label={t('halo.detail.field.suburbs')} value={halo.suburbs.join(', ') || '—'} />
          <Field
            label={t('halo.detail.field.suburbFlexibility')}
            value={halo.suburb_flexibility ? t('halo.detail.suburbFlex.open') : t('halo.detail.suburbFlex.strict')}
          />
          <Field label={t('halo.detail.field.budget')} value={budgetValue} />
          <Field label={t('halo.detail.field.bedrooms')} value={bedroomsValue} />
          <Field label={t('halo.detail.field.bathrooms')} value={halo.bathrooms_min ?? t('halo.detail.any')} />
          <Field label={t('halo.detail.field.carSpaces')} value={halo.car_spaces_min ?? t('halo.detail.any')} />
          <Field label={t('halo.detail.field.timeframe')} value={TIMEFRAME_LABELS[halo.timeframe]} />
          <Field label={t('halo.detail.field.finance')} value={FINANCE_LABELS[halo.finance_status]} />
        </CardContent>
      </Card>

      {halo.must_haves.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">{t('halo.detail.mustHaves')}</h2>
            <div className="flex flex-wrap gap-2">
              {halo.must_haves.map((m) => (
                <Badge key={m} variant="secondary">
                  {m}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {halo.deal_breakers && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold">{t('halo.detail.dealBreakers')}</h2>
            <p className="text-sm whitespace-pre-wrap">{halo.deal_breakers}</p>
          </CardContent>
        </Card>
      )}

      {halo.description && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold">{t('halo.detail.description')}</h2>
            <p className="text-sm whitespace-pre-wrap">{halo.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 font-medium">{value}</span>
    </div>
  );
}
