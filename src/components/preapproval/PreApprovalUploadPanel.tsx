import { useState, useRef } from 'react';
import { Upload, FileText, ShieldCheck, X } from 'lucide-react';
import { usePreApproval } from '@/hooks/usePreApproval';
import { PreApprovalBadge, PreApprovalPendingBadge, PreApprovalRejectedBadge } from './PreApprovalBadge';

const DOC_TYPES = [
  { value: 'bank_letter', label: 'Bank pre-approval letter' },
  { value: 'broker_letter', label: 'Mortgage broker approval' },
  { value: 'conditional_approval', label: 'Conditional approval' },
  { value: 'formal_approval', label: 'Formal / unconditional approval' },
];

const COMMON_LENDERS = [
  'Commonwealth Bank', 'Westpac', 'ANZ', 'NAB', 'Macquarie Bank',
  'ING', 'St George', 'Bank of Melbourne', 'Bankwest', 'Suncorp',
  'Lendi', 'Aussie Home Loans', 'Mortgage Choice', 'Uno Home Loans',
];

export function PreApprovalUploadPanel() {
  const {
    approvals, uploading, uploadError, submitApproval,
    activeApproval, pendingApproval,
  } = usePreApproval();

  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('bank_letter');
  const [lenderName, setLenderName] = useState('');
  const [lenderCustom, setLenderCustom] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rejectedApproval = approvals.find(a => a.status === 'rejected');

  const handleFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) {
      alert('File must be under 10MB');
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|jpg|jpeg|png|heic)$/i)) {
      alert('Please upload a PDF or image file');
      return;
    }
    setFile(f);
    setShowForm(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    const finalLender = lenderName === '__custom__' ? lenderCustom : lenderName;
    await submitApproval(file, {
      document_type: docType,
      lender_name: finalLender,
      approved_amount: approvedAmount ? parseInt(approvedAmount.replace(/,/g, ''), 10) : null,
      expiry_date: expiryDate,
      issue_date: issueDate,
    });
    setFile(null);
    setShowForm(false);
    setApprovedAmount('');
    setExpiryDate('');
    setIssueDate('');
    setLenderName('');
  };

  const renderUploadArea = () => (
    <div className="space-y-4">
      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/40'
          }`}
        >
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            Drop your pre-approval letter here
          </p>
          <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG or HEIC up to 10MB</p>
          <span className="mt-3 inline-block text-xs text-primary font-medium underline underline-offset-2">
            Browse files
          </span>
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.heic" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl">
          <FileText className="w-5 h-5 text-primary shrink-0" />
          <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showForm && file && (
        <div className="space-y-4 bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground">Document details</p>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Document type</label>
            <div className="grid grid-cols-2 gap-2">
              {DOC_TYPES.map(dt => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => setDocType(dt.value)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-left transition-colors ${
                    docType === dt.value
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-card border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  {dt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Lender / broker</label>
            <select
              value={lenderName}
              onChange={e => setLenderName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select lender...</option>
              {COMMON_LENDERS.map(l => <option key={l} value={l}>{l}</option>)}
              <option value="__custom__">Other (type below)</option>
            </select>
            {lenderName === '__custom__' && (
              <input
                value={lenderCustom}
                onChange={e => setLenderCustom(e.target.value)}
                placeholder="Enter lender name"
                className="mt-2 w-full px-3 py-2 rounded-xl border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Approved amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  value={approvedAmount}
                  onChange={e => setApprovedAmount(e.target.value.replace(/[^0-9,]/g, ''))}
                  placeholder="850,000"
                  className="w-full pl-6 pr-3 py-2 rounded-xl border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Issue date</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Expiry date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Uploading…' : 'Submit for verification'}
            </button>
            <button
              onClick={() => { setFile(null); setShowForm(false); }}
              className="px-4 py-2.5 text-muted-foreground text-sm hover:underline"
            >
              Cancel
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Your document is stored securely and only shared with listing agents you
            initiate contact with. Pre-approval letters are reviewed within 1–2 business days.
          </p>
        </div>
      )}
    </div>
  );

  if (activeApproval) {
    return (
      <div className="space-y-3">
        <PreApprovalBadge
          verified
          amount={activeApproval.approved_amount}
          expiry={activeApproval.expiry_date}
          lender={activeApproval.lender_name}
        />
        <p className="text-xs text-muted-foreground">
          Your pre-approval badge is now visible to agents you message.
        </p>
        <button onClick={() => setShowForm(true)} className="text-sm text-primary hover:underline">
          Submit updated pre-approval
        </button>
        {showForm && renderUploadArea()}
      </div>
    );
  }

  if (pendingApproval && !showForm) {
    return (
      <div className="space-y-3">
        <PreApprovalPendingBadge />
        <button onClick={() => setShowForm(true)} className="text-sm text-primary hover:underline">
          Submit a different document
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Get your Pre-Approved ✓ badge</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload your bank or broker pre-approval letter to verify your borrowing
                capacity. Agents prioritise buyers they know are finance-ready.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '📄', title: 'Upload', desc: 'Your pre-approval letter' },
              { icon: '✅', title: 'Verified', desc: 'Checked within 1–2 days' },
              { icon: '🏷️', title: 'Badged', desc: 'Visible to agents' },
            ].map(step => (
              <div key={step.title} className="text-center">
                <p className="text-xl mb-1">{step.icon}</p>
                <p className="text-xs font-semibold text-foreground">{step.title}</p>
                <p className="text-[10px] text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>

          {rejectedApproval && <PreApprovalRejectedBadge reason={rejectedApproval.rejection_reason} />}

          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            Upload pre-approval letter
          </button>
        </div>
      )}

      {showForm && renderUploadArea()}
    </div>
  );
}
