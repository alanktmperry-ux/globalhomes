import { FileText, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentAccessBadge } from './DocumentAccessBadge';
import { DocumentDownloadButton } from './DocumentDownloadButton';
import type { PropertyDocument, DocumentAccessLevel } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeLabel(mime?: string): { label: string; className: string } {
  if (!mime) return { label: 'FILE', className: 'bg-muted text-muted-foreground' };
  if (mime.includes('pdf')) return { label: 'PDF', className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  if (mime.includes('word') || mime.includes('document')) return { label: 'WORD', className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  if (mime.includes('sheet') || mime.includes('excel')) return { label: 'EXCEL', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  if (mime.includes('image')) return { label: 'IMAGE', className: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
  if (mime.includes('zip')) return { label: 'ZIP', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  return { label: 'FILE', className: 'bg-muted text-muted-foreground' };
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface Props {
  doc: PropertyDocument;
  canDelete: boolean;
  canChangeAccess: boolean;
  onDownload: (doc: PropertyDocument) => Promise<string | null>;
  onDelete: (docId: string) => void;
  onAccessChange: (docId: string, access: string, roles: string[]) => void;
}

export function DocumentRow({ doc, canDelete, canChangeAccess, onDownload, onDelete, onAccessChange }: Props) {
  const cat = doc.document_categories;
  const mime = mimeLabel(doc.mime_type);
  const expiryDays = daysUntil(doc.expires_at);
  const dateStr = new Date(doc.created_at).toLocaleDateString('en-AU');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
      {/* File info */}
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <span className="text-lg shrink-0">{cat?.icon ?? '📎'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{doc.label || doc.file_name}</span>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-0 ${mime.className}`}>
              {mime.label}
            </Badge>
            {doc.signed && (
              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 gap-0.5">
                ✓ Signed
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            {formatBytes(doc.file_size_bytes) && <span>{formatBytes(doc.file_size_bytes)}</span>}
            <span>·</span>
            <span>{dateStr}</span>
            <span>·</span>
            <span>⬇ {doc.download_count}</span>
          </div>
          {expiryDays !== null && expiryDays <= 30 && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle size={10} />
              {expiryDays <= 0 ? 'Expired' : `Expires in ${expiryDays} days`}
            </div>
          )}
        </div>
      </div>

      {/* Access + Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <DocumentAccessBadge accessLevel={doc.access_level as DocumentAccessLevel} />

        {canChangeAccess && (
          <Select
            value={doc.access_level}
            onValueChange={(val) => {
              const roleMap: Record<string, string[]> = {
                public: ['agent', 'buyer', 'vendor', 'tenant', 'pm'],
                registered_buyers: ['agent', 'buyer', 'vendor'],
                agent_only: ['agent'],
                parties_only: ['agent', 'buyer', 'vendor'],
              };
              onAccessChange(doc.id, val, roleMap[val] ?? ['agent']);
            }}
          >
            <SelectTrigger className="h-7 w-24 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">🌐 Public</SelectItem>
              <SelectItem value="registered_buyers">👤 Buyers</SelectItem>
              <SelectItem value="agent_only">🔒 Agent Only</SelectItem>
              <SelectItem value="parties_only">🤝 Parties</SelectItem>
            </SelectContent>
          </Select>
        )}

        <DocumentDownloadButton doc={doc} onDownload={onDownload} />

        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive h-7 w-7 p-0"
            onClick={() => onDelete(doc.id)}
          >
            <Trash2 size={12} />
          </Button>
        )}
      </div>
    </div>
  );
}
