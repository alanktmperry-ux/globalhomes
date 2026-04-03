import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Send } from 'lucide-react';
import { usePropertyDocuments } from '../hooks/usePropertyDocuments';
import { useDocumentRequests } from '../hooks/useDocumentRequests';
import { useAuth } from '@/features/auth/AuthProvider';
import { DocumentRow } from './DocumentRow';
import { DocumentRequestRow } from './DocumentRequestRow';
import { DocumentUploadModal } from './DocumentUploadModal';
import { DocumentRequestModal } from './DocumentRequestModal';
import type { DocumentRequest } from '../types';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'contract_of_sale,section32', label: 'Contracts' },
  { key: 'building_inspection,strata_report', label: 'Reports' },
  { key: 'title_search,council_rates,land_tax', label: 'Title' },
  { key: 'lease_agreement,condition_report', label: 'Lease' },
  { key: 'floor_plan', label: 'Floor Plans' },
  { key: 'other,rental_application,identity_doc', label: 'Other' },
];

interface Props {
  propertyId: string;
  viewerRole: 'agent' | 'buyer' | 'vendor' | 'tenant' | 'pm' | 'public';
  canUpload: boolean;
}

export function DocumentVault({ propertyId, viewerRole, canUpload }: Props) {
  const { user } = useAuth();
  const { documents, loading, uploading, uploadDocument, getDownloadUrl, deleteDocument, updateAccess, refetch } = usePropertyDocuments(propertyId);
  const { requests, loading: requestsLoading, cancelRequest } = useDocumentRequests(propertyId);
  const [filter, setFilter] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [uploadForRequest, setUploadForRequest] = useState<string | undefined>();

  const isAgent = viewerRole === 'agent';

  const filteredDocs = useMemo(() => {
    if (filter === 'all') return documents;
    const slugs = filter.split(',');
    return documents.filter(d => slugs.includes(d.category_slug));
  }, [documents, filter]);

  const pendingRequests = requests.filter(r => r.status === 'pending');

  const handleRequestUpload = (req: DocumentRequest) => {
    setUploadForRequest(req.category_slug ?? undefined);
    setUploadOpen(true);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <FileText size={16} /> Document Vault
          </h3>
          <Badge variant="outline" className="text-[10px]">{documents.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {canUpload && (
            <Button size="sm" onClick={() => { setUploadForRequest(undefined); setUploadOpen(true); }} className="gap-1.5 text-xs">
              <Upload size={14} /> Upload Document
            </Button>
          )}
          {isAgent && (
            <Button size="sm" variant="outline" onClick={() => setRequestOpen(true)} className="gap-1.5 text-xs">
              <Send size={14} /> Request Document
            </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => {
          const count = tab.key === 'all'
            ? documents.length
            : documents.filter(d => tab.key.split(',').includes(d.category_slug)).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            📋 Documents Requested ({pendingRequests.length})
          </h4>
          {pendingRequests.map(req => (
            <DocumentRequestRow
              key={req.id}
              request={req}
              onUpload={handleRequestUpload}
              onCancel={cancelRequest}
              isRequester={req.requested_by === user?.id}
            />
          ))}
        </div>
      )}

      {/* Documents list */}
      {filteredDocs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          {canUpload
            ? 'No documents yet. Upload the first document for this property.'
            : 'No documents are available for this property yet.'}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filteredDocs.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              canDelete={isAgent}
              canChangeAccess={isAgent}
              onDownload={getDownloadUrl}
              onDelete={deleteDocument}
              onAccessChange={updateAccess}
            />
          ))}
        </div>
      )}

      {/* Upload modal */}
      <DocumentUploadModal
        propertyId={propertyId}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={uploadDocument}
        preselectedCategory={uploadForRequest}
      />

      {/* Request modal */}
      <DocumentRequestModal
        propertyId={propertyId}
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onCreated={refetch}
      />
    </div>
  );
}
