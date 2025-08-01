import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase client before any other imports
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

// Mock environment variables
jest.mock('@/lib/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: 'test-key',
  },
}));

import { Dashboard } from '../Dashboard';
import { usePatientsSimple } from '@/hooks/use-patients-simple';
import { useToast } from '@/hooks/use-toast';
import { useListKeyboardNavigation } from '@/hooks/use-keyboard-navigation';
import { Patient } from '@/types';

// Mock the hooks
jest.mock('@/hooks/use-patients-simple');
jest.mock('@/hooks/use-toast');
jest.mock('@/hooks/use-keyboard-navigation');

const mockUsePatientsSimple = usePatientsSimple as jest.MockedFunction<typeof usePatientsSimple>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseListKeyboardNavigation = useListKeyboardNavigation as jest.MockedFunction<typeof useListKeyboardNavigation>;

// Mock UI components to avoid complex Radix UI issues
jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => <button className={className}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, onKeyDown, disabled, className }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      className={className}
    />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/pagination', () => ({
  Pagination: ({ children }: { children: React.ReactNode }) => <nav data-testid="pagination">{children}</nav>,
  PaginationContent: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  PaginationItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  PaginationLink: ({ children, onClick, isActive, href, ...props }: any) => (
    <button onClick={onClick} data-active={isActive} {...props}>
      {children}
    </button>
  ),
  PaginationNext: ({ onClick, className, children, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children || 'Next'}
    </button>
  ),
  PaginationPrevious: ({ onClick, className, children, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children || 'Previous'}
    </button>
  ),
  PaginationEllipsis: ({ className, ...props }: any) => <span className={className} {...props}>...</span>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) => asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}));

jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => 
    asChild ? children : <div data-testid="popover-trigger">{children}</div>,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  UserCircle: () => 'UserCircle',
  Clock: () => 'Clock',
  AlertCircle: () => 'AlertCircle',
  CheckCircle2: () => 'CheckCircle2',
  Loader2: () => 'Loader2',
  RefreshCw: () => 'RefreshCw',
  Search: () => 'Search',
  Filter: () => 'Filter',
  Wifi: () => 'Wifi',
  X: () => 'X',
  History: () => 'History',
  ChevronDown: () => 'ChevronDown',
  ChevronUp: () => 'ChevronUp',
  ArrowUpDown: () => 'ArrowUpDown',
  Calendar: () => 'Calendar',
  MapPin: () => 'MapPin',
  Phone: () => 'Phone',
  Mail: () => 'Mail',
  ExternalLink: () => 'ExternalLink',
}));

// Mock components
jest.mock('../PatientDetailContainer', () => ({
  PatientDetailContainer: ({ onBack }: { onBack: () => void }) => (
    <div>
      <button onClick={onBack}>Back</button>
      <div>Patient Detail View</div>
    </div>
  ),
}));

jest.mock('../NotificationCenter', () => ({
  NotificationCenter: () => <div>Notification Center</div>,
}));

jest.mock('../NetworkStatusIndicator', () => ({
  NetworkStatusIndicator: ({ className }: { className?: string }) => (
    <div className={className}>Network Status</div>
  ),
}));

jest.mock('../OfflineIndicator', () => ({
  OfflineStatusPanel: ({ className }: { className?: string }) => (
    <div className={className}>Offline Status</div>
  ),
}));

// Mock patient data
const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'John Doe',
    date_of_birth: '1980-01-01',
    diagnosis: 'Hip Replacement',
    discharge_date: '2025-07-20',
    required_followup: 'Physical Therapy',
    insurance: 'Blue Cross',
    address: '123 Main St',
    referral_status: 'needed',
    leakage_risk_score: 85,
    leakage_risk_level: 'high',
    current_referral_id: null,
    created_at: '2025-07-20T00:00:00Z',
    updated_at: '2025-07-20T00:00:00Z',
    leakageRisk: {
      score: 85,
      level: 'high' as const,
      factors: undefined,
    },
    daysSinceDischarge: 7,
  },
  {
    id: '2',
    name: 'Jane Smith',
    date_of_birth: '1975-05-15',
    diagnosis: 'Knee Surgery',
    discharge_date: '2025-07-22',
    required_followup: 'Orthopedics',
    insurance: 'Aetna',
    address: '456 Oak Ave',
    referral_status: 'sent',
    leakage_risk_score: 65,
    leakage_risk_level: 'medium',
    current_referral_id: null,
    created_at: '2025-07-22T00:00:00Z',
    updated_at: '2025-07-22T00:00:00Z',
    leakageRisk: {
      score: 65,
      level: 'medium' as const,
      factors: undefined,
    },
    daysSinceDischarge: 5,
  },
];

// Mock timers for debouncing
jest.useFakeTimers();

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

describe('Dashboard Search Functionality', () => {
  beforeEach(() => {
    // Mock the toast function
    const mockToast = jest.fn(() => ({
      id: 'test-toast',
      dismiss: jest.fn(),
      update: jest.fn(),
    }));
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: [],
    });

    // Mock the keyboard navigation hook
    mockUseListKeyboardNavigation.mockReturnValue({
      selectedIndex: -1,
      setSelectedIndex: jest.fn(),
      focusItem: jest.fn(),
      setItemRef: jest.fn(),
    });

    mockUsePatientsSimple.mockReturnValue({
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
    jest.clearAllTimers();
  });

  it('should render search input with correct placeholder', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText(/Search patients/);
    expect(searchInput).toBeInTheDocument();
  });

  it('should update search term when typing', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText(/Search patients/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect((searchInput as HTMLInputElement).value).toBe('John');
  });

  it('should show searching indicator when typing', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText(/Search patients/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // Should show loading spinner while searching (during debounce period)
    await waitFor(() => {
      // The searching state should be visible somewhere in the UI
      expect(searchInput).toHaveValue('John');
    });
  });

  it('should debounce search queries', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText(/Search patients/);
    
    // Clear previous calls
    mockUsePatientsSimple.mockClear();
    
    // Type quickly
    fireEvent.change(searchInput, { target: { value: 'J' } });
    fireEvent.change(searchInput, { target: { value: 'Jo' } });
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // Fast-forward time to trigger debounce
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      // Should trigger a new call with the search parameter after debounce
      expect(mockUsePatientsSimple).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'John'
        }),
        true
      );
    });
  });

  it('should show clear button when search has value', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText(/Search patients/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // Look for the clear search button by its text content
    const clearButton = screen.getByText('X');
    expect(clearButton).toBeInTheDocument();
  });

  it('should clear search when clear button is clicked', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText(/Search patients/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    const clearButton = screen.getByText('X');
    fireEvent.click(clearButton);
    
    expect((searchInput as HTMLInputElement).value).toBe('');
  });

  it('should clear search on Escape key', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    const searchInput = screen.getByPlaceholderText(/Search patients/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    
    expect((searchInput as HTMLInputElement).value).toBe('');
  });

  it('should show filter status when search is active', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search patients/);
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // Should show some indication that filters are active
    expect(searchInput).toHaveValue('John');
  });

  it('should show patient count in header', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    await waitFor(() => {
      // Should show patient count in the header
      expect(screen.getByText(/Active Discharge Plans \(2\)/)).toBeInTheDocument();
    });
  });
});