import { Patient, RiskFactors } from "@/types";

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
 * Calculate comprehensive leakage risk score based on multiple factors
 * Implements the algorithm specified in the design document
 */
export function calculateLeakageRisk(patient: Partial<Patient>): {
  score: number;
  level: "low" | "medium" | "high";
  factors: RiskFactors;
} {
  // Calculate individual risk factors
  const ageRisk = patient.date_of_birth ? calculateAgeRisk(patient.date_of_birth) : 15;
  const diagnosisRisk = patient.diagnosis ? calculateDiagnosisComplexity(patient.diagnosis) : 50;
  const timeRisk = patient.discharge_date ? calculateTimeRisk(patient.discharge_date) : 5;
  const insuranceRisk = patient.insurance ? calculateInsuranceRisk(patient.insurance) : 50;
  const geographicRisk = patient.address ? calculateGeographicRisk(patient.address) : 50;
  
  // Convert to 0-100 scale for factors breakdown
  const factors: RiskFactors = {
    age: Math.round((ageRisk / 30) * 100), // Convert 0-30 to 0-100
    diagnosisComplexity: diagnosisRisk, // Already 0-100
    timeSinceDischarge: Math.round((timeRisk / 20) * 100), // Convert 0-20 to 0-100
    insuranceType: insuranceRisk, // Already 0-100
    geographicFactors: geographicRisk, // Already 0-100
  };
  
  // Weighted calculation as per design document
  // Age factor (0-30 points), Diagnosis complexity (0-25 points), 
  // Time since discharge (0-20 points), Insurance (0-15 points), Geographic (0-10 points)
  const totalPossiblePoints = 30 + 25 + 20 + 15 + 10; // 100 points total
  const rawScore = ageRisk + (diagnosisRisk * 0.25) + timeRisk + (insuranceRisk * 0.15) + (geographicRisk * 0.10);
  
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
 */
export function enhancePatientData(patient: Patient): Patient {
  const age = calculateAge(patient.date_of_birth);
  const daysSinceDischarge = calculateDaysSinceDischarge(patient.discharge_date);
  const riskCalculation = calculateLeakageRisk(patient);
  
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