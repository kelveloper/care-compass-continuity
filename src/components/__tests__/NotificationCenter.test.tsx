import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationCenter } from '../NotificationCenter';
import { useNotifications } from '@/hooks/use-notifications';

// Mock the useNotifications hook
jest.mock('@/hooks/use-notifications');

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Bell: () => <div data-testid="bell-icon">Bell</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  CheckCheck: () => <div data-testid="check-check-icon">CheckCheck</div>,
  Trash2: () => <div data-testid="trash-icon">Trash2</div>,
  Volume2: () => <div data-testid="volume-icon">Volume2</div>,
  VolumeX: () => <div data-testid="volume-x-icon">VolumeX</div>,
  Monitor: () => <div data-testid="monitor-icon">Monitor</div>,
  MonitorX: () => <div data-testid="monitor-x-icon">MonitorX</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

// Mock UI components that might cause issues
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => 
    asChild ? children : <div data-testid="popover-trigger">{children}</div>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog">{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-description">{children}</div>,
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => 
    asChild ? children : <div data-testid="dialog-trigger">{children}</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

describe('NotificationCenter', () => {
  const mockNotifications = [
    {
      id: '1',
      referralId: 'ref-1',
      patientName: 'John Doe',
      providerName: 'Dr. Smith',
      oldStatus: 'pending',
      newStatus: 'sent',
      message: 'Referral for John Doe has been sent to the provider',
      type: 'status_change' as const,
      read: false,
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      referralId: 'ref-2',
      patientName: 'Jane Smith',
      providerName: 'Dr. Johnson',
      oldStatus: 'sent',
      newStatus: 'scheduled',
      message: 'Referral for Jane Smith has been scheduled',
      type: 'appointment' as const,
      read: true,
      timestamp: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    mockUseNotifications.mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 1,
      preferences: {
        statusChanges: true,
        appointments: true,
        completions: true,
        cancellations: true,
        sound: true,
        desktop: true,
      },
      isLoading: false,
      error: null,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      clearNotifications: jest.fn(),
      updatePreferences: jest.fn(),
      notifyStatusChange: jest.fn(),
      notifyAppointmentScheduled: jest.fn(),
      notifyReferralCompleted: jest.fn(),
      notifyReferralCancelled: jest.fn(),
    });
  });

  it('renders notification bell button', () => {
    render(<NotificationCenter />);
    
    const bellIcon = screen.getByTestId('bell-icon');
    expect(bellIcon).toBeInTheDocument();
  });

  it('shows unread count badge when there are unread notifications', () => {
    render(<NotificationCenter />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('does not show badge when all notifications are read', () => {
    mockUseNotifications.mockReturnValue({
      notifications: mockNotifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
      preferences: {
        statusChanges: true,
        appointments: true,
        completions: true,
        cancellations: true,
        sound: true,
        desktop: true,
      },
      isLoading: false,
      error: null,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      clearNotifications: jest.fn(),
      updatePreferences: jest.fn(),
      notifyStatusChange: jest.fn(),
      notifyAppointmentScheduled: jest.fn(),
      notifyReferralCompleted: jest.fn(),
      notifyReferralCancelled: jest.fn(),
    });

    render(<NotificationCenter />);
    
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      preferences: {
        statusChanges: true,
        appointments: true,
        completions: true,
        cancellations: true,
        sound: true,
        desktop: true,
      },
      isLoading: false,
      error: null,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      clearNotifications: jest.fn(),
      updatePreferences: jest.fn(),
      notifyStatusChange: jest.fn(),
      notifyAppointmentScheduled: jest.fn(),
      notifyReferralCompleted: jest.fn(),
      notifyReferralCancelled: jest.fn(),
    });

    render(<NotificationCenter />);
    
    // Check that the component renders (by checking for the popover)
    const popover = screen.getByTestId('popover');
    expect(popover).toBeInTheDocument();
    
    // Check for empty state text
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    expect(screen.getByText("You'll see referral updates here")).toBeInTheDocument();
  });
});