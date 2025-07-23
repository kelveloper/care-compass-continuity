import { 
  calculateAge, 
  calculateDaysSinceDischarge, 
  calculateAgeRisk,
  calculateDiagnosisComplexity,
  calculateTimeRisk,
  calculateInsuranceRisk,
  calculateGeographicRisk,
  calculateLeakageRisk,
  enhancePatientData
} from '../risk-calculator';
import { Patient } from '@/types';

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
    test('calculateLeakageRisk should return proper risk assessment', () => {
      const risk = calculateLeakageRisk(mockPatient);
      expect(risk.score).toBeGreaterThan(0);
      expect(risk.score).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(risk.level);
      expect(risk.factors).toBeDefined();
      expect(risk.factors.age).toBeGreaterThan(0);
      expect(risk.factors.diagnosisComplexity).toBeGreaterThan(0);
      expect(risk.factors.timeSinceDischarge).toBeGreaterThanOrEqual(0);
      expect(risk.factors.insuranceType).toBeGreaterThan(0);
      expect(risk.factors.geographicFactors).toBeGreaterThan(0);
    });

    test('calculateLeakageRisk should handle missing data gracefully', () => {
      const partialPatient = {
        date_of_birth: '1960-01-01',
        diagnosis: 'Unknown procedure'
      };
      const risk = calculateLeakageRisk(partialPatient);
      expect(risk.score).toBeGreaterThan(0);
      expect(risk.score).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(risk.level);
    });

    test('risk level thresholds should work correctly', () => {
      // Test high risk scenario
      const highRiskPatient = {
        date_of_birth: '1940-01-01', // 85 years old
        diagnosis: 'Heart Surgery', // High complexity
        discharge_date: '2025-01-01', // 3+ weeks ago
        insurance: 'Medicaid', // High risk insurance
        address: 'Rural Area, MA' // High geographic risk
      };
      const highRisk = calculateLeakageRisk(highRiskPatient);
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
      const lowRisk = calculateLeakageRisk(lowRiskPatient);
      expect(lowRisk.level).toBe('low');
      expect(lowRisk.score).toBeLessThan(40);
    });
  });

  describe('Patient data enhancement', () => {
    test('enhancePatientData should add computed fields', () => {
      const enhanced = enhancePatientData(mockPatient);
      expect(enhanced.age).toBeDefined();
      expect(enhanced.age).toBeGreaterThan(70);
      expect(enhanced.daysSinceDischarge).toBeDefined();
      expect(enhanced.daysSinceDischarge).toBeGreaterThanOrEqual(0);
      expect(enhanced.leakageRisk.factors).toBeDefined();
      expect(enhanced.leakageRisk.factors.age).toBeGreaterThan(0);
      expect(enhanced.leakageRisk.factors.diagnosisComplexity).toBeGreaterThan(0);
    });

    test('enhancePatientData should preserve original patient data', () => {
      const enhanced = enhancePatientData(mockPatient);
      expect(enhanced.id).toBe(mockPatient.id);
      expect(enhanced.name).toBe(mockPatient.name);
      expect(enhanced.diagnosis).toBe(mockPatient.diagnosis);
      expect(enhanced.insurance).toBe(mockPatient.insurance);
    });
  });
});

// Export for manual testing
export { mockPatient };