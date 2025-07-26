import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReferralManagement } from '../ReferralManagement';
import { Patient, Provider, ReferralStatus } from '@/types';

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
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
  phone: '555-0123',
  email: 'john@example.com',
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
  email: 'provider@example.com',
  specialties: ['Physical Therapy', 'Sports Medicine'],
  accepted_insurance: ['Blue Cross Blue Shield'],
  rating: 4.5,
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
    
    expect(screen.getByText('Required Follow-up Care')).toBeInTheDocument();
    expect(screen.getByText('Physical therapy')).toBeInTheDocument();
    expect(screen.getByText('Add Follow-up Care')).toBeInTheDocument();
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
    expect(screen.getByText('Physical Therapy')).toBeInTheDocument();
    expect(screen.getByText('Send Referral')).toBeInTheDocument();
  });

  it('shows send referral confirmation dialog when send button is clicked', async () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
      />
    );
    
    fireEvent.click(screen.getByText('Send Referral'));
    
    await waitFor(() => {
      expect(screen.getByText('Send Referral Confirmation')).toBeInTheDocument();
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
    expect(screen.getByText('Schedule Appointment')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows schedule dialog when schedule button is clicked', async () => {
    render(
      <ReferralManagement 
        {...defaultProps} 
        selectedProvider={mockProvider}
        activeReferral={mockActiveReferral}
      />
    );
    
    fireEvent.click(screen.getByText('Schedule Appointment'));
    
    await waitFor(() => {
      expect(screen.getByText('Schedule Appointment')).toBeInTheDocument();
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
    
    fireEvent.click(screen.getByText('Mark as Completed'));
    
    await waitFor(() => {
      expect(screen.getByText('Complete Referral')).toBeInTheDocument();
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
    
    fireEvent.click(screen.getByText('Cancel'));
    
    await waitFor(() => {
      expect(screen.getByText('Cancel Referral')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to cancel this referral/)).toBeInTheDocument();
    });
  });

  it('calls onAddFollowupCare when add button is clicked', () => {
    render(<ReferralManagement {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Add Follow-up Care'));
    
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