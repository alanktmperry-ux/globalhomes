import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import type { DocumentRequest } from '../types';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0' },
  uploaded: { label: 'Uploaded', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0' },
  declined: { label: 'Declined', className: 'bg-muted text-muted-foreground border-0' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-0' },
};

function daysUntilDue(dateStr?: string): { text: string; urgent: boolean } | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: 'Overdue', urgent: true };
  if (diff <= 3) return { text: `Due in ${diff} days`, urgent: true };
  return { text: `Due ${new Date(dateStr).toLocaleDateString('en-AU')}`, urgent: false };
}

interface Props {
  request: DocumentRequest;
  onUpload: (request: DocumentRequest) => void;
  onCancel: (requestId: string) => void;
  isRequester: boolean;
}

export function DocumentRequestRow({ request, onUpload, onCancel, isRequester }: Props) {
  const status = STATUS_MAP[request.status] ?? STATUS_MAP.pending;
  const cat = request.document_categories;
  const due = daysUntilDue(request.due_date);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-l-4 border-amber-400 bg-card rounded-lg">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <span className="text-lg shrink-0">{cat?.icon ?? '📄'}</span>
        <div className="min-w-0 flex-1">
          <span className="font-medium text-sm">
            {request.custom_label || cat?.label || 'Document'}
          </span>
          {request.message && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">"{request.message}"</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge className={`text-[10px] ${status.className}`}>{status.label}</Badge>
            {due && (
              <span className={`text-[10px] ${due.urgent ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {due.text}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {request.status === 'pending' && !isRequester && (
          <Button size="sm" onClick={() => onUpload(request)} className="gap-1 text-xs h-7">
            <Upload size={12} /> Upload Now
          </Button>
        )}
        {request.status === 'pending' && isRequester && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCancel(request.id)}
            className="gap-1 text-xs h-7 text-muted-foreground"
          >
            <X size={12} /> Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
