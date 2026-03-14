import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { readFileAsText } from '@/lib/fileParser';

export type SuggestionCategory = 'contacts' | 'rates' | 'terms' | 'contracts' | 'notes';
export type SuggestionStatus = 'pending' | 'applied' | 'ignored';

export interface FacilitySuggestion {
  id: string;
  category: SuggestionCategory;
  action: 'add' | 'update';
  data: any;
  confidence: number | null;
  source_label: string;
  status: SuggestionStatus;
}

let suggestionCounter = 0;

export function useFacilityImport(facilityId: string, facilityName: string) {
  const [processing, setProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<FacilitySuggestion[]>([]);

  const processContent = useCallback(async (content: string, sourceLabel: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-facility-enrich', {
        body: { facility_id: facilityId, facility_name: facilityName, content, source_label: sourceLabel },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.suggestions?.length) {
        const newSuggestions: FacilitySuggestion[] = data.suggestions.map((s: any) => ({
          id: `suggestion-${++suggestionCounter}`,
          category: s.category,
          action: s.action,
          data: s.data,
          confidence: s.confidence,
          source_label: s.source_label,
          status: 'pending' as const,
        }));
        setSuggestions(prev => [...prev, ...newSuggestions]);
        toast.success(`Found ${newSuggestions.length} suggestion(s) for review`);
      } else {
        toast.info('No actionable data found in the uploaded content.');
      }
    } catch (err: any) {
      console.error('Facility enrich error:', err);
      toast.error(err.message || 'Failed to process content');
    } finally {
      setProcessing(false);
    }
  }, [facilityId, facilityName]);

  const processFile = useCallback(async (file: File) => {
    const text = await readFileAsText(file);
    await processContent(text, `Uploaded file: ${file.name}`);
  }, [processContent]);

  const updateSuggestionStatus = useCallback((id: string, status: SuggestionStatus) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }, []);

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  return {
    processing,
    suggestions,
    pendingCount,
    processContent,
    processFile,
    updateSuggestionStatus,
    setSuggestions,
  };
}
