import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText, Loader2, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDocumentCategories } from '../hooks/useDocumentCategories';
import type { DocumentAccessLevel, UploadDocumentInput } from '../types';

interface Props {
  propertyId: string;
  open: boolean;
  onClose: () => void;
  onUpload: (input: UploadDocumentInput) => Promise<any>;
  preselectedCategory?: string;
}

const ALL_ROLES = [
  { value: 'agent', label: 'Agent' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'pm', label: 'Property Manager' },
];

export function DocumentUploadModal({ propertyId, open, onClose, onUpload, preselectedCategory }: Props) {
  const { categories } = useDocumentCategories();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState(preselectedCategory ?? '');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [accessLevel, setAccessLevel] = useState<DocumentAccessLevel>('agent_only');
  const [visibleRoles, setVisibleRoles] = useState<string[]>(['agent']);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleCategoryChange = (slug: string) => {
    setCategory(slug);
    const cat = categories.find(c => c.slug === slug);
    if (cat) {
      setVisibleRoles(cat.visible_to);
    }
  };

  const toggleRole = (role: string) => {
    setVisibleRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async () => {
    if (!file || !category) return;
    setUploading(true);
    const result = await onUpload({
      propertyId,
      categorySlug: category,
      file,
      label: label || undefined,
      description: description || undefined,
      accessLevel,
      visibleToRoles: visibleRoles,
    });
    setUploading(false);
    if (result) {
      setSuccess(true);
      toast.success('Document uploaded successfully');
      setTimeout(() => {
        setSuccess(false);
        setFile(null);
        setCategory(preselectedCategory ?? '');
        setLabel('');
        setDescription('');
        onClose();
      }, 1200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Upload Document</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={40} />
            <p className="text-sm font-medium">Document uploaded successfully ✓</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors min-h-[100px] flex flex-col items-center justify-center ${
                dragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                  : 'border-border hover:border-primary/50 hover:bg-accent/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-emerald-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-1 p-0.5 rounded-full hover:bg-destructive/10"
                  >
                    <X size={14} className="text-destructive" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={24} className="text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drop your file here or click to browse</p>
                  <p className="text-[10px] text-muted-foreground mt-1">PDF, DOC, JPG, PNG, XLS, ZIP — max 50 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.zip,.txt"
              onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
            />

            {/* Category */}
            <div>
              <Label className="text-xs font-medium">Category</Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.slug} value={c.slug}>
                      <span className="mr-1.5">{c.icon}</span> {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom label */}
            <div>
              <Label className="text-xs font-medium">Custom Label (optional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Override category label..."
                className="mt-1 text-xs"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs font-medium">Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this document..."
                className="mt-1 text-xs min-h-[60px]"
              />
            </div>

            {/* Access level */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Access Level</Label>
              <RadioGroup value={accessLevel} onValueChange={(v) => setAccessLevel(v as DocumentAccessLevel)} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="public" id="al-public" />
                  <Label htmlFor="al-public" className="text-xs cursor-pointer">🌐 Public — anyone can see</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="registered_buyers" id="al-buyers" />
                  <Label htmlFor="al-buyers" className="text-xs cursor-pointer">👤 Registered Buyers — signed-in users</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="agent_only" id="al-agent" />
                  <Label htmlFor="al-agent" className="text-xs cursor-pointer">🔒 Agent Only — only you and co-agents</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="parties_only" id="al-parties" />
                  <Label htmlFor="al-parties" className="text-xs cursor-pointer">🤝 Parties Only — buyer, vendor, agent</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Visible to roles */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Visible To</Label>
              <div className="flex flex-wrap gap-3">
                {ALL_ROLES.map(role => (
                  <div key={role.value} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={visibleRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <Label htmlFor={`role-${role.value}`} className="text-xs cursor-pointer">{role.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!file || !category || uploading}
              className="w-full gap-1.5"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
