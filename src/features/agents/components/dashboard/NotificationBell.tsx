import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, MessageSquare, MousePointerClick, Mic, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  property_id: string | null;
  lead_id: string | null;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  lead: <MessageSquare size={14} className="text-primary" />,
  event: <MousePointerClick size={14} className="text-accent-foreground" />,
  voice_match: <Mic size={14} className="text-primary" />,
  message: <MessageSquare size={14} className="text-emerald-500" />,
  boost_requested: <Zap size={14} className="text-amber-500" />,
  boost_activated: <Zap size={14} className="text-emerald-500" />,
  boost_expiring: <Zap size={14} className="text-orange-500" />,
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);

  // Get agent ID
  useEffect(() => {
    if (!user) return;
    supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAgentId(data.id);
      });
  }, [user]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!agentId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  }, [agentId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!agentId) return;
    const channel = supabase
      .channel('agent-notifications')
  .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `agent_id=eq.${agentId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => prev.filter((n) => n.id !== (payload.old as { id: string }).id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [agentId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!agentId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('agent_id', agentId).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setOpen(false);
    if (notification.lead_id) {
      navigate(`/dashboard/concierge?lead=${notification.lead_id}`);
    } else if (notification.property_id) {
      navigate(`/dashboard/listings/${notification.property_id}`);
    } else if (notification.type === 'voice_match' || notification.type === 'lead') {
      navigate('/dashboard/concierge');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="View notifications"
        className="relative w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-elevated overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-display font-bold text-sm">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-lg hover:bg-secondary flex items-center justify-center">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">You'll be notified when buyers enquire</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`w-full text-left px-4 py-3 border-b border-border/50 last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors ${
                        !n.is_read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                          {TYPE_ICON[n.type] || <Bell size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-medium truncate ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {n.title}
                            </p>
                            {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          </div>
                          {n.message && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{n.message}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer — View all messages */}
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => { setOpen(false); navigate('/messages'); }}
                  className="w-full px-4 py-2.5 text-xs font-medium text-primary hover:bg-secondary/50 transition-colors text-center"
                >
                  View all messages
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
