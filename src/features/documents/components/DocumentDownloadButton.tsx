import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PropertyDocument } from '../types';

interface Props {
  doc: PropertyDocument;
  onDownload: (doc: PropertyDocument) => Promise<string | null>;
  size?: 'sm' | 'default';
  label?: string;
}

export function DocumentDownloadButton({ doc, onDownload, size = 'sm', label = 'Download' }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleClick = async () => {
    setDownloading(true);
    try {
      const url = await onDownload(doc);
      if (!url) throw new Error('Failed to generate URL');

      if (doc.mime_type === 'application/pdf') {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.file_name;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      toast.error('Download failed. Try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      size={size}
      variant="ghost"
      onClick={handleClick}
      disabled={downloading}
      className="gap-1 text-xs"
    >
      {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      {label}
    </Button>
  );
}
