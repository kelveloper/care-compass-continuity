import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReferralManagement } from '../ReferralManagement';
import { Patient, Provider, ReferralStatus } from '@/types';

// Mock CSS properties for DOM accessibility
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    marginLeft: '0px',
    marginRight: '0px',
    paddingLeft: '0px',
    paddingRight: '0px',
  }),
});

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock the notifications hook
const mockNotifyStatusChange = jest.fn();
const mockNotifyAppointmentScheduled = jest.fn();
const mockNotifyReferralCompleted = jest.fn();
const mockNotifyReferralCancelled = jest.fn();

jest.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifyStatusChange: mockNotifyStatusChange,
    notifyAppointmentScheduled: mockNotifyAppointmentScheduled,
    notifyReferralCompleted: mockNotifyReferralCompleted,
    notifyReferralCancelled: mockNotifyReferralCancelled,
  }),
}));

// Mock the optimistic updates hook
const mockSelectProvider = jest.fn();
jest.mock('@/hooks/use-optimistic-updates', () => ({
  useOptimisticUpdates: () => ({
    createReferral: jest.fn(),
    updateReferralStatus: jest.fn(),
    updatePatientInfo: jest.fn(),
    selectProvider: mockSelectProvider,
    isCreatingReferral: false,
    isUpdatingReferral: false,
    isUpdatingPatient: false,
    createReferralError: null,
    updateReferralError: null,
    updatePatientError: null,
    resetCreateReferral: jest.fn(),
    resetUpdateReferral: jest.fn(),
    resetUpdatePatient: jest.fn(),
  }),
}));

// Mock the analytics hook
const mockTrackReferralAction = jest.fn();
const mockTrackFlow = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useInteractionTracking: () => ({
    trackPatientAction: jest.fn(),
    trackProviderAction: jest.fn(),
    trackReferralAction: mockTrackReferralAction,
    trackRisk: jest.fn(),
    trackFlow: mockTrackFlow,
  }),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <span>Plus</span>,
  Check: () => <span>Check</span>,
  Clock: () => <span>Clock</span>,
  Phone: () => <span>Phone</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  X: () => <span>X</span>,
  Calendar: () => <span>Calendar</span>,
  Send: () => <span>Send</span>,
  CheckCircle2: () => <span>CheckCircle2</span>,
  Loader2: () => <span>Loader2</span>,
}));

const mockPatient: Patient = {
  id: '1',
  name: 'John Doe',
  date_of_birth: '1980-01-01',
  diagnosis: 'Post-surgical rehabilitation',
  discharge_date: '2024-01-01',
  required_followup: 'Physical therapy',
  insurance: 'Blue Cross Blue Shield',
  address: '123 Main St, City, State',
  leakage_risk_score: 75,
  leakage_risk_level: 'high',
  referral_status: 'needed',
  current_referral_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  leakageRisk: {
    score: 75,
    level: 'high',
  },
};

const mockProvider: Provider = {
  id: '1',
  name: 'Test Provider',
  type: 'Physical Therapy',
  address: '456 Oak St, City, State',
  phone: '555-0456',
  specialties: ['Physical Therapy', 'Sports Medicine'],
  accepted_insurance: ['Blue Cross Blue Shield'],
  rating: 4.5,
  latitude: null,
  longitude: null,
  in_network_plans: ['Blue Cross Blue Shield'],
  created_at: '2024-01-01T00:00:00Z',
  distance: 2.5,
  distanceText: '2.5 miles',
  availability_next: 'Tomorrow at 2:00 PM',
  inNetwork: true,
};

