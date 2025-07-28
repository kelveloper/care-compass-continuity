import { renderHook, act } from '@testing-library/react';
import { useDebouncedSearch } from '../use-debounced-search';

// Mock timers for testing debounce functionality
jest.useFakeTimers();

describe('useDebouncedSearch', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize with empty search term', () => {
    const { result } = renderHook(() => useDebouncedSearch());
    
    expect(result.current.searchTerm).toBe('');
    expect(result.current.debouncedSearchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
    expect(result.current.searchHistory).toEqual([]);
  });

  it('should initialize with provided initial value', () => {
    const { result } = renderHook(() => useDebouncedSearch('initial'));
    
    expect(result.current.searchTerm).toBe('initial');
    expect(result.current.debouncedSearchTerm).toBe('initial');
  });

  it('should debounce search term updates', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));
    
    // Set search term
    act(() => {
      result.current.setSearchTerm('test');
    });
    
    // Search term should update immediately
    expect(result.current.searchTerm).toBe('test');
    expect(result.current.isSearching).toBe(true);
    
    // Debounced term should not update yet
    expect(result.current.debouncedSearchTerm).toBe('');
    
    // Fast-forward time by 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Now debounced term should update
    expect(result.current.debouncedSearchTerm).toBe('test');
    expect(result.current.isSearching).toBe(false);
  });

  it('should cancel previous debounce when search term changes quickly', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));
    
    // Set first search term
    act(() => {
      result.current.setSearchTerm('first');
    });
    
    // Fast-forward by 100ms (less than debounce delay)
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Set second search term
    act(() => {
      result.current.setSearchTerm('second');
    });
    
    // Fast-forward by another 200ms (total 300ms from first, but only 200ms from second)
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    // Debounced term should still be empty (first timer was cancelled)
    expect(result.current.debouncedSearchTerm).toBe('');
    
    // Fast-forward by another 100ms (300ms from second search term)
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Now debounced term should be the second value
    expect(result.current.debouncedSearchTerm).toBe('second');
  });

  it('should add meaningful searches to history', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));
    
    // Set a meaningful search term (3+ characters)
    act(() => {
      result.current.setSearchTerm('test search');
    });
    
    // Fast-forward to complete debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Should be added to history
    expect(result.current.searchHistory).toContain('test search');
  });

  it('should not add short searches to history', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));
    
    // Set a short search term (less than 3 characters)
    act(() => {
      result.current.setSearchTerm('ab');
    });
    
    // Fast-forward to complete debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Should not be added to history
    expect(result.current.searchHistory).not.toContain('ab');
  });

  it('should clear search term and history', () => {
    const { result } = renderHook(() => useDebouncedSearch('initial', 300));
    
    // Add some history
    act(() => {
      result.current.setSearchTerm('test search');
    });
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Clear search
    act(() => {
      result.current.clearSearch();
    });
    
    expect(result.current.searchTerm).toBe('');
    expect(result.current.debouncedSearchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
  });

  it('should set search term from history', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));
    
    // Add to history first
    act(() => {
      result.current.setSearchTerm('historical search');
    });
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Clear search
    act(() => {
      result.current.clearSearch();
    });
    
    // Set from history
    act(() => {
      result.current.setFromHistory('historical search');
    });
    
    expect(result.current.searchTerm).toBe('historical search');
  });

  it('should limit search history to 5 items', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));
    
    // Add 6 search terms
    const searches = ['search1', 'search2', 'search3', 'search4', 'search5', 'search6'];
    
    for (const search of searches) {
      act(() => {
        result.current.setSearchTerm(search);
      });
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
    }
    
    // Should only keep the last 5
    expect(result.current.searchHistory).toHaveLength(5);
    expect(result.current.searchHistory[0]).toBe('search6'); // Most recent first
    expect(result.current.searchHistory[4]).toBe('search2'); // Oldest kept
    expect(result.current.searchHistory).not.toContain('search1'); // First one should be removed
  });

  it('should clear search history', () => {
    const { result } = renderHook(() => useDebouncedSearch('', 300));
    
    // Add some history
    act(() => {
      result.current.setSearchTerm('test search');
    });
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Clear history
    act(() => {
      result.current.clearHistory();
    });
    
    expect(result.current.searchHistory).toEqual([]);
  });
});