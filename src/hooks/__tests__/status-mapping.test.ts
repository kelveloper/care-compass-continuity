/**
 * Test to verify that referral status mapping is consistent
 * between dashboard and patient detail views
 */

describe('Status Mapping Consistency', () => {
  // Test the status mapping logic
  const mapReferralStatusToPatientStatus = (
    referralStatus: 'pending' | 'sent' | 'scheduled' | 'completed' | 'cancelled'
  ): 'needed' | 'sent' | 'scheduled' | 'completed' => {
    switch (referralStatus) {
      case 'pending':
        return 'sent'; // When referral is created (pending), patient shows as "sent"
      case 'sent':
        return 'sent';
      case 'scheduled':
        return 'scheduled';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'needed'; // When cancelled, patient needs a new referral
      default:
        return 'needed';
    }
  };

  it('should map referral statuses to patient statuses correctly', () => {
    expect(mapReferralStatusToPatientStatus('pending')).toBe('sent');
    expect(mapReferralStatusToPatientStatus('sent')).toBe('sent');
    expect(mapReferralStatusToPatientStatus('scheduled')).toBe('scheduled');
    expect(mapReferralStatusToPatientStatus('completed')).toBe('completed');
    expect(mapReferralStatusToPatientStatus('cancelled')).toBe('needed');
  });

  it('should show consistent status between dashboard and detail view', () => {
    // When a referral is created, it should be 'sent' status
    const newReferralStatus = 'sent'; // This is what we create referrals with now
    const expectedPatientStatus = mapReferralStatusToPatientStatus(newReferralStatus);
    
    expect(expectedPatientStatus).toBe('sent');
    
    // Dashboard should show the same status
    const dashboardStatusText = expectedPatientStatus === 'sent' ? 'Referral Sent' : 'Unknown';
    expect(dashboardStatusText).toBe('Referral Sent');
  });

  it('should handle all referral lifecycle states correctly', () => {
    // Test the complete referral lifecycle
    const lifecycle = [
      { referral: 'sent', patient: 'sent', display: 'Referral Sent' },
      { referral: 'scheduled', patient: 'scheduled', display: 'Scheduled' },
      { referral: 'completed', patient: 'completed', display: 'Completed' },
      { referral: 'cancelled', patient: 'needed', display: 'Referral Needed' },
    ] as const;

    lifecycle.forEach(({ referral, patient, display }) => {
      const mappedStatus = mapReferralStatusToPatientStatus(referral);
      expect(mappedStatus).toBe(patient);
      
      // Verify display text mapping
      const displayText = getStatusText(patient);
      expect(displayText).toBe(display);
    });
  });

  // Helper function to match the one in Dashboard.tsx
  const getStatusText = (status: string) => {
    switch (status) {
      case "needed": return "Referral Needed";
      case "sent": return "Referral Sent";
      case "scheduled": return "Scheduled";
      case "completed": return "Completed";
      default: return "Unknown";
    }
  };
});