const mockActiveReferral: ReferralStatus = {
  id: '1',
  patientId: '1',
  providerId: '1',
  status: 'sent',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const defaultProps = {
  patient: mockPatient,
  selectedProvider: null,
  activeReferral: null,
  isLoading: false,
  error: null,
  isCreatingReferral: false,
  onAddFollowupCare: jest.fn(),
  onSendReferral: jest.fn(),
  onScheduleReferral: jest.fn(),
  onCompleteReferral: jest.fn(),
  onCancelReferral: jest.fn(),
  onRetryLoad: jest.fn(),
};

describe('ReferralManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders required follow-up care information', () => {
    render(<ReferralManagement {...defaultProps} />);
    
    // Check for the heading using partial text match since it's split by icon
    expect(screen.getByText((content, element) => {
      return element?.textContent === 'PlusRequired Follow-up Care';
    })).toBeInTheDocument();
    expect(screen.getByText('Physical therapy')).toBeInTheDocument();
    expect(screen.getByText(/add follow-up care/i)).toBeInTheDocument();
  });

  it('shows workflow progress indicator', () => {
    render(<ReferralManagement {...defaultProps} />);
    
    expect(screen.getByText('Referral Workflow Progress')).toBeInTheDocument();
    expect(screen.getByText('Select Provider')).toBeInTheDocument();
    expect(screen.getByText('Send Referral')).toBeInTheDocument();
    expect(screen.getByText('Schedule Appointment')).toBeInTheDocument();
    expect(screen.getByText('Complete Care')).toBeInTheDocument();
  });

  it('displays selected provider card when provider is selected', () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
      />
    );
    
    expect(screen.getByText('🎯 Perfect Match Found!')).toBeInTheDocument();
    expect(screen.getByText('Test Provider')).toBeInTheDocument();
    expect(screen.getAllByText('Physical Therapy')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send referral/i })).toBeInTheDocument();
  });

  it('shows send referral confirmation dialog when send button is clicked', async () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
      />
    );
    
    // Find the button specifically (not the text in workflow progress)
    const sendButton = screen.getByRole('button', { name: /send referral/i });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to send this referral to/)).toBeInTheDocument();
    });
  });

  it('displays active referral card when referral exists', () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={mockActiveReferral}
      />
    );
    
    expect(screen.getByText('Referral Sent')).toBeInTheDocument();
    // Find the button specifically (not the text in workflow progress)
    expect(screen.getByRole('button', { name: /schedule appointment/i })).toBeInTheDocument();
    expect(screen.getByText(/cancel/i)).toBeInTheDocument();
  });

  it('shows schedule dialog when schedule button is clicked', async () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={mockActiveReferral}
      />
    );
    
    // Find the button specifically (not the text in workflow progress)
    const scheduleButton = screen.getByRole('button', { name: /schedule appointment/i });
    fireEvent.click(scheduleButton);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Schedule an appointment for/)).toBeInTheDocument();
    });
  });

  it('shows complete dialog when referral is scheduled', async () => {
    const scheduledReferral = { ...mockActiveReferral, status: 'scheduled' as const };
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={scheduledReferral}
      />
    );
    
    const completeButton = screen.getByRole('button', { name: /mark as completed/i });
    fireEvent.click(completeButton);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Mark this referral as completed for/)).toBeInTheDocument();
    });
  });

  it('shows cancel confirmation dialog when cancel button is clicked', async () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={mockActiveReferral}
      />
    );
    
    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to cancel this referral/)).toBeInTheDocument();
    });
  });

  it('calls onAddFollowupCare when add button is clicked', () => {
    render(<ReferralManagement {...defaultProps} />);
    
    const addButton = screen.getByText(/add follow-up care/i);
    fireEvent.click(addButton);
    
    expect(defaultProps.onAddFollowupCare).toHaveBeenCalledTimes(1);
  });

  it('displays error state when error exists', () => {
    const error = new Error('Test error message');
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        error={error}
      />
    );
    
    expect(screen.getByText('Error loading referral data')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        isLoading={true}
      />
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('calls onSendReferral when send referral is confirmed', async () => {
    const mockOnSendReferral = jest.fn().mockResolvedValue(undefined);
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={null}
        onSendReferral={mockOnSendReferral}
      />
    );
    
    // Click send referral button
    const sendButton = screen.getByRole('button', { name: /send referral/i });
    fireEvent.click(sendButton);
    
    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /send referral/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnSendReferral).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onScheduleReferral when schedule appointment is confirmed', async () => {
    const mockOnScheduleReferral = jest.fn().mockResolvedValue(undefined);
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={mockActiveReferral}
        onScheduleReferral={mockOnScheduleReferral}
      />
    );
    
    // Click schedule button
    const scheduleButton = screen.getByRole('button', { name: /schedule appointment/i });
    fireEvent.click(scheduleButton);
    
    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /schedule appointment/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnScheduleReferral).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onCompleteReferral when complete referral is confirmed', async () => {
    const mockOnCompleteReferral = jest.fn().mockResolvedValue(undefined);
    const scheduledReferral = { ...mockActiveReferral, status: 'scheduled' as const };
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={scheduledReferral}
        onCompleteReferral={mockOnCompleteReferral}
      />
    );
    
    // Click complete button
    const completeButton = screen.getByRole('button', { name: /mark as completed/i });
    fireEvent.click(completeButton);
    
    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /complete referral/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnCompleteReferral).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onCancelReferral when cancel referral is confirmed', async () => {
    const mockOnCancelReferral = jest.fn().mockResolvedValue(undefined);
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={mockActiveReferral}
        onCancelReferral={mockOnCancelReferral}
      />
    );
    
    // Click cancel button
    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);
    
    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /cancel referral/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnCancelReferral).toHaveBeenCalledTimes(1);
    });
  });

  it('shows toast notification on successful referral send', async () => {
    const mockOnSendReferral = jest.fn().mockResolvedValue(undefined);
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={null}
        onSendReferral={mockOnSendReferral}
      />
    );
    
    // Click send referral button
    const sendButton = screen.getByRole('button', { name: /send referral/i });
    fireEvent.click(sendButton);
    
    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /send referral/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Referral Sent Successfully",
        description: expect.stringContaining("Referral has been sent to Test Provider"),
      });
    });
  });

  it('shows error toast on failed referral send', async () => {
    const mockOnSendReferral = jest.fn().mockRejectedValue(new Error('Network error'));
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={null}
        onSendReferral={mockOnSendReferral}
      />
    );
    
    // Click send referral button
    const sendButton = screen.getByRole('button', { name: /send referral/i });
    fireEvent.click(sendButton);
    
    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /send referral/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Failed to Send Referral",
        description: "There was an error sending the referral. Please try again.",
        variant: "destructive",
      });
    });
  });

  it('tracks analytics events on referral actions', async () => {
    const mockOnSendReferral = jest.fn().mockResolvedValue(undefined);
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={null}
        onSendReferral={mockOnSendReferral}
      />
    );
    
    // Click send referral button
    const sendButton = screen.getByRole('button', { name: /send referral/i });
    fireEvent.click(sendButton);
    
    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /send referral/i });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockTrackReferralAction).toHaveBeenCalledWith('create');
      expect(mockTrackFlow).toHaveBeenCalledWith('referral_sent', 'referral_management');
    });
  });

  it('displays urgent status for patients with long discharge time', () => {
    const urgentPatient = {
      ...mockPatient,
      discharge_date: '2024-01-01', // This will be many days ago
    };
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        patient={urgentPatient}
      />
    );
    
    expect(screen.getByText('URGENT')).toBeInTheDocument();
    expect(screen.getByText(/Critical window/)).toBeInTheDocument();
  });

  it('shows provider specialties and insurance network status', () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={null}
      />
    );
    
    expect(screen.getByText('Specialties:')).toBeInTheDocument();
    expect(screen.getByText('Sports Medicine')).toBeInTheDocument();
    expect(screen.getByText('In-Network ✓')).toBeInTheDocument();
  });

  it('handles notes input in schedule dialog', async () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={mockActiveReferral}
      />
    );
    
    // Click schedule button
    const scheduleButton = screen.getByRole('button', { name: /schedule appointment/i });
    fireEvent.click(scheduleButton);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    // Add notes
    const notesTextarea = screen.getByLabelText(/notes/i);
    fireEvent.change(notesTextarea, { target: { value: 'Test notes' } });
    
    expect(notesTextarea).toHaveValue('Test notes');
  });

  it('shows different workflow steps based on referral status', () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={mockActiveReferral}
      />
    );
    
    // Check workflow progress indicators
    expect(screen.getByText('Select Provider')).toBeInTheDocument();
    expect(screen.getByText('Send Referral')).toBeInTheDocument();
    expect(screen.getAllByText('Schedule Appointment')).toHaveLength(2); // One in workflow, one as button
    expect(screen.getByText('Complete Care')).toBeInTheDocument();
  });

  it('calls onRetryLoad when retry button is clicked in error state', () => {
    const mockOnRetryLoad = jest.fn();
    const error = new Error('Test error message');
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        error={error}
        onRetryLoad={mockOnRetryLoad}
      />
    );
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(mockOnRetryLoad).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when creating referral', () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={null}
        isCreatingReferral={true}
      />
    );
    
    expect(screen.getByText('Sending...')).toBeInTheDocument();
  });

  it('displays scheduled date when referral is scheduled', () => {
    const scheduledReferral = {
      ...mockActiveReferral,
      status: 'scheduled' as const,
      scheduledDate: '2024-12-25T14:00:00Z',
    };
    
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={scheduledReferral}
      />
    );
    
    expect(screen.getByText('Scheduled Date:')).toBeInTheDocument();
    expect(screen.getByText(/December/)).toBeInTheDocument();
  });
});