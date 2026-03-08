/**
 * ManusSearchService — Connects to the Manus API via secure edge functions.
 * 
 * Flow:
 * 1. Frontend sends query → manus-search edge function → Manus creates task
 * 2. Frontend polls manus-task-status until completed/failed
 * 3. Results are parsed into Property objects
 * 4. Falls back to mock data if API unavailable or task fails
 */

import { Property } from './types';
import { mockProperties } from './mock-data';
import { supabase } from '@/integrations/supabase/client';

export interface ManusSearchParams {
  query: string;
  language?: string;
}

export interface ManusSearchResult {
  properties: Property[];
  query: string;
  totalResults: number;
  source: 'mock' | 'manus';
  taskId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'mock';
}

type StatusCallback = (update: { status: string; properties?: Property[] }) => void;

const POLL_INTERVAL = 3000;
const MAX_POLL_TIME = 120000; // 2 minutes

class ManusSearchService {
  private activePolls = new Map<string, boolean>();

  /**
   * Start a search. Returns mock results immediately, then polls Manus for live data.
   * Call onUpdate to receive live results when Manus completes.
   */
  async search(
    params: ManusSearchParams,
    onUpdate?: StatusCallback
  ): Promise<ManusSearchResult> {
    // Get mock results for immediate display
    const mockResult = await this.mockSearch(params);

    // Fire off Manus task in background
    this.startManusSearch(params, onUpdate).catch((err) =>
      console.warn('Manus background search failed:', err)
    );

    return {
      ...mockResult,
      status: 'pending',
    };
  }

  private async startManusSearch(
    params: ManusSearchParams,
    onUpdate?: StatusCallback
  ) {
    try {
      const { data, error } = await supabase.functions.invoke('manus-search', {
        body: { query: params.query, language: params.language },
      });

      if (error || !data?.taskId) {
        console.warn('Manus task creation failed:', error || 'No taskId');
        return;
      }

      const taskId = data.taskId;
      console.log('Manus task created:', taskId);
      onUpdate?.({ status: 'running' });

      // Start polling
      await this.pollTaskStatus(taskId, onUpdate);
    } catch (err) {
      console.warn('Manus search error:', err);
    }
  }

  private async pollTaskStatus(taskId: string, onUpdate?: StatusCallback) {
    // Cancel any existing poll for this query
    this.activePolls.set(taskId, true);

    const startTime = Date.now();

    while (this.activePolls.get(taskId) && Date.now() - startTime < MAX_POLL_TIME) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      if (!this.activePolls.get(taskId)) break;

      try {
        const { data, error } = await supabase.functions.invoke('manus-task-status', {
          body: { taskId },
        });

        if (error) {
          console.warn('Poll error:', error);
          continue;
        }

        console.log('Manus task poll:', data?.status);

        if (data?.status === 'completed') {
          this.activePolls.delete(taskId);
          const properties = this.parseManusOutput(data.output);
          onUpdate?.({ status: 'completed', properties });
          return;
        }

        if (data?.status === 'failed') {
          this.activePolls.delete(taskId);
          console.warn('Manus task failed:', data.error);
          onUpdate?.({ status: 'failed' });
          return;
        }

        // Still pending/running
        onUpdate?.({ status: data?.status || 'running' });
      } catch (err) {
        console.warn('Poll iteration error:', err);
      }
    }

    this.activePolls.delete(taskId);
  }

  /** Stop all active polls (e.g., when user starts a new search) */
  cancelPolling() {
    this.activePolls.clear();
  }

  private parseManusOutput(output: any): Property[] {
    try {
      if (!output) return [];

      // Manus output can be messages array or direct data
      let rawData: any = output;

      // If output is an array of messages, find the one with JSON content
      if (Array.isArray(output)) {
        for (const msg of output) {
          const content = msg.content || msg.text || msg;
          if (typeof content === 'string') {
            // Try to extract JSON from the message
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              try {
                rawData = JSON.parse(jsonMatch[0]);
                break;
              } catch { /* continue */ }
            }
            // Try parsing entire content as JSON
            try {
              rawData = JSON.parse(content);
              break;
            } catch { /* continue */ }
          } else if (typeof content === 'object') {
            rawData = content;
            break;
          }
        }
      }

      // If it's a string, try to parse
      if (typeof rawData === 'string') {
        const jsonMatch = rawData.match(/\[[\s\S]*\]/);
        rawData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawData);
      }

      // Extract properties array
      let properties: any[] = [];
      if (Array.isArray(rawData)) {
        properties = rawData;
      } else if (rawData?.properties && Array.isArray(rawData.properties)) {
        properties = rawData.properties;
      } else if (rawData?.result) {
        const parsed = typeof rawData.result === 'string'
          ? JSON.parse(rawData.result)
          : rawData.result;
        properties = Array.isArray(parsed) ? parsed : [];
      }

      return properties.map((p: any, i: number) => ({
        id: p.id || `manus-${i}-${Date.now()}`,
        title: p.title || p.address || 'Property',
        address: p.address || '',
        suburb: p.suburb || '',
        state: p.state || '',
        country: p.country || 'Australia',
        price: typeof p.price === 'number' ? p.price : parseInt(String(p.price).replace(/[^0-9]/g, '')) || 0,
        priceFormatted: p.priceFormatted || p.price_formatted || `$${(p.price || 0).toLocaleString()}`,
        beds: p.beds || p.bedrooms || 0,
        baths: p.baths || p.bathrooms || 0,
        parking: p.parking || p.garage || 0,
        sqm: p.sqm || p.area || 0,
        imageUrl: p.imageUrl || p.image_url || p.images?.[0] || '/placeholder.svg',
        images: p.images || (p.imageUrl ? [p.imageUrl] : ['/placeholder.svg']),
        description: p.description || '',
        estimatedValue: p.estimatedValue || p.estimated_value || '',
        propertyType: p.propertyType || p.property_type || 'House',
        features: p.features || [],
        agent: {
          id: p.agent?.id || `agent-${i}`,
          name: p.agent?.name || 'Contact Agent',
          agency: p.agent?.agency || '',
          phone: p.agent?.phone || '',
          email: p.agent?.email || '',
          avatarUrl: p.agent?.avatarUrl || p.agent?.avatar_url || '',
          isSubscribed: false,
        },
        listedDate: p.listedDate || p.listed_date || new Date().toISOString(),
        views: 0,
        contactClicks: 0,
      }));
    } catch (err) {
      console.warn('Failed to parse Manus output:', err);
      return [];
    }
  }

  private async mockSearch(params: ManusSearchParams): Promise<ManusSearchResult> {
    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));

    const query = params.query.toLowerCase();
    let filtered = mockProperties;

    const locations = ['berwick', 'officer', 'south yarra', 'daylesford', 'victoria', 'melbourne'];
    const matchedLocation = locations.find((loc) => query.includes(loc));
    if (matchedLocation) {
      filtered = filtered.filter(
        (p) =>
          p.suburb.toLowerCase().includes(matchedLocation) ||
          p.state.toLowerCase().includes(matchedLocation) ||
          p.address.toLowerCase().includes(matchedLocation)
      );
    }

    const bedMatch = query.match(/(\d+)\s*(?:bed|bedroom|br|room)/i);
    if (bedMatch) {
      const beds = parseInt(bedMatch[1]);
      filtered = filtered.filter((p) => p.beds >= beds);
    }

    const priceMatch = query.match(/\$?([\d,]+)k?/i);
    if (priceMatch) {
      let price = parseInt(priceMatch[1].replace(/,/g, ''));
      if (price < 10000) price *= 1000;
      filtered = filtered.filter((p) => p.price <= price * 1.15);
    }

    if (filtered.length === 0) filtered = mockProperties;

    return {
      properties: filtered,
      query: params.query,
      totalResults: filtered.length,
      source: 'mock',
    };
  }
}

export const manusSearch = new ManusSearchService();
