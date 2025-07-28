import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for debounced search functionality
 * Provides optimized search with configurable debounce delay and search history
 */
export function useDebouncedSearch(initialValue = '', delay = 300) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Debounce the search term
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
      
      // Add to search history if it's a meaningful search (3+ characters)
      if (searchTerm.trim().length >= 3 && !searchHistory.includes(searchTerm.trim())) {
        setSearchHistory(prev => [searchTerm.trim(), ...prev.slice(0, 4)]); // Keep last 5 searches
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [searchTerm, delay, debouncedSearchTerm, searchHistory]);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setIsSearching(false);
  }, []);

  // Set search term from history
  const setFromHistory = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    searchHistory,
    setSearchTerm,
    clearSearch,
    setFromHistory,
    clearHistory,
  };
}

/**
 * Hook for advanced search with multiple fields and operators
 */
export function useAdvancedSearch() {
  const [searchFilters, setSearchFilters] = useState<{
    query: string;
    fields: string[];
    operator: 'AND' | 'OR';
    caseSensitive: boolean;
  }>({
    query: '',
    fields: ['name', 'diagnosis', 'required_followup'],
    operator: 'OR',
    caseSensitive: false,
  });

  const [debouncedFilters, setDebouncedFilters] = useState(searchFilters);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce the search filters
  useEffect(() => {
    if (JSON.stringify(searchFilters) !== JSON.stringify(debouncedFilters)) {
      setIsSearching(true);
    }

    const timer = setTimeout(() => {
      setDebouncedFilters(searchFilters);
      setIsSearching(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [searchFilters, debouncedFilters]);

  const updateSearch = useCallback((updates: Partial<typeof searchFilters>) => {
    setSearchFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchFilters({
      query: '',
      fields: ['name', 'diagnosis', 'required_followup'],
      operator: 'OR',
      caseSensitive: false,
    });
  }, []);

  return {
    searchFilters,
    debouncedFilters,
    isSearching,
    updateSearch,
    clearSearch,
  };
}