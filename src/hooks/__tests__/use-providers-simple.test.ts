import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Simple test to check if the basic setup works
describe('Simple Provider Hook Test', () => {
  // Create a minimal wrapper
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return ({ children }: { children: ReactNode }) => 
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it('should render hook wrapper correctly', () => {
    const { result } = renderHook(() => ({ test: true }), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(result.current.test).toBe(true);
  });
});
