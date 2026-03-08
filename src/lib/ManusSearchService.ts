/**
 * ManusSearchService — Placeholder for Manus API integration.
 * 
 * In production, this service will:
 * 1. Send natural language queries to POST https://open.manus.im/v1/tasks
 * 2. Handle webhook callbacks for async search results
 * 3. Parse and normalize property data from multiple real estate sources
 * 
 * For now, it returns filtered mock data with a simulated delay.
 */

import { Property } from './types';
import { mockProperties } from './mock-data';

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
  private apiKey: string | null = null;
  private baseUrl = 'https://open.manus.im/v1/tasks';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async search(params: ManusSearchParams): Promise<ManusSearchResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    const query = params.query.toLowerCase();
    
    // Simple keyword filtering on mock data
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
      if (price < 10000) price *= 1000; // Handle "850k" format
      filtered = filtered.filter(p => p.price <= price * 1.15);
    }

    // If no filters matched, return all
    if (filtered.length === 0) filtered = mockProperties;

    return {
      properties: filtered,
      query: params.query,
      totalResults: filtered.length,
      source: 'mock',
    };
  }

  /**
   * Future: Send task to Manus API
   * This will be called from a Supabase Edge Function to keep the API key secure.
   */
  async createManusTask(goal: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Manus API key not configured. Set up via Supabase Edge Function.');
    }

    // Placeholder for actual Manus API call
    // const response = await fetch(this.baseUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ goal, use_browser: true }),
    // });
    // const data = await response.json();
    // return data.task_id;

    return 'mock-task-id';
  }
}

export const manusSearch = new ManusSearchService();
