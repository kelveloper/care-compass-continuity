import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '../use-notifications';
import { useToast } from '../use-toast';

// Mock the useToast hook
jest.mock('../use-toast');

const mockToast = jest.fn();
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: jest.fn().mockResolvedValue('granted'),
  },
  configurable: true,
});

// Mock AudioContext
Object.defineProperty(window, 'AudioContext', {
  value: jest.fn().mockImplementation(() => ({
    createOscillator: jest.fn().mockReturnValue({
      connect: jest.fn(),
      frequency: {
        setValueAtTime: jest.fn(),
      },
      start: jest.fn(),
      stop: jest.fn(),
    }),
    createGain: jest.fn().mockReturnValue({
      connect: jest.fn(),
      gain: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
    }),
    destination: {},
    currentTime: 0,
  })),
  configurable: true,
});

describe('useNotifications', () => {
  beforeEach(() => {
    mockUseToast.mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: jest.fn(),
    });
    localStorageMock.getItem.mockReturnValue(null);
    jest.clearAllMocks();
  });

  it('initializes with default preferences', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.preferences).toEqual({
      statusChanges: true,
      appointments: true,
      completions: true,
      cancellations: true,
      sound: false,
      desktop: false,
    });
  });

  it('loads preferences from localStorage', () => {
    const savedPreferences = {
      statusChanges: false,
      appointments: true,
      completions: false,
      cancellations: true,
      sound: true,
      desktop: true,
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedPreferences));

    const { result } = renderHook(() => useNotifications());

    expect(result.current.preferences).toEqual(savedPreferences);
  });

  it('updates preferences and saves to localStorage', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.updatePreferences({ sound: true, desktop: true });
    });

    expect(result.current.preferences.sound).toBe(true);
    expect(result.current.preferences.desktop).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'notification-preferences',
      JSON.stringify({
        statusChanges: true,
        appointments: true,
        completions: true,
        cancellations: true,
        sound: true,
        desktop: true,
      })
    );
  });

  it('notifies status change and shows toast', () => {
    const { result } = renderHook(() => useNotifications());

    const mockReferral = {
      id: 'ref-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      service_type: 'Physical Therapy',
      status: 'sent' as const,
      scheduled_date: null,
      completed_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    act(() => {
      result.current.notifyStatusChange(mockReferral, 'needed', 'John Doe', 'Dr. Smith');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      referralId: 'ref-1',
      patientName: 'John Doe',
      providerName: 'Dr. Smith',
      oldStatus: 'needed',
      newStatus: 'sent',
      type: 'status_change',
      read: false,
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Referral Status Updated',
      description: 'Referral for John Doe has been sent to the provider',
      variant: 'default',
      duration: 5000,
    });
  });

  it('notifies appointment scheduled', () => {
    const { result } = renderHook(() => useNotifications());

    const mockReferral = {
      id: 'ref-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      service_type: 'Physical Therapy',
      status: 'scheduled' as const,
      scheduled_date: '2024-01-15T10:00:00Z',
      completed_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    act(() => {
      result.current.notifyAppointmentScheduled(mockReferral, 'John Doe', 'Dr. Smith');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('appointment');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Appointment Scheduled',
      description: expect.stringContaining('Appointment scheduled for John Doe with Dr. Smith'),
      duration: 5000,
    });
  });

  it('notifies referral completion', () => {
    const { result } = renderHook(() => useNotifications());

    const mockReferral = {
      id: 'ref-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      service_type: 'Physical Therapy',
      status: 'completed' as const,
      scheduled_date: '2024-01-15T10:00:00Z',
      completed_date: new Date().toISOString(),
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    act(() => {
      result.current.notifyReferralCompleted(mockReferral, 'John Doe', 'Dr. Smith');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('completion');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Care Completed',
      description: 'Care completed for John Doe with Dr. Smith',
      duration: 5000,
    });
  });

  it('notifies referral cancellation with destructive variant', () => {
    const { result } = renderHook(() => useNotifications());

    const mockReferral = {
      id: 'ref-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      service_type: 'Physical Therapy',
      status: 'cancelled' as const,
      scheduled_date: null,
      completed_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    act(() => {
      result.current.notifyReferralCancelled(mockReferral, 'John Doe', 'Dr. Smith');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('cancellation');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Referral Cancelled',
      description: 'Referral cancelled for John Doe with Dr. Smith',
      variant: 'destructive',
      duration: 5000,
    });
  });

  it('marks notification as read', () => {
    const { result } = renderHook(() => useNotifications());

    // Add a notification first
    const mockReferral = {
      id: 'ref-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      service_type: 'Physical Therapy',
      status: 'sent' as const,
      scheduled_date: null,
      completed_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    act(() => {
      result.current.notifyStatusChange(mockReferral, 'needed', 'John Doe', 'Dr. Smith');
    });

    const notificationId = result.current.notifications[0].id;
    expect(result.current.unreadCount).toBe(1);

    act(() => {
      result.current.markAsRead(notificationId);
    });

    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('marks all notifications as read', () => {
    const { result } = renderHook(() => useNotifications());

    // Add multiple notifications
    const mockReferral1 = {
      id: 'ref-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      service_type: 'Physical Therapy',
      status: 'sent' as const,
      scheduled_date: null,
      completed_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockReferral2 = {
      id: 'ref-2',
      patient_id: 'patient-2',
      provider_id: 'provider-2',
      service_type: 'Cardiology',
      status: 'scheduled' as const,
      scheduled_date: new Date().toISOString(),
      completed_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    act(() => {
      result.current.notifyStatusChange(mockReferral1, 'needed', 'John Doe', 'Dr. Smith');
      result.current.notifyAppointmentScheduled(mockReferral2, 'Jane Doe', 'Dr. Johnson');
    });

    expect(result.current.unreadCount).toBe(2);

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.notifications.every(n => n.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('clears all notifications', () => {
    const { result } = renderHook(() => useNotifications());

    // Add a notification first
    const mockReferral = {
      id: 'ref-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      service_type: 'Physical Therapy',
      status: 'sent' as const,
      scheduled_date: null,
      completed_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    act(() => {
      result.current.notifyStatusChange(mockReferral, 'needed', 'John Doe', 'Dr. Smith');
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      result.current.clearNotifications();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('respects notification preferences', () => {
    const { result } = renderHook(() => useNotifications());

    // Disable status change notifications
    act(() => {
      result.current.updatePreferences({ statusChanges: false });
    });

    const mockReferral = {
      id: 'ref-1',
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      service_type: 'Physical Therapy',
      status: 'sent' as const,
      scheduled_date: null,
      completed_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    act(() => {
      result.current.notifyStatusChange(mockReferral, 'needed', 'John Doe', 'Dr. Smith');
    });

    // Should not add notification when disabled
    expect(result.current.notifications).toHaveLength(0);
    expect(mockToast).not.toHaveBeenCalled();
  });
});