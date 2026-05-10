import { useEffect, useState } from 'react';
import { Loader2, Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReplyTranslationPreviewProps {
  text: string;
  targetLanguage: string | null | undefined;
}

export function ReplyTranslationPreview({ text, targetLanguage }: ReplyTranslationPreviewProps) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!text.trim() || !targetLanguage || targetLanguage === 'en') {
      setTranslated(null);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-translations', {
          body: { type: 'translate_reply', message: text, target_language: targetLanguage },
        });
        if (!error && data?.translated_message) setTranslated(data.translated_message);
      } catch {
        /* non-fatal */
      }
      setLoading(false);
    }, 600);
    return () => clearTimeout(handle);
  }, [text, targetLanguage]);

  if (!text.trim() || !targetLanguage || targetLanguage === 'en') return null;

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Languages size={12} />
        <span>Buyer will see ({targetLanguage}):</span>
        {loading && <Loader2 size={12} className="animate-spin ml-1" />}
      </div>
      {translated && <p className="text-foreground leading-relaxed">{translated}</p>}
      {!translated && !loading && (
        <p className="text-muted-foreground italic">Type to see preview…</p>
      )}
    </div>
  );
}

export default ReplyTranslationPreview;
