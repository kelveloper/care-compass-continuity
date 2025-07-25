import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Risk calculation functions
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function calculateDaysSinceDischarge(dischargeDate) {
  const today = new Date();
  const discharge = new Date(dischargeDate);
  const diffTime = Math.abs(today.getTime() - discharge.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateAgeRisk(dateOfBirth) {
  const age = calculateAge(dateOfBirth);
  
  if (age >= 80) return 30;
  if (age >= 70) return 25;
  if (age >= 60) return 20;
  if (age >= 50) return 15;
  if (age >= 40) return 10;
  return 5;
}

function calculateDiagnosisComplexity(diagnosis) {
  const diagnosisLower = diagnosis.toLowerCase();
  
  // High complexity procedures (20-25 points)
  const highComplexity = [
    'cardiac catheterization',
    'coronary artery bypass',
    'spinal fusion',
    'spine surgery',
    'lung surgery',
    'kidney surgery',
    'liver surgery',
    'brain surgery',
    'heart surgery'
  ];
  
  // Moderate complexity procedures (15-20 points)
  const moderateComplexity = [
    'hip replacement',
    'knee replacement',
    'shoulder replacement',
    'prostate surgery',
    'gallbladder surgery',
    'hernia repair'
  ];
  
  // Low complexity procedures (5-10 points)
  const lowComplexity = [
    'cataract surgery',
    'thyroid surgery',
    'breast surgery',
    'appendectomy',
    'colonoscopy'
  ];
  
  if (highComplexity.some(d => diagnosisLower.includes(d))) {
    return 85; // High complexity = high risk score
  } else if (moderateComplexity.some(d => diagnosisLower.includes(d))) {
    return 65; // Moderate complexity = moderate risk score
  } else if (lowComplexity.some(d => diagnosisLower.includes(d))) {
    return 25; // Low complexity = low risk score
  } else {
    return 50; // Default moderate risk for unknown procedures
  }
}

function calculateTimeRisk(dischargeDate) {
  const daysSinceDischarge = calculateDaysSinceDischarge(dischargeDate);
  
  if (daysSinceDischarge >= 14) return 20; // 2+ weeks
  if (daysSinceDischarge >= 10) return 16; // 10-13 days
  if (daysSinceDischarge >= 7) return 12;  // 1 week
  if (daysSinceDischarge >= 5) return 8;   // 5-6 days
  if (daysSinceDischarge >= 3) return 4;   // 3-4 days
  return 1; // 0-2 days
}

function calculateInsuranceRisk(insurance) {
  const insuranceLower = insurance.toLowerCase();
  
  // High risk insurance types (converted to 0-100 scale)
  if (insuranceLower.includes('medicaid')) {
    return 85; // Highest risk - limited provider acceptance
  }
  if (insuranceLower.includes('medicare')) {
    return 75; // High risk - some access limitations
  }
  
  // Medium risk insurance types
  if (insuranceLower.includes('hmo') || insuranceLower.includes('kaiser')) {
    return 60; // Moderate risk - network restrictions
  }
  
  // Low risk insurance types
  if (insuranceLower.includes('blue cross') || 
      insuranceLower.includes('united') || 
      insuranceLower.includes('aetna') || 
      insuranceLower.includes('cigna')) {
    return 25; // Lower risk - good provider networks
  }
  
  // Unknown insurance
  return 50; // Default moderate risk
}

function calculateGeographicRisk(address) {
  const addressLower = address.toLowerCase();
  
  // Major medical centers - lowest risk
  if (addressLower.includes('boston') || 
      addressLower.includes('cambridge') ||
      addressLower.includes('longwood')) {
    return 20;
  }
  
  // Suburban areas with good access
  if (addressLower.includes('brookline') || 
      addressLower.includes('somerville') ||
      addressLower.includes('newton') ||
      addressLower.includes('watertown')) {
    return 35;
  }
  
  // Further suburban areas
  if (addressLower.includes('quincy') || 
      addressLower.includes('medford') ||
      addressLower.includes('malden') ||
      addressLower.includes('waltham')) {
    return 55;
  }
  
  // Rural or distant areas
  return 80;
}

async function fetchReferralHistory(patientId) {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching referral history:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching referral history:', error);
    return [];
  }
}

function calculateReferralHistoryRisk(referrals) {
  if (!referrals || referrals.length === 0) {
    return 50; // No history = moderate risk
  }
  
  let riskScore = 0;
  const totalReferrals = referrals.length;
  
  // Count different types of referral outcomes
  const cancelledReferrals = referrals.filter(r => r.status === 'cancelled').length;
  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending' || r.status === 'sent').length;
  
  // Calculate risk based on referral patterns
  const cancellationRate = cancelledReferrals / totalReferrals;
  const completionRate = completedReferrals / totalReferrals;
  
  // High cancellation rate increases risk significantly
  if (cancellationRate >= 0.5) {
    riskScore += 40; // 50%+ cancellation rate = very high risk
  } else if (cancellationRate >= 0.3) {
    riskScore += 25; // 30%+ cancellation rate = high risk
  } else if (cancellationRate >= 0.1) {
    riskScore += 10; // 10%+ cancellation rate = moderate risk
  }
  
  // Low completion rate increases risk
  if (completionRate < 0.3) {
    riskScore += 20; // <30% completion rate = high risk
  } else if (completionRate < 0.5) {
    riskScore += 10; // <50% completion rate = moderate risk
  }
  
  // Multiple pending referrals indicate potential issues
  if (pendingReferrals >= 3) {
    riskScore += 15; // 3+ pending = high risk
  } else if (pendingReferrals >= 2) {
    riskScore += 8; // 2 pending = moderate risk
  }
  
  // Recent referral activity (within last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentReferrals = referrals.filter(r => 
    new Date(r.created_at) > thirtyDaysAgo
  );
  
  if (recentReferrals.length === 0 && totalReferrals > 0) {
    riskScore += 15; // No recent activity despite history = high risk
  }
  
  // Cap the score at 100
  return Math.min(100, Math.max(0, riskScore));
}

