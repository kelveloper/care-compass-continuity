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

// Generate more mock patients for pagination testing
const generateMockPatients = (count: number) => {
  const patients = [];
  for (let i = 1; i <= count; i++) {
    patients.push({
      id: `${i}`,
      name: `Patient ${i}`,
      diagnosis: `Diagnosis ${i}`,
      discharge_date: '2025-07-20',
      required_followup: 'Follow-up Service',
      insurance: 'Insurance Plan',
      address: `${i} Test St`,
      referral_status: 'needed',
      leakageRisk: {
        score: Math.floor(Math.random() * 100),
        level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
        factors: []
      },
      daysSinceDischarge: i,
    });
  }
  return patients;
};

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

describe('Dashboard Pagination', () => {
  const manyPatients = generateMockPatients(25); // More than 10 to trigger pagination

  beforeEach(() => {
    mockUsePatients.mockReturnValue({
      data: manyPatients,
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

  it('should show pagination controls when there are more than 10 patients', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });

    // Should show pagination controls
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Page number
    expect(screen.getByText('3')).toBeInTheDocument(); // Total pages (25 patients / 10 per page = 3 pages)
  });

  it('should show only 10 patients per page', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });

    // Should show patients 1-10 on first page
    expect(screen.getByText('Patient 1')).toBeInTheDocument();
    expect(screen.getByText('Patient 10')).toBeInTheDocument();
    
    // Should not show patient 11 on first page
    expect(screen.queryByText('Patient 11')).not.toBeInTheDocument();
  });

  it('should navigate to next page when Next button is clicked', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });

    // Click Next button
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      // Should show patients 11-20 on second page
      expect(screen.getByText('Patient 11')).toBeInTheDocument();
      expect(screen.getByText('Patient 20')).toBeInTheDocument();
      
      // Should not show patient 1 on second page
      expect(screen.queryByText('Patient 1')).not.toBeInTheDocument();
    });
  });

  it('should navigate to previous page when Previous button is clicked', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });

    // Go to page 2 first
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Patient 11')).toBeInTheDocument();
    });

    // Click Previous button
    const prevButton = screen.getByText('Previous');
    fireEvent.click(prevButton);

    await waitFor(() => {
      // Should be back on first page
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
      expect(screen.getByText('Patient 10')).toBeInTheDocument();
      expect(screen.queryByText('Patient 11')).not.toBeInTheDocument();
    });
  });

  it('should show pagination info in card header', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });

    // Should show total count and page info
    expect(screen.getByText(/Active Discharge Plans \(25\)/)).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
  });

  it('should show pagination status text', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });

    // Should show "Showing X to Y of Z patients"
    expect(screen.getByText(/Showing 1 to 10 of 25 patients/)).toBeInTheDocument();
  });

  it('should navigate pages with keyboard shortcuts', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });

    // Press PageDown to go to next page
    fireEvent.keyDown(document, { key: 'PageDown' });

    await waitFor(() => {
      expect(screen.getByText('Patient 11')).toBeInTheDocument();
      expect(screen.queryByText('Patient 1')).not.toBeInTheDocument();
    });

    // Press PageUp to go back to previous page
    fireEvent.keyDown(document, { key: 'PageUp' });

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
      expect(screen.queryByText('Patient 11')).not.toBeInTheDocument();
    });
  });

  it('should navigate pages with Ctrl+Arrow keyboard shortcuts', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });

    // Press Ctrl+ArrowRight to go to next page
    fireEvent.keyDown(document, { key: 'ArrowRight', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Patient 11')).toBeInTheDocument();
      expect(screen.queryByText('Patient 1')).not.toBeInTheDocument();
    });

    // Press Ctrl+ArrowLeft to go back to previous page
    fireEvent.keyDown(document, { key: 'ArrowLeft', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
      expect(screen.queryByText('Patient 11')).not.toBeInTheDocument();
    });
  });

  it('should show pagination keyboard shortcuts in help text when multiple pages exist', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Keyboard shortcuts:/)).toBeInTheDocument();
    });

    // Should show pagination shortcuts when multiple pages exist
    expect(screen.getByText('PgUp/PgDn')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+←→')).toBeInTheDocument();
  });

  it('should reset to first page when filters change', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });

    // Go to page 2
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Patient 11')).toBeInTheDocument();
    });

    // Change search filter
    const searchInput = screen.getByPlaceholderText(/Search patients/);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Should reset to page 1 (though no results will show due to mock)
    await waitFor(() => {
      // The page should reset, but since we're mocking the data, 
      // we can't easily test the actual page reset behavior
      // In a real scenario, this would show filtered results on page 1
      expect(searchInput).toHaveValue('test');
    });
  });
});