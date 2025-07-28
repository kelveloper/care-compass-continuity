import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '../Dashboard';
import { usePatients } from '@/hooks/use-patients';
import { Patient } from '@/types';

// Mock the hooks
jest.mock('@/hooks/use-patients');
jest.mock('@/hooks/use-optimistic-updates');
jest.mock('@/hooks/use-keyboard-navigation');
jest.mock('@/hooks/use-toast');

const mockUsePatients = usePatients as jest.MockedFunction<typeof usePatients>;

// Mock patient data
const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'John Doe',
    date_of_birth: '1980-01-01',
    diagnosis: 'Hypertension',
    discharge_date: '2024-01-01',
    required_followup: 'Cardiology',
    insurance: 'Blue Cross',
    address: '123 Main St',
    phone: '555-0101',
    email: 'john@example.com',
    referral_status: 'needed',
    leakage_risk_score: 85,
    leakage_risk_level: 'high',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    leakageRisk: {
      score: 85,
      level: 'high' as const,
    },
  },
  {
    id: '2',
    name: 'Jane Smith',
    date_of_birth: '1975-05-15',
    diagnosis: 'Diabetes',
    discharge_date: '2024-01-02',
    required_followup: 'Endocrinology',
    insurance: 'Aetna',
    address: '456 Oak Ave',
    phone: '555-0102',
    email: 'jane@example.com',
    referral_status: 'sent',
    leakage_risk_score: 65,
    leakage_risk_level: 'medium',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    leakageRisk: {
      score: 65,
      level: 'medium' as const,
    },
  },
];

// Mock other hooks
jest.mock('@/hooks/use-optimistic-updates', () => ({
  useOptimisticListUpdates: () => ({
    searchOptimistic: jest.fn((query: string) => 
      mockPatients.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.diagnosis.toLowerCase().includes(query.toLowerCase())
      )
    ),
    sortOptimistic: jest.fn(),
    filterOptimistic: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-keyboard-navigation', () => ({
  useListKeyboardNavigation: () => ({
    selectedIndex: -1,
    setSelectedIndex: jest.fn(),
    focusItem: jest.fn(),
    setItemRef: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock timers for debouncing
jest.useFakeTimers();

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
};

describe('Dashboard Search Functionality', () => {
  beforeEach(() => {
    mockUsePatients.mockReturnValue({
      data: mockPatients,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isFetching: false,
      isError: false,
      isRefetching: false,
      failureCount: 0,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('should render search input with correct placeholder', () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText(/Search patients by name, diagnosis, or service/);
    expect(searchInput).toBeDefined();
  });

  it('should update search term when typing', () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText(/Search patients by name, diagnosis, or service/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect((searchInput as HTMLInputElement).value).toBe('John');
  });

  it('should show searching indicator when typing', () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText(/Search patients by name, diagnosis, or service/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // Should show loading spinner while searching
    const loadingSpinner = screen.getByRole('generic', { hidden: true });
    expect(loadingSpinner).toBeDefined();
  });

  it('should debounce search queries', async () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText(/Search patients by name, diagnosis, or service/);
    
    // Type quickly
    fireEvent.change(searchInput, { target: { value: 'J' } });
    fireEvent.change(searchInput, { target: { value: 'Jo' } });
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // usePatients should not be called immediately
    expect(mockUsePatients).toHaveBeenCalledTimes(1); // Initial call only
    
    // Fast-forward time to trigger debounce
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      // Now usePatients should be called with search filter
      expect(mockUsePatients).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'John'
        }),
        true
      );
    });
  });

  it('should show clear button when search has value', () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText(/Search patients by name, diagnosis, or service/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    const clearButton = screen.getByRole('button', { name: /Clear search/ });
    expect(clearButton).toBeDefined();
  });

  it('should clear search when clear button is clicked', () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText(/Search patients by name, diagnosis, or service/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    const clearButton = screen.getByRole('button', { name: /Clear search/ });
    fireEvent.click(clearButton);
    
    expect((searchInput as HTMLInputElement).value).toBe('');
  });

  it('should show search history button when there is history', async () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText(/Search patients by name, diagnosis, or service/);
    
    // Type a meaningful search term
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });
    
    // Fast-forward to complete debounce and add to history
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      const historyButton = screen.getByRole('button', { name: /Search history/ });
      expect(historyButton).toBeDefined();
    });
  });

  it('should clear search on Escape key', () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText(/Search patients by name, diagnosis, or service/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    
    expect((searchInput as HTMLInputElement).value).toBe('');
  });

  it('should show filter status when search is active', () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText(/Search patients by name, diagnosis, or service/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // Should show filter status indicator
    const filterStatus = screen.getByText(/matching your filters/);
    expect(filterStatus).toBeDefined();
  });

  it('should show searching status in filter indicator', () => {
    renderDashboard();
    
    const searchInput = screen.getByPlaceholderText(/Search patients by name, diagnosis, or service/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // Should show "Searching..." status
    const searchingStatus = screen.getByText(/Searching.../);
    expect(searchingStatus).toBeDefined();
  });
});