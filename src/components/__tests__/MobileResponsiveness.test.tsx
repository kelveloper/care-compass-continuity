import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { MobileOptimizedCard } from '../MobileOptimizedCard';
import { MobileNavigation } from '../MobileNavigation';
import { MobileButton } from '../MobileButton';

// Mock the mobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
  useIsTablet: jest.fn(),
  useScreenSize: jest.fn(),
  useIsTouchDevice: jest.fn(),
}));

// Mock other hooks and dependencies
jest.mock('@/hooks/use-patients', () => ({
  usePatients: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    isFetching: false,
    isError: false,
    isRefetching: false,
    failureCount: 0,
  }),
}));

jest.mock('@/hooks/use-analytics', () => ({
  useInteractionTracking: () => ({
    trackPatientAction: jest.fn(),
    trackFlow: jest.fn(),
  }),
  useEngagementTracking: () => ({
    trackFeatureUse: jest.fn(),
    trackTimeOnPage: jest.fn(),
  }),
  usePerformanceTracking: () => ({
    trackLoadTime: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-keyboard-navigation', () => ({
  useListKeyboardNavigation: () => ({
    selectedIndex: -1,
    setSelectedIndex: jest.fn(),
    focusItem: jest.fn(),
    setItemRef: () => () => {},
  }),
  useKeyboardNavigation: () => ({
    selectedIndex: -1,
    setSelectedIndex: jest.fn(),
    focusItem: jest.fn(),
    setItemRef: () => () => {},
  }),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Menu: () => <div data-testid="menu-icon" />,
  X: () => <div data-testid="x-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  UserCircle: () => <div data-testid="user-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Wifi: () => <div data-testid="wifi-icon" />,
  History: () => <div data-testid="history-icon" />,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </QueryClientProvider>
);

describe('Mobile Responsiveness', () => {
  const { useIsMobile, useScreenSize } = require('@/hooks/use-mobile');
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set default mock values
    useIsMobile.mockReturnValue(false);
    useScreenSize.mockReturnValue({
      width: 1024,
      height: 768,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    });
  });

  describe('MobileOptimizedCard', () => {
    it('should render with mobile-specific classes when on mobile', () => {
      useIsMobile.mockReturnValue(true);
      
      const { container } = render(
        <MobileOptimizedCard onClick={jest.fn()}>
          <div>Test content</div>
        </MobileOptimizedCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('touch-target');
      expect(card.className).toContain('active:scale-[0.98]');
    });

    it('should render without mobile-specific classes on desktop', () => {
      useIsMobile.mockReturnValue(false);
      
      const { container } = render(
        <MobileOptimizedCard onClick={jest.fn()}>
          <div>Test content</div>
        </MobileOptimizedCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('hover:shadow-md');
    });

    it('should handle touch interactions on mobile', () => {
      useIsMobile.mockReturnValue(true);
      const mockClick = jest.fn();
      
      render(
        <MobileOptimizedCard onClick={mockClick}>
          <div>Test content</div>
        </MobileOptimizedCard>
      );

      const card = screen.getByText('Test content').parentElement?.parentElement;
      
      if (card) {
        fireEvent.click(card);
        expect(mockClick).toHaveBeenCalled();
      }
    });
  });

  describe('MobileNavigation', () => {
    it('should show compact navigation on mobile', () => {
      useIsMobile.mockReturnValue(true);
      
      render(
        <MobileNavigation
          title="Test Title"
          subtitle="Test Subtitle"
          onBack={jest.fn()}
        />
      );

      // Should show compact title
      const title = screen.getByText('Test Title');
      expect(title.className).toContain('text-lg');
    });

    it('should show full navigation on desktop', () => {
      useIsMobile.mockReturnValue(false);
      
      render(
        <MobileNavigation
          title="Test Title"
          subtitle="Test Subtitle"
          onBack={jest.fn()}
        />
      );

      // Should show larger title
      const title = screen.getByText('Test Title');
      expect(title.className).toContain('text-xl');
    });

    it('should handle back navigation', () => {
      const mockBack = jest.fn();
      
      render(
        <MobileNavigation
          title="Test Title"
          onBack={mockBack}
        />
      );

      const backButton = screen.getByTestId('arrow-left-icon').closest('button');
      if (backButton) {
        fireEvent.click(backButton);
        expect(mockBack).toHaveBeenCalled();
      } else {
        // Fallback: find button by text content
        const buttons = screen.getAllByRole('button', { hidden: true });
        if (buttons.length > 0) {
          fireEvent.click(buttons[0]);
          expect(mockBack).toHaveBeenCalled();
        }
      }
    });
  });

  describe('MobileButton', () => {
    it('should apply mobile-specific sizing', () => {
      useIsMobile.mockReturnValue(true);
      
      render(
        <MobileButton mobileSize="sm" fullWidthOnMobile>
          Test Button
        </MobileButton>
      );

      const button = screen.getByText('Test Button');
      expect(button.className).toContain('w-full');
      expect(button.className).toContain('min-h-[44px]');
      expect(button.className).toContain('touch-target');
    });

    it('should use desktop sizing on larger screens', () => {
      useIsMobile.mockReturnValue(false);
      
      render(
        <MobileButton mobileSize="sm" fullWidthOnMobile>
          Test Button
        </MobileButton>
      );

      const button = screen.getByText('Test Button');
      expect(button.className).not.toContain('w-full');
    });
  });

  describe('Touch Target Accessibility', () => {
    it('should apply touch-target class to mobile buttons', () => {
      useIsMobile.mockReturnValue(true);
      
      render(
        <MobileButton>Test Button</MobileButton>
      );

      const button = screen.getByText('Test Button');
      expect(button.className).toContain('touch-target');
    });
  });

  describe('Responsive Layout', () => {
    it('should apply mobile-specific classes', () => {
      useIsMobile.mockReturnValue(true);
      
      const { container } = render(
        <MobileOptimizedCard>
          <div>Test content</div>
        </MobileOptimizedCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('active:scale-[0.98]');
    });

    it('should apply desktop-specific classes', () => {
      useIsMobile.mockReturnValue(false);
      
      const { container } = render(
        <MobileOptimizedCard>
          <div>Test content</div>
        </MobileOptimizedCard>
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('hover:shadow-md');
    });
  });

  describe('Mobile Hook Integration', () => {
    it('should use mobile hook correctly in components', () => {
      useIsMobile.mockReturnValue(true);
      
      render(
        <MobileNavigation title="Test" />
      );

      // Verify the hook was called
      expect(useIsMobile).toHaveBeenCalled();
    });

    it('should respond to mobile state changes', () => {
      // First render as desktop
      useIsMobile.mockReturnValue(false);
      
      const { rerender } = render(
        <MobileButton fullWidthOnMobile>Test</MobileButton>
      );

      let button = screen.getByText('Test');
      expect(button.className).not.toContain('w-full');

      // Then render as mobile
      useIsMobile.mockReturnValue(true);
      
      rerender(
        <MobileButton fullWidthOnMobile>Test</MobileButton>
      );

      button = screen.getByText('Test');
      expect(button.className).toContain('w-full');
    });
  });
});