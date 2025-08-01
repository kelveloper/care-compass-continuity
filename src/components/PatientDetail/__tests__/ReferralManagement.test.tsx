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
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock the notifications hook
jest.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifyStatusChange: jest.fn(),
    notifyAppointmentScheduled: jest.fn(),
    notifyReferralCompleted: jest.fn(),
    notifyReferralCancelled: jest.fn(),
  }),
}));

// Mock the optimistic updates hook
jest.mock('@/hooks/use-optimistic-updates', () => ({
  useOptimisticUpdates: () => ({
    createReferral: jest.fn(),
    updateReferralStatus: jest.fn(),
    updatePatientInfo: jest.fn(),
    selectProvider: jest.fn(),
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
    
    expect(screen.getByText('Provider Selected')).toBeInTheDocument();
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
});