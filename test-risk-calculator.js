// Simple test script to verify risk calculation logic
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
} from './src/lib/risk-calculator.js';

// Mock patient data for testing
const mockPatient = {
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

console.log('Testing Risk Calculator Functions...\n');

// Test basic calculations
console.log('1. Basic Calculations:');
const age = calculateAge('1950-01-01');
console.log(`   Age: ${age} years`);

const daysSinceDischarge = calculateDaysSinceDischarge('2025-01-20');
console.log(`   Days since discharge: ${daysSinceDischarge} days\n`);

// Test individual risk factors
console.log('2. Individual Risk Factors:');
const ageRisk = calculateAgeRisk('1950-01-01');
console.log(`   Age Risk: ${ageRisk}/30 points`);

const diagnosisRisk = calculateDiagnosisComplexity('Hip Replacement');
console.log(`   Diagnosis Complexity: ${diagnosisRisk}/100 points`);

const timeRisk = calculateTimeRisk('2025-01-20');
console.log(`   Time Risk: ${timeRisk}/20 points`);

const insuranceRisk = calculateInsuranceRisk('Medicare');
console.log(`   Insurance Risk: ${insuranceRisk}/100 points`);

const geographicRisk = calculateGeographicRisk('123 Main St, Boston, MA 02101');
console.log(`   Geographic Risk: ${geographicRisk}/100 points\n`);

// Test comprehensive risk calculation
console.log('3. Comprehensive Risk Assessment:');
const riskAssessment = calculateLeakageRisk(mockPatient);
console.log(`   Overall Score: ${riskAssessment.score}/100`);
console.log(`   Risk Level: ${riskAssessment.level}`);
console.log('   Risk Factors Breakdown:');
console.log(`     - Age: ${riskAssessment.factors.age}/100`);
console.log(`     - Diagnosis Complexity: ${riskAssessment.factors.diagnosisComplexity}/100`);
console.log(`     - Time Since Discharge: ${riskAssessment.factors.timeSinceDischarge}/100`);
console.log(`     - Insurance Type: ${riskAssessment.factors.insuranceType}/100`);
console.log(`     - Geographic Factors: ${riskAssessment.factors.geographicFactors}/100\n`);

// Test patient data enhancement
console.log('4. Enhanced Patient Data:');
const enhancedPatient = enhancePatientData(mockPatient);
console.log(`   Enhanced Age: ${enhancedPatient.age} years`);
console.log(`   Enhanced Days Since Discharge: ${enhancedPatient.daysSinceDischarge} days`);
console.log(`   Enhanced Risk Score: ${enhancedPatient.leakageRisk.score}/100`);
console.log(`   Enhanced Risk Level: ${enhancedPatient.leakageRisk.level}`);

console.log('\n✅ Risk Calculator Tests Completed Successfully!');