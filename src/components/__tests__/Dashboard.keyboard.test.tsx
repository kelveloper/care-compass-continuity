import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import { usePatients } from '@/hooks/use-patients';

// Mock the hooks
jest.mock('@/hooks/use-patients');
jest.mock('@/hooks/use-optimistic-updates', () => ({
  useOptimisticListUpdates: () => ({
    searchOptimistic: jest.fn((query) => []),
    sortOptimistic: jest.fn(),
    filterOptimistic: jest.fn(),
  }),
}));

const mockUsePatients = usePatients as jest.MockedFunction<typeof usePatients>;

// Mock patient data
const mockPatients = [
  {
    id: '1',
    name: 'John Doe',
    diagnosis: 'Hip Replacement',
    discharge_date: '2025-07-20',
    required_followup: 'Physical Therapy',
    insurance: 'Blue Cross',
    address: '123 Main St',
    referral_status: 'needed',
    leakageRisk: {
      score: 85,
      level: 'high' as const,
      factors: []
    },
    daysSinceDischarge: 7,
  },
  {
    id: '2',
    name: 'Jane Smith',
    diagnosis: 'Knee Surgery',
    discharge_date: '2025-07-22',
    required_followup: 'Orthopedics',
    insurance: 'Aetna',
    address: '456 Oak Ave',
    referral_status: 'sent',
    leakageRisk: {
      score: 65,
      level: 'medium' as const,
      factors: []
    },
    daysSinceDischarge: 5,
  },
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Keyboard Navigation', () => {
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
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should focus search input when "/" key is pressed', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search patients/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search patients/);
    
    // Press "/" key
    fireEvent.keyDown(document, { key: '/' });
    
    // Check if search input is focused
    expect(searchInput).toHaveFocus();
  });

  it('should clear filters when Escape key is pressed', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search patients/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search patients/);
    
    // Add some search text
    fireEvent.change(searchInput, { target: { value: 'John' } });
    expect(searchInput).toHaveValue('John');
    
    // Press Escape key (not while focused on input)
    fireEvent.blur(searchInput);
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // Check if search is cleared
    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('should navigate patient list with arrow keys', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Get patient cards
    const patientCards = screen.getAllByRole('button', { name: /View details for/ });
    expect(patientCards).toHaveLength(2);

    // Focus first patient card
    patientCards[0].focus();
    expect(patientCards[0]).toHaveFocus();

    // Press ArrowDown to move to next patient
    fireEvent.keyDown(patientCards[0], { key: 'ArrowDown' });
    
    // Second patient should be focused
    expect(patientCards[1]).toHaveFocus();

    // Press ArrowUp to move back to first patient
    fireEvent.keyDown(patientCards[1], { key: 'ArrowUp' });
    
    // First patient should be focused again
    expect(patientCards[0]).toHaveFocus();
  });

  it('should select patient when Enter key is pressed', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const patientCards = screen.getAllByRole('button', { name: /View details for/ });
    
    // Focus first patient card
    patientCards[0].focus();
    
    // Press Enter to select patient
    fireEvent.keyDown(patientCards[0], { key: 'Enter' });
    
    // Should navigate to patient detail view
    await waitFor(() => {
      expect(screen.getByText(/Discharge Plan:/)).toBeInTheDocument();
    });
  });

  it('should show keyboard shortcuts in help text', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Keyboard shortcuts:/)).toBeInTheDocument();
    });

    // Check for keyboard shortcut indicators
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('↑↓')).toBeInTheDocument();
    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });
});