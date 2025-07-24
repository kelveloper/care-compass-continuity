import { 
  calculateAge, 
  calculateDaysSinceDischarge, 
  calculateAgeRisk,
  calculateDiagnosisComplexity,
  calculateTimeRisk,
  calculateInsuranceRisk,
  calculateGeographicRisk,
  calculateLeakageRisk,
  enhancePatientData,
  fetchReferralHistory
} from '../risk-calculator';
import { Patient } from '@/types';

// Mock the supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    then: jest.fn().mockResolvedValue({ data: [], error: null })
  }
}));

// Mock fetchReferralHistory function
jest.mock('../risk-calculator', () => {
  const originalModule = jest.requireActual('../risk-calculator');
  return {
    ...originalModule,
    fetchReferralHistory: jest.fn().mockResolvedValue([])
  };
});

// Mock patient data for testing
const mockPatient: Patient = {
  id: 'test-1',
  name: 'Test Patient',
  date_of_birth: '1950-01-01',
  diagnosis: 'Hip Replacement',
  discharge_date: '2025-01-20',
  required_followup: 'Physical Therapy',
  insurance: 'Medicare',
  address: '123 Main St, Boston, MA 02101',
  leakage_risk_score: 85,
  leakage_risk_level: 'high',
  referral_status: 'needed',
  created_at: '2025-01-21T00:00:00Z',
  updated_at: '2025-01-21T00:00:00Z',
  leakageRisk: {
    score: 85,
    level: 'high'
  }
};