async function calculateLeakageRisk(patient) {
  // Calculate individual risk factors
  const ageRisk = patient.date_of_birth ? calculateAgeRisk(patient.date_of_birth) : 15;
  const diagnosisRisk = patient.diagnosis ? calculateDiagnosisComplexity(patient.diagnosis) : 50;
  const timeRisk = patient.discharge_date ? calculateTimeRisk(patient.discharge_date) : 5;
  const insuranceRisk = patient.insurance ? calculateInsuranceRisk(patient.insurance) : 50;
  const geographicRisk = patient.address ? calculateGeographicRisk(patient.address) : 50;
  
  // Fetch referral history if patient ID is available
  let referralHistoryRisk = 50; // Default moderate risk
  if (patient.id) {
    try {
      const referrals = await fetchReferralHistory(patient.id);
      referralHistoryRisk = calculateReferralHistoryRisk(referrals);
    } catch (error) {
      console.error('Error calculating referral history risk:', error);
      // Continue with default risk value
    }
  }
  
  // Convert to 0-100 scale for factors breakdown
  const factors = {
    age: Math.round((ageRisk / 30) * 100), // Convert 0-30 to 0-100
    diagnosisComplexity: diagnosisRisk, // Already 0-100
    timeSinceDischarge: Math.round((timeRisk / 20) * 100), // Convert 0-20 to 0-100
    insuranceType: insuranceRisk, // Already 0-100
    geographicFactors: geographicRisk, // Already 0-100
    previousReferralHistory: referralHistoryRisk // Already 0-100
  };
  
  // Updated weighted calculation with referral history
  // Age factor (0-25 points), Diagnosis complexity (0-25 points), 
  // Time since discharge (0-15 points), Insurance (0-15 points), 
  // Geographic (0-10 points), Referral history (0-10 points)
  const ageWeight = 0.25;
  const diagnosisWeight = 0.25;
  const timeWeight = 0.15;
  const insuranceWeight = 0.15;
  const geographicWeight = 0.10;
  const referralHistoryWeight = 0.10;
  
  const rawScore = 
    (ageRisk * ageWeight) + 
    (diagnosisRisk * diagnosisWeight) + 
    (timeRisk * timeWeight / 20 * 100) + 
    (insuranceRisk * insuranceWeight) + 
    (geographicRisk * geographicWeight) + 
    (referralHistoryRisk * referralHistoryWeight);
  
  // Convert to 0-100 scale
  const score = Math.round(Math.min(100, Math.max(0, rawScore)));
  
  // Determine risk level based on score thresholds from design document
  let level;
  if (score >= 70) {
    level = "high";
  } else if (score >= 40) {
    level = "medium";
  } else {
    level = "low";
  }
  
  return { score, level, factors };
}

async function enhancePatientData(patient) {
  const age = calculateAge(patient.date_of_birth);
  const daysSinceDischarge = calculateDaysSinceDischarge(patient.discharge_date);
  const riskCalculation = await calculateLeakageRisk(patient);
  
  return {
    ...patient,
    age,
    daysSinceDischarge,
    leakageRisk: {
      score: riskCalculation.score,
      level: riskCalculation.level,
      factors: riskCalculation.factors,
    },
  };
}

// Main function to test risk calculation
async function testRiskCalculation() {
  console.log('🧮 Testing sophisticated leakage risk calculation');
  
  try {
    // Fetch a patient from the database
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    if (!patients || patients.length === 0) {
      console.log('❌ No patients found in the database');
      return;
    }
    
    const patient = patients[0];
    console.log('📊 Testing risk calculation for patient:', patient.name);
    
    // Calculate risk factors
    console.log('\n🔍 Individual Risk Factors:');
    console.log('Age Risk:', calculateAgeRisk(patient.date_of_birth));
    console.log('Diagnosis Risk:', calculateDiagnosisComplexity(patient.diagnosis));
    console.log('Time Risk:', calculateTimeRisk(patient.discharge_date));
    console.log('Insurance Risk:', calculateInsuranceRisk(patient.insurance));
    console.log('Geographic Risk:', calculateGeographicRisk(patient.address));
    
    // Fetch referral history
    const referrals = await fetchReferralHistory(patient.id);
    console.log('\n📝 Referral History:', referrals.length > 0 ? `${referrals.length} referrals found` : 'No referrals found');
    if (referrals.length > 0) {
      console.log('Referral History Risk:', calculateReferralHistoryRisk(referrals));
    }
    
    // Calculate comprehensive risk
    const riskResult = await calculateLeakageRisk(patient);
    console.log('\n📈 Comprehensive Risk Calculation:');
    console.log('Risk Score:', riskResult.score);
    console.log('Risk Level:', riskResult.level);
    console.log('Risk Factors:', riskResult.factors);
    
    // Enhance patient data
    const enhancedPatient = await enhancePatientData(patient);
    console.log('\n🔄 Enhanced Patient Data:');
    console.log('Age:', enhancedPatient.age);
    console.log('Days Since Discharge:', enhancedPatient.daysSinceDischarge);
    console.log('Leakage Risk:', enhancedPatient.leakageRisk);
    
    console.log('\n✅ Risk calculation test completed successfully');
  } catch (error) {
    console.error('❌ Error testing risk calculation:', error);
  }
}

// Run the test
testRiskCalculation();