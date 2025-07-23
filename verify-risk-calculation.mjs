// Simple verification script for risk calculation logic
// This tests the core functionality without requiring Jest setup

// Mock patient data similar to what's in the database
const testPatients = [
  {
    name: "Margaret Thompson",
    date_of_birth: "1942-03-15", // ~82 years old - high age risk
    diagnosis: "Total Hip Replacement", // Moderate complexity
    discharge_date: "2025-01-18", // ~4 days ago - low time risk
    insurance: "Medicare", // High insurance risk
    address: "45 Beacon Hill Ave, Boston, MA 02108", // Low geographic risk (Boston)
  },
  {
    name: "Kevin Lee",
    date_of_birth: "1991-08-09", // ~33 years old - low age risk
    diagnosis: "ACL Repair", // Low complexity
    discharge_date: "2025-01-21", // ~1 day ago - very low time risk
    insurance: "United Healthcare", // Low insurance risk
    address: "741 Huntington Ave, Boston, MA 02115", // Low geographic risk (Boston)
  },
  {
    name: "Charles Wilson",
    date_of_birth: "1953-12-31", // ~71 years old - high age risk
    diagnosis: "Lung Surgery", // High complexity
    discharge_date: "2025-01-16", // ~6 days ago - moderate time risk
    insurance: "Cigna", // Low insurance risk
    address: "987 Atlantic Ave, Boston, MA 02110", // Low geographic risk (Boston)
  }
];

// Simplified risk calculation functions for testing
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
  
  const highComplexity = [
    'cardiac catheterization', 'coronary artery bypass', 'spinal fusion',
    'spine surgery', 'lung surgery', 'kidney surgery', 'liver surgery',
    'brain surgery', 'heart surgery'
  ];
  
  const moderateComplexity = [
    'hip replacement', 'knee replacement', 'shoulder replacement',
    'prostate surgery', 'gallbladder surgery', 'hernia repair'
  ];
  
  const lowComplexity = [
    'cataract surgery', 'thyroid surgery', 'breast surgery',
    'appendectomy', 'colonoscopy', 'acl repair'
  ];
  
  if (highComplexity.some(d => diagnosisLower.includes(d))) {
    return 85;
  } else if (moderateComplexity.some(d => diagnosisLower.includes(d))) {
    return 65;
  } else if (lowComplexity.some(d => diagnosisLower.includes(d))) {
    return 25;
  } else {
    return 50;
  }
}

function calculateTimeRisk(dischargeDate) {
  const daysSinceDischarge = calculateDaysSinceDischarge(dischargeDate);
  
  if (daysSinceDischarge >= 14) return 20;
  if (daysSinceDischarge >= 10) return 16;
  if (daysSinceDischarge >= 7) return 12;
  if (daysSinceDischarge >= 5) return 8;
  if (daysSinceDischarge >= 3) return 4;
  return 1;
}

function calculateInsuranceRisk(insurance) {
  const insuranceLower = insurance.toLowerCase();
  
  if (insuranceLower.includes('medicaid')) return 85;
  if (insuranceLower.includes('medicare')) return 75;
  if (insuranceLower.includes('hmo') || insuranceLower.includes('kaiser')) return 60;
  if (insuranceLower.includes('blue cross') || 
      insuranceLower.includes('united') || 
      insuranceLower.includes('aetna') || 
      insuranceLower.includes('cigna')) return 25;
  
  return 50;
}

function calculateGeographicRisk(address) {
  const addressLower = address.toLowerCase();
  
  if (addressLower.includes('boston') || 
      addressLower.includes('cambridge') ||
      addressLower.includes('longwood')) return 20;
  
  if (addressLower.includes('brookline') || 
      addressLower.includes('somerville') ||
      addressLower.includes('newton') ||
      addressLower.includes('watertown')) return 35;
  
  if (addressLower.includes('quincy') || 
      addressLower.includes('medford') ||
      addressLower.includes('malden') ||
      addressLower.includes('waltham')) return 55;
  
  return 80;
}

function calculateLeakageRisk(patient) {
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
  
  const rawScore = ageRisk + (diagnosisRisk * 0.25) + timeRisk + (insuranceRisk * 0.15) + (geographicRisk * 0.10);
  const score = Math.round(Math.min(100, Math.max(0, rawScore)));
  
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

// Run tests
console.log('🧪 Testing Risk Calculation Logic\n');
console.log('=' .repeat(60));

testPatients.forEach((patient, index) => {
  console.log(`\n${index + 1}. ${patient.name}`);
  console.log('-'.repeat(40));
  
  const age = calculateAge(patient.date_of_birth);
  const daysSince = calculateDaysSinceDischarge(patient.discharge_date);
  
  console.log(`   Age: ${age} years`);
  console.log(`   Days since discharge: ${daysSince} days`);
  console.log(`   Diagnosis: ${patient.diagnosis}`);
  console.log(`   Insurance: ${patient.insurance}`);
  console.log(`   Location: ${patient.address.split(',')[1]?.trim()}`);
  
  const risk = calculateLeakageRisk(patient);
  
  console.log(`\n   📊 Risk Assessment:`);
  console.log(`   Overall Score: ${risk.score}/100 (${risk.level.toUpperCase()})`);
  console.log(`   Risk Factors:`);
  console.log(`     - Age: ${risk.factors.age}/100`);
  console.log(`     - Diagnosis: ${risk.factors.diagnosisComplexity}/100`);
  console.log(`     - Time: ${risk.factors.timeSinceDischarge}/100`);
  console.log(`     - Insurance: ${risk.factors.insuranceType}/100`);
  console.log(`     - Geographic: ${risk.factors.geographicFactors}/100`);
});

console.log('\n' + '=' .repeat(60));
console.log('✅ Risk Calculation Tests Completed');

// Verify expected outcomes
console.log('\n🔍 Verification:');
const margaretRisk = calculateLeakageRisk(testPatients[0]);
const kevinRisk = calculateLeakageRisk(testPatients[1]);
const charlesRisk = calculateLeakageRisk(testPatients[2]);

console.log(`   Margaret (elderly, Medicare, hip replacement): ${margaretRisk.level} risk (${margaretRisk.score})`);
console.log(`   Kevin (young, good insurance, minor surgery): ${kevinRisk.level} risk (${kevinRisk.score})`);
console.log(`   Charles (elderly, complex surgery): ${charlesRisk.level} risk (${charlesRisk.score})`);

// Expected: Margaret should be high risk, Kevin should be low risk, Charles should be high risk
const expectedResults = [
  { name: 'Margaret', expected: 'high', actual: margaretRisk.level },
  { name: 'Kevin', expected: 'low', actual: kevinRisk.level },
  { name: 'Charles', expected: 'high', actual: charlesRisk.level }
];

console.log('\n✅ Expected vs Actual Results:');
expectedResults.forEach(result => {
  const status = result.expected === result.actual ? '✅' : '❌';
  console.log(`   ${status} ${result.name}: Expected ${result.expected}, Got ${result.actual}`);
});

console.log('\n🎉 Risk calculation logic verification complete!');