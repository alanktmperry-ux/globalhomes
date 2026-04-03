import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DocumentCategory } from '../types';

export function useDocumentCategories() {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);

  useEffect(() => {
    supabase
      .from('document_categories' as any)
      .select('*')
      .order('sort_order')
      .then(({ data }) => setCategories((data ?? []) as unknown as DocumentCategory[]));
  }, []);

  return { categories };
}
