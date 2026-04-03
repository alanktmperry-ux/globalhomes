import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Mail, Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';

interface DemoRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  agency_name: string | null;
  message: string | null;
  status: string;
  demo_code: string | null;
  demo_code_expires_at: string | null;
  created_at: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">Approved</Badge>;
    case 'declined':
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">Declined</Badge>;
    default:
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">Pending</Badge>;
  }
};

interface Props {
  onPendingCountChange?: (count: number) => void;
}

const AdminDemoRequests = ({ onPendingCountChange }: Props) => {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('demo_requests' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const rows = data as unknown as DemoRequest[];
      setRequests(rows);
      onPendingCountChange?.(rows.filter(r => r.status === 'pending').length);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (req: DemoRequest) => {
    setActionLoading(req.id);
    try {
      // Call the edge function to approve, generate code, and send email
      const { data, error } = await supabase.functions.invoke('handle-demo-request', {
        body: {
          action: 'send_code',
          request_id: req.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Demo access code sent to ${req.email}`);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (req: DemoRequest) => {
    setActionLoading(req.id);
    try {
      const { error } = await supabase
        .from('demo_requests' as any)
        .update({ status: 'declined' } as any)
        .eq('id', req.id);
      if (error) throw error;
      toast.success('Request declined');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">No demo requests yet</p>
        <p className="text-sm mt-1">Requests will appear here when agents submit the demo form.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="hidden md:table-cell">Phone</TableHead>
            <TableHead className="hidden md:table-cell">Agency</TableHead>
            <TableHead className="hidden lg:table-cell">Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Code</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="font-medium">{req.full_name}</TableCell>
              <TableCell className="text-sm">{req.email}</TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{req.phone || '—'}</TableCell>
              <TableCell className="hidden md:table-cell text-sm">{req.agency_name || '—'}</TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{req.message || '—'}</TableCell>
              <TableCell>{statusBadge(req.status)}</TableCell>
              <TableCell className="hidden md:table-cell">
                {req.demo_code ? (
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{req.demo_code}</code>
                ) : '—'}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {format(new Date(req.created_at), 'dd MMM yyyy')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {req.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        onClick={() => handleApprove(req)}
                        disabled={actionLoading === req.id}
                        title="Approve & Send Code"
                      >
                        {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDecline(req)}
                        disabled={actionLoading === req.id}
                        title="Decline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {req.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => handleApprove(req)}
                      disabled={actionLoading === req.id}
                      title="Resend Code"
                    >
                      {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    asChild
                    title="Contact"
                  >
                    <a href={`mailto:${req.email}?subject=Your ListHQ Demo Request`}>
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminDemoRequests;
