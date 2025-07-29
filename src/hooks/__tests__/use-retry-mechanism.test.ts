import { renderHook, act, waitFor } from '@testing-library/react';
import { useRetryMechanism, useSimpleRetry, useDatabaseRetry } from '../use-retry-mechanism';
import { useNetworkStatus } from '../use-network-status';
import { useToast } from '../use-toast';
import { handleApiCallWithRetry } from '@/lib/api-error-handler';

// Mock dependencies
jest.mock('../use-network-status');
jest.mock('../use-toast');
jest.mock('@/lib/api-error-handler', () => ({
  handleApiCallWithRetry: jest.fn(),
  handleSupabaseError: jest.fn(),
}));

const mockUseNetworkStatus = useNetworkStatus as jest.MockedFunction<typeof useNetworkStatus>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockHandleApiCallWithRetry = handleApiCallWithRetry as jest.MockedFunction<typeof handleApiCallWithRetry>;

describe('useRetryMechanism', () => {
  const mockToast = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
      isSlowConnection: false,
      getNetworkQuality: () => 'good',
      checkConnectivity: jest.fn(),
      refreshOnReconnect: jest.fn(),
    });
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: [],
    });

    // Mock handleApiCallWithRetry to actually execute the operation
    mockHandleApiCallWithRetry.mockImplementation(async (operation, options) => {
      const maxRetries = options?.maxRetries || 3;
      let attempts = 0;
      let lastError: Error | null = null;

      for (let i = 0; i <= maxRetries; i++) {
        attempts = i + 1;
        try {
          const result = await operation();
          return { data: result, error: null, attempts };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Call onRetry callback if provided
          if (options?.onRetry && i < maxRetries) {
            options.onRetry(i + 1, lastError);
          }
          
          // Check if we should retry
          if (options?.shouldRetry && !options.shouldRetry(lastError, i)) {
            break;
          }
          
          // Don't retry for certain error types
          const errorMessage = lastError.message.toLowerCase();
          if (errorMessage.includes('not found') || 
              errorMessage.includes('unauthorized') || 
              errorMessage.includes('forbidden')) {
            break;
          }
          
          // Add small delay for testing
          if (i < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      }

      return { data: null, error: lastError, attempts };
    });
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const { result } = renderHook(() => useRetryMechanism());
      const mockOperation = jest.fn().mockResolvedValue('success');

      let operationResult: any;
      await act(async () => {
        operationResult = await result.current.executeWithRetry(mockOperation, {
          operationName: 'test operation',
          showProgressToasts: false,
        });
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(operationResult).toBe('success');
      expect(result.current.retryState.isSuccess).toBe(true);
      expect(result.current.retryState.totalAttempts).toBe(1);
    });

    it('should retry operation on failure and eventually succeed', async () => {
      const { result } = renderHook(() => useRetryMechanism());
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      let operationResult: any;
      await act(async () => {
        operationResult = await result.current.executeWithRetry(mockOperation, {
          operationName: 'test operation',
          maxRetries: 3,
          retryDelay: 10, // Short delay for testing
          showProgressToasts: false,
        });
      });

      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(operationResult).toBe('success');
      expect(result.current.retryState.isSuccess).toBe(true);
      expect(result.current.retryState.totalAttempts).toBe(3);
    });

    it('should fail after max retries exceeded', async () => {
      const { result } = renderHook(() => useRetryMechanism());
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'));

      let operationResult: any;
      await act(async () => {
        operationResult = await result.current.executeWithRetry(mockOperation, {
          operationName: 'test operation',
          maxRetries: 2,
          retryDelay: 10,
          showProgressToasts: false,
        });
      });

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(operationResult).toBeNull();
      expect(result.current.retryState.isSuccess).toBe(false);
      expect(result.current.retryState.lastError?.message).toBe('Persistent error');
    });

    it('should not retry for non-retryable errors', async () => {
      const { result } = renderHook(() => useRetryMechanism());
      const mockOperation = jest.fn().mockRejectedValue(new Error('Not found'));

      let operationResult: any;
      await act(async () => {
        operationResult = await result.current.executeWithRetry(mockOperation, {
          operationName: 'test operation',
          maxRetries: 3,
          showProgressToasts: false,
        });
      });

      expect(mockOperation).toHaveBeenCalledTimes(1); // Should not retry
      expect(operationResult).toBeNull();
      expect(result.current.retryState.isSuccess).toBe(false);
    });

    it('should not retry when offline', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        wasOffline: true,
        isSlowConnection: false,
        getNetworkQuality: () => 'offline',
        checkConnectivity: jest.fn(),
        refreshOnReconnect: jest.fn(),
      });

      const { result } = renderHook(() => useRetryMechanism());
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));

      let operationResult: any;
      await act(async () => {
        operationResult = await result.current.executeWithRetry(mockOperation, {
          operationName: 'test operation',
          maxRetries: 3,
          showProgressToasts: false,
        });
      });

      expect(mockOperation).toHaveBeenCalledTimes(1); // Should not retry when offline
      expect(operationResult).toBeNull();
    });

    it('should adjust retry behavior based on network quality', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        wasOffline: false,
        isSlowConnection: true,
        getNetworkQuality: () => 'poor',
        checkConnectivity: jest.fn(),
        refreshOnReconnect: jest.fn(),
      });

      const { result } = renderHook(() => useRetryMechanism());
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'));

      let operationResult: any;
      await act(async () => {
        operationResult = await result.current.executeWithRetry(mockOperation, {
          operationName: 'test operation',
          showProgressToasts: false,
        });
      });

      // Should use reduced retries for poor network
      expect(mockOperation).toHaveBeenCalledTimes(2); // Initial + 1 retry for poor network
      expect(operationResult).toBeNull();
    });
  });

  describe('executeSequenceWithRetry', () => {
    it('should execute operations in sequence', async () => {
      const { result } = renderHook(() => useRetryMechanism());
      const mockOp1 = jest.fn().mockResolvedValue('result1');
      const mockOp2 = jest.fn().mockResolvedValue('result2');
      const mockOp3 = jest.fn().mockResolvedValue('result3');

      let sequenceResult: any;
      await act(async () => {
        sequenceResult = await result.current.executeSequenceWithRetry([
          { operation: mockOp1, name: 'operation 1' },
          { operation: mockOp2, name: 'operation 2' },
          { operation: mockOp3, name: 'operation 3' },
        ]);
      });

      expect(mockOp1).toHaveBeenCalledTimes(1);
      expect(mockOp2).toHaveBeenCalledTimes(1);
      expect(mockOp3).toHaveBeenCalledTimes(1);
      expect(sequenceResult).toEqual(['result1', 'result2', 'result3']);
    });

    it('should stop sequence on first failure', async () => {
      const { result } = renderHook(() => useRetryMechanism());
      const mockOp1 = jest.fn().mockResolvedValue('result1');
      const mockOp2 = jest.fn().mockRejectedValue(new Error('Operation 2 failed'));
      const mockOp3 = jest.fn().mockResolvedValue('result3');

      let error: any;
      await act(async () => {
        try {
          await result.current.executeSequenceWithRetry([
            { operation: mockOp1, name: 'operation 1' },
            { operation: mockOp2, name: 'operation 2', options: { maxRetries: 1, showProgressToasts: false } },
            { operation: mockOp3, name: 'operation 3' },
          ]);
        } catch (err) {
          error = err;
        }
      });

      expect(mockOp1).toHaveBeenCalledTimes(1);
      expect(mockOp2).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(mockOp3).not.toHaveBeenCalled(); // Should not execute after failure
      expect(error.message).toContain('Sequence failed at step 2');
    });
  });

  describe('executeParallelWithRetry', () => {
    it('should execute operations in parallel', async () => {
      const { result } = renderHook(() => useRetryMechanism());
      const mockOp1 = jest.fn().mockResolvedValue('result1');
      const mockOp2 = jest.fn().mockResolvedValue('result2');
      const mockOp3 = jest.fn().mockResolvedValue('result3');

      let parallelResult: any;
      await act(async () => {
        parallelResult = await result.current.executeParallelWithRetry([
          { operation: mockOp1, name: 'operation 1' },
          { operation: mockOp2, name: 'operation 2' },
          { operation: mockOp3, name: 'operation 3' },
        ]);
      });

      expect(mockOp1).toHaveBeenCalledTimes(1);
      expect(mockOp2).toHaveBeenCalledTimes(1);
      expect(mockOp3).toHaveBeenCalledTimes(1);
      expect(parallelResult).toEqual(['result1', 'result2', 'result3']);
    });

    it('should continue with successful operations when some fail', async () => {
      const { result } = renderHook(() => useRetryMechanism());
      const mockOp1 = jest.fn().mockResolvedValue('result1');
      const mockOp2 = jest.fn().mockRejectedValue(new Error('Operation 2 failed'));
      const mockOp3 = jest.fn().mockResolvedValue('result3');

      let parallelResult: any;
      await act(async () => {
        parallelResult = await result.current.executeParallelWithRetry([
          { operation: mockOp1, name: 'operation 1' },
          { operation: mockOp2, name: 'operation 2', options: { maxRetries: 1, showProgressToasts: false } },
          { operation: mockOp3, name: 'operation 3' },
        ]);
      });

      expect(mockOp1).toHaveBeenCalledTimes(1);
      expect(mockOp2).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(mockOp3).toHaveBeenCalledTimes(1);
      expect(parallelResult).toEqual(['result1', 'result3']); // Only successful results
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Some Operations Failed',
          variant: 'destructive',
        })
      );
    });
  });
});

describe('useSimpleRetry', () => {
  it('should provide simplified retry interface', async () => {
    const { result } = renderHook(() => useSimpleRetry());
    const mockOperation = jest.fn().mockResolvedValue('success');

    let operationResult: any;
    await act(async () => {
      operationResult = await result.current.retry(mockOperation);
    });

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(operationResult).toBe('success');
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.attempts).toBe(1);
  });
});

describe('useDatabaseRetry', () => {
  it('should execute database operations with appropriate settings', async () => {
    const { result } = renderHook(() => useDatabaseRetry());
    const mockOperation = jest.fn().mockResolvedValue('database result');

    let operationResult: any;
    await act(async () => {
      operationResult = await result.current.executeDatabaseOperation(
        mockOperation,
        'test database operation'
      );
    });

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(operationResult).toBe('database result');
  });
});