import { Patient, RiskFactors } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Referral } from "@/integrations/supabase/types";

/**
 * Calculate patient age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Calculate days since discharge
 */
export function calculateDaysSinceDischarge(dischargeDate: string): number {
  const today = new Date();
  const discharge = new Date(dischargeDate);
  const diffTime = Math.abs(today.getTime() - discharge.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate age-based risk factor (0-30 points)
 * Higher age = higher risk of leakage
 */
export function calculateAgeRisk(dateOfBirth: string): number {
  const age = calculateAge(dateOfBirth);
  
  if (age >= 80) return 30;
  if (age >= 70) return 25;
  if (age >= 60) return 20;
  if (age >= 50) return 15;
  if (age >= 40) return 10;
  return 5;
}

/**
 * Calculate diagnosis complexity risk factor (0-25 points)
 * More complex procedures = higher risk of complications and leakage
 */
export function calculateDiagnosisComplexity(diagnosis: string): number {
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

/**
 * Calculate time-based risk factor (0-20 points)
 * More time since discharge = higher risk of losing patient
 */
export function calculateTimeRisk(dischargeDate: string): number {
  const daysSinceDischarge = calculateDaysSinceDischarge(dischargeDate);
  
  if (daysSinceDischarge >= 14) return 20; // 2+ weeks
  if (daysSinceDischarge >= 10) return 16; // 10-13 days
  if (daysSinceDischarge >= 7) return 12;  // 1 week
  if (daysSinceDischarge >= 5) return 8;   // 5-6 days
  if (daysSinceDischarge >= 3) return 4;   // 3-4 days
  return 1; // 0-2 days
}

/**
 * Calculate insurance-based risk factor (0-15 points)
 * Insurance type affects access to providers
 */
export function calculateInsuranceRisk(insurance: string): number {
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

/**
 * Calculate geographic risk factor (0-10 points)
 * Distance from major medical centers affects access
 */
export function calculateGeographicRisk(address: string): number {
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

/**
 * Fetch referral history for a patient
 */
export async function fetchReferralHistory(patientId: string): Promise<Referral[]> {
  try {
    // First check if the referrals table exists
    const { error: tableCheckError } = await supabase
      .from('referrals')
      .select('id')
      .limit(1);
    
    // If table doesn't exist, return empty array
    if (tableCheckError && tableCheckError.code === '42P01') {
      console.warn('Referrals table does not exist yet. Run the populate-sample-data.js script to create it.');
      return [];
    }
    
    // If table exists, fetch the data
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

/**
 * Calculate previous referral history risk factor (0-15 points)
 * Previous failed or cancelled referrals increase risk
 */
export function calculateReferralHistoryRisk(referrals: Referral[]): number {
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

/**
 * Calculate comprehensive leakage risk score based on multiple factors
 * Implements the algorithm specified in the design document
 */
export async function calculateLeakageRisk(patient: Partial<Patient>): Promise<{
  score: number;
  level: "low" | "medium" | "high";
  factors: RiskFactors;
}> {
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
      // First check if the referrals table exists
      const { error: tableCheckError } = await supabase
        .from('referrals')
        .select('id')
        .limit(1);
      
      // Only try to fetch referral history if the table exists
      if (!tableCheckError || tableCheckError.code !== '42P01') {
        const referrals = await fetchReferralHistory(patient.id);
        referralHistoryRisk = calculateReferralHistoryRisk(referrals);
      } else {
        console.warn('Referrals table does not exist yet. Using default risk value.');
      }
    } catch (error) {
      console.error('Error calculating referral history risk:', error);
      // Continue with default risk value
    }
  }
  
  // Convert to 0-100 scale for factors breakdown
  const factors: RiskFactors = {
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
  let level: "low" | "medium" | "high";
  if (score >= 70) {
    level = "high";
  } else if (score >= 40) {
    level = "medium";
  } else {
    level = "low";
  }
  
  return { score, level, factors };
}

/**
 * Enhance patient data with computed fields including detailed risk breakdown
 * This function now returns a Promise due to the async risk calculation
 */
export async function enhancePatientData(patient: Patient): Promise<Patient> {
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

/**
 * Synchronous version of enhancePatientData that uses existing risk score
 * Useful for cases where we can't use async functions or already have risk data
 */
export function enhancePatientDataSync(patient: Patient): Patient {
  const age = calculateAge(patient.date_of_birth);
  const daysSinceDischarge = calculateDaysSinceDischarge(patient.discharge_date);
  
  // Use existing risk data if available, otherwise use a simplified calculation
  const existingRiskScore = patient.leakage_risk_score || 50;
  const existingRiskLevel = patient.leakage_risk_level || 
    (existingRiskScore >= 70 ? "high" : existingRiskScore >= 40 ? "medium" : "low");
  
  // Calculate basic factors without referral history
  const ageRisk = calculateAgeRisk(patient.date_of_birth);
  const diagnosisRisk = calculateDiagnosisComplexity(patient.diagnosis);
  const timeRisk = calculateTimeRisk(patient.discharge_date);
  const insuranceRisk = calculateInsuranceRisk(patient.insurance);
  const geographicRisk = calculateGeographicRisk(patient.address);
  
  const factors = {
    age: Math.round((ageRisk / 30) * 100),
    diagnosisComplexity: diagnosisRisk,
    timeSinceDischarge: Math.round((timeRisk / 20) * 100),
    insuranceType: insuranceRisk,
    geographicFactors: geographicRisk,
  };
  
  return {
    ...patient,
    age,
    daysSinceDischarge,
    leakageRisk: {
      score: existingRiskScore,
      level: existingRiskLevel as "low" | "medium" | "high",
      factors,
    },
  };
}