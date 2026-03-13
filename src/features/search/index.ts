// Search feature - public API
export { VoiceSearchHero } from './components/VoiceSearchHero';
export { SearchBar } from './components/SearchBar';
export { SoundWaveVisualizer } from './components/SoundWaveVisualizer';
export { useVoiceSearch } from './hooks/useVoiceSearch';
export { useSearchHistory } from './hooks/useSearchHistory';
export { useSavedSearches } from './hooks/useSavedSearches';
export type { SavedSearch } from './hooks/useSavedSearches';
export { parsePropertyQuery, filtersToChips } from './lib/parsePropertyQuery';
export type { ParsedFilters } from './lib/parsePropertyQuery';