describe('Risk Calculator', () => {
  describe('Basic calculations', () => {
    test('calculateAge should return correct age', () => {
      const age = calculateAge('1950-01-01');
      expect(age).toBeGreaterThan(70);
      expect(age).toBeLessThan(80);
    });

    test('calculateDaysSinceDischarge should return positive number', () => {
      const days = calculateDaysSinceDischarge('2025-01-20');
      expect(days).toBeGreaterThanOrEqual(0);
      expect(days).toBeLessThan(10); // Should be recent
    });
  });

  describe('Risk factor calculations', () => {
    test('calculateAgeRisk should return appropriate score for elderly patient', () => {
      const score = calculateAgeRisk('1950-01-01'); // ~75 years old
      expect(score).toBe(25); // Should be in 70-79 range
    });

    test('calculateDiagnosisComplexity should return moderate score for hip replacement', () => {
      const score = calculateDiagnosisComplexity('Hip Replacement');
      expect(score).toBe(65); // Moderate complexity
    });

    test('calculateTimeRisk should return low score for recent discharge', () => {
      const score = calculateTimeRisk('2025-01-20'); // Very recent
      expect(score).toBeLessThanOrEqual(4); // Should be low since recent
    });

    test('calculateInsuranceRisk should return high score for Medicare', () => {
      const score = calculateInsuranceRisk('Medicare');
      expect(score).toBe(75); // High risk due to access limitations
    });

    test('calculateGeographicRisk should return low score for Boston', () => {
      const score = calculateGeographicRisk('123 Main St, Boston, MA 02101');
      expect(score).toBe(20); // Low risk - major medical center
    });
  });

  describe('Comprehensive risk calculation', () => {
    // Mock the fetchReferralHistory function to avoid actual API calls
    beforeEach(() => {
      jest.spyOn(global, 'fetch').mockImplementation(() => 
        Promise.resolve({
          json: () => Promise.resolve([]),
          ok: true
        } as Response)
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('calculateLeakageRisk should return proper risk assessment', async () => {
      const risk = await calculateLeakageRisk(mockPatient);
      expect(risk.score).toBeGreaterThan(0);
      expect(risk.score).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(risk.level);
      expect(risk.factors).toBeDefined();
      expect(risk.factors.age).toBeGreaterThan(0);
      expect(risk.factors.diagnosisComplexity).toBeGreaterThan(0);
      expect(risk.factors.timeSinceDischarge).toBeGreaterThanOrEqual(0);
      expect(risk.factors.insuranceType).toBeGreaterThan(0);
      expect(risk.factors.geographicFactors).toBeGreaterThan(0);
      expect(risk.factors.previousReferralHistory).toBeDefined();
    });

    test('calculateLeakageRisk should handle missing data gracefully', async () => {
      const partialPatient = {
        date_of_birth: '1960-01-01',
        diagnosis: 'Unknown procedure'
      };
      const risk = await calculateLeakageRisk(partialPatient);
      expect(risk.score).toBeGreaterThan(0);
      expect(risk.score).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(risk.level);
    });

    test('risk level thresholds should work correctly', async () => {
      // Test high risk scenario
      const highRiskPatient = {
        date_of_birth: '1940-01-01', // 85 years old
        diagnosis: 'Heart Surgery', // High complexity
        discharge_date: '2025-01-01', // 3+ weeks ago
        insurance: 'Medicaid', // High risk insurance
        address: 'Rural Area, MA' // High geographic risk
      };
      const highRisk = await calculateLeakageRisk(highRiskPatient);
      expect(highRisk.level).toBe('high');
      expect(highRisk.score).toBeGreaterThanOrEqual(70);

      // Test low risk scenario
      const lowRiskPatient = {
        date_of_birth: '1990-01-01', // Young patient
        diagnosis: 'Cataract Surgery', // Low complexity
        discharge_date: '2025-01-21', // Very recent
        insurance: 'Blue Cross Blue Shield', // Good insurance
        address: 'Boston, MA' // Good location
      };
      const lowRisk = await calculateLeakageRisk(lowRiskPatient);
      expect(lowRisk.level).toBe('low');
      expect(lowRisk.score).toBeLessThan(40);
    });
    
    test('referral history should impact risk score', async () => {
      // Mock a patient with problematic referral history
      const patientWithReferrals = {
        ...mockPatient,
        id: 'patient-with-referrals'
      };
      
      // Mock fetchReferralHistory to return problematic referrals
      jest.spyOn(global, 'fetchReferralHistory').mockImplementation(() => 
        Promise.resolve([
          {
            id: 'ref1',
            patient_id: 'patient-with-referrals',
            provider_id: 'provider1',
            service_type: 'Cardiology',
            status: 'cancelled',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-05T00:00:00Z'
          },
          {
            id: 'ref2',
            patient_id: 'patient-with-referrals',
            provider_id: 'provider2',
            service_type: 'Cardiology',
            status: 'cancelled',
            created_at: '2025-01-10T00:00:00Z',
            updated_at: '2025-01-15T00:00:00Z'
          }
        ])
      );
      
      const risk = await calculateLeakageRisk(patientWithReferrals);
      expect(risk.factors.previousReferralHistory).toBeGreaterThan(50); // Should be higher risk due to cancelled referrals
    });
  });

  describe('Patient data enhancement', () => {
    // Mock the fetchReferralHistory function to avoid actual API calls
    beforeEach(() => {
      jest.spyOn(global, 'fetchReferralHistory').mockImplementation(() => 
        Promise.resolve([])
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('enhancePatientData should add computed fields', async () => {
      const enhanced = await enhancePatientData(mockPatient);
      expect(enhanced.age).toBeDefined();
      expect(enhanced.age).toBeGreaterThan(70);
      expect(enhanced.daysSinceDischarge).toBeDefined();
      expect(enhanced.daysSinceDischarge).toBeGreaterThanOrEqual(0);
      expect(enhanced.leakageRisk.factors).toBeDefined();
      expect(enhanced.leakageRisk.factors.age).toBeGreaterThan(0);
      expect(enhanced.leakageRisk.factors.diagnosisComplexity).toBeGreaterThan(0);
      expect(enhanced.leakageRisk.factors.previousReferralHistory).toBeDefined();
    });

    test('enhancePatientData should preserve original patient data', async () => {
      const enhanced = await enhancePatientData(mockPatient);
      expect(enhanced.id).toBe(mockPatient.id);
      expect(enhanced.name).toBe(mockPatient.name);
      expect(enhanced.diagnosis).toBe(mockPatient.diagnosis);
      expect(enhanced.insurance).toBe(mockPatient.insurance);
    });
    
    test('enhancePatientDataSync should work without async operations', () => {
      const enhanced = enhancePatientDataSync(mockPatient);
      expect(enhanced.age).toBeDefined();
      expect(enhanced.age).toBeGreaterThan(70);
      expect(enhanced.daysSinceDischarge).toBeDefined();
      expect(enhanced.daysSinceDischarge).toBeGreaterThanOrEqual(0);
      expect(enhanced.leakageRisk.factors).toBeDefined();
      expect(enhanced.leakageRisk.factors.age).toBeGreaterThan(0);
      expect(enhanced.leakageRisk.factors.diagnosisComplexity).toBeGreaterThan(0);
      // Note: previousReferralHistory won't be available in sync version
    });
  });
});

// Export for manual testing
export { mockPatient };