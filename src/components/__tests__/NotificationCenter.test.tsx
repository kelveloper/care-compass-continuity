import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationCenter } from '../NotificationCenter';
import { useNotifications } from '@/hooks/use-notifications';

// Mock the useNotifications hook
jest.mock('@/hooks/use-notifications');

const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

describe('NotificationCenter', () => {
  const mockNotifications = [
    {
      id: '1',
      referralId: 'ref-1',
      patientName: 'John Doe',
      providerName: 'Dr. Smith',
      oldStatus: 'needed',
      newStatus: 'sent',
      message: 'Referral for John Doe has been sent to the provider',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'status_change' as const,
    },
    {
      id: '2',
      referralId: 'ref-2',
      patientName: 'Jane Smith',
      providerName: 'Dr. Johnson',
      oldStatus: 'sent',
      newStatus: 'scheduled',
      message: 'Appointment scheduled for Jane Smith with Dr. Johnson',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      read: true,
      type: 'appointment' as const,
    },
  ];

  const mockPreferences = {
    statusChanges: true,
    appointments: true,
    completions: true,
    cancellations: true,
    sound: false,
    desktop: false,
  };

  beforeEach(() => {
    mockUseNotifications.mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 1,
      preferences: mockPreferences,
      isLoading: false,
      error: null,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      updatePreferences: jest.fn(),
      clearNotifications: jest.fn(),
      notifyStatusChange: jest.fn(),
      notifyAppointmentScheduled: jest.fn(),
      notifyReferralCompleted: jest.fn(),
      notifyReferralCancelled: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification bell with unread count badge', () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    expect(bellButton).toBeInTheDocument();
    
    const badge = screen.getByText('1');
    expect(badge).toBeInTheDocument();
  });

  it('shows notifications when bell is clicked', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('displays correct notification content', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Referral for John Doe has been sent to the provider')).toBeInTheDocument();
      expect(screen.getByText('Provider: Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
    });
  });

  it('shows mark all read button when there are unread notifications', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });
  });

  it('calls markAllAsRead when mark all read button is clicked', async () => {
    const mockMarkAllAsRead = jest.fn();
    mockUseNotifications.mockReturnValue({
      ...mockUseNotifications(),
      markAllAsRead: mockMarkAllAsRead,
    });

    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const markAllReadButton = screen.getByText('Mark all read');
      fireEvent.click(markAllReadButton);
      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });
  });

  it('opens settings dialog when settings button is clicked', async () => {
    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);
      
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      expect(screen.getByText('Status Changes')).toBeInTheDocument();
      expect(screen.getByText('Appointments')).toBeInTheDocument();
    });
  });

  it('shows empty state when no notifications', () => {
    mockUseNotifications.mockReturnValue({
      ...mockUseNotifications(),
      notifications: [],
      unreadCount: 0,
    });

    render(<NotificationCenter />);
    
    const bellButton = screen.getByRole('button');
    fireEvent.click(bellButton);
    
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    expect(screen.getByText("You'll see referral updates here")).toBeInTheDocument();
  });

  it('does not show unread badge when unreadCount is 0', () => {
    mockUseNotifications.mockReturnValue({
      ...mockUseNotifications(),
      notifications: [],
      unreadCount: 0,
    });

    render(<NotificationCenter />);
    
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows 99+ when unread count exceeds 99', () => {
    mockUseNotifications.mockReturnValue({
      ...mockUseNotifications(),
      unreadCount: 150,
    });

    render(<NotificationCenter />);
    
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});