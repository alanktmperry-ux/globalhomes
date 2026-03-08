/**
 * ManusSearchService — Connects to the Manus API via a secure edge function.
 * 
 * Flow:
 * 1. Frontend sends natural language query to the manus-search edge function
 * 2. Edge function forwards to POST https://open.manus.im/v1/tasks
 * 3. Results are parsed and normalized into Property objects
 * 
 * Falls back to filtered mock data if the API call fails.
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
}

class ManusSearchService {
  async search(params: ManusSearchParams): Promise<ManusSearchResult> {
    try {
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('manus-search', {
        body: { query: params.query, language: params.language },
      });

      if (error) {
        console.warn('Manus edge function error, falling back to mock:', error);
        return this.mockSearch(params);
      }

      console.log('Manus API response:', data);

      // If Manus returned property data, try to parse it
      if (data?.data && data.source === 'manus') {
        const properties = this.parseManusResponse(data.data);
        if (properties.length > 0) {
          return {
            properties,
            query: params.query,
            totalResults: properties.length,
            source: 'manus',
          };
        }
      }

      // Fallback to mock if no usable results
      return this.mockSearch(params);
    } catch (err) {
      console.warn('Search failed, using mock data:', err);
      return this.mockSearch(params);
    }
  }

  private parseManusResponse(manusData: any): Property[] {
    try {
      // Manus may return data in various formats — try to extract properties
      let rawProperties: any[] = [];

      if (Array.isArray(manusData)) {
        rawProperties = manusData;
      } else if (manusData.properties && Array.isArray(manusData.properties)) {
        rawProperties = manusData.properties;
      } else if (manusData.result) {
        // Try to parse result as JSON if it's a string
        const parsed = typeof manusData.result === 'string' 
          ? JSON.parse(manusData.result) 
          : manusData.result;
        rawProperties = Array.isArray(parsed) ? parsed : [];
      }

      return rawProperties.map((p: any, i: number) => ({
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
      console.warn('Failed to parse Manus response:', err);
      return [];
    }
  }

  private async mockSearch(params: ManusSearchParams): Promise<ManusSearchResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    const query = params.query.toLowerCase();
    let filtered = mockProperties;

    // Filter by location
    const locations = ['berwick', 'officer', 'south yarra', 'daylesford', 'victoria', 'melbourne'];
    const matchedLocation = locations.find(loc => query.includes(loc));
    if (matchedLocation) {
      filtered = filtered.filter(p =>
        p.suburb.toLowerCase().includes(matchedLocation) ||
        p.state.toLowerCase().includes(matchedLocation) ||
        p.address.toLowerCase().includes(matchedLocation)
      );
    }

    // Filter by bedrooms
    const bedMatch = query.match(/(\d+)\s*(?:bed|bedroom|br|room)/i);
    if (bedMatch) {
      const beds = parseInt(bedMatch[1]);
      filtered = filtered.filter(p => p.beds >= beds);
    }

    // Filter by price
    const priceMatch = query.match(/\$?([\d,]+)k?/i);
    if (priceMatch) {
      let price = parseInt(priceMatch[1].replace(/,/g, ''));
      if (price < 10000) price *= 1000;
      filtered = filtered.filter(p => p.price <= price * 1.15);
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
