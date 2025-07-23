// Simple test script to verify provider matching logic
import { 
  calculateDistance,
  getApproximateCoordinates,
  isInNetwork,
  hasSpecialtyMatch,
  calculateAvailabilityScore,
  calculateProviderMatch,
  findMatchingProviders
} from './src/lib/provider-matching.js';

// Mock provider data
const mockProviders = [
  {
    id: '1',
    name: 'Boston Physical Therapy',
    type: 'Physical Therapy',
    address: '123 Main St, Boston, MA',
    phone: '(617) 555-0123',
    specialties: ['Orthopedic PT', 'Post-Surgical Rehab'],
    accepted_insurance: ['Blue Cross Blue Shield', 'Medicare'],
    rating: 4.8,
    latitude: 42.3601,
    longitude: -71.0589,
    availability_next: 'Tomorrow',
    in_network_plans: ['Blue Cross Blue Shield', 'Medicare'],
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Cambridge Cardiology',
    type: 'Cardiology',
    address: '456 Cambridge St, Cambridge, MA',
    phone: '(617) 555-0456',
    specialties: ['Interventional Cardiology', 'Heart Failure'],
    accepted_insurance: ['United Healthcare', 'Aetna'],
    rating: 4.9,
    latitude: 42.3736,
    longitude: -71.1097,
    availability_next: 'Next week',
    in_network_plans: ['United Healthcare', 'Aetna'],
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Back Bay Physical Therapy',
    type: 'Physical Therapy',
    address: '567 Boylston St, Boston, MA',
    phone: '(617) 555-0789',
    specialties: ['Manual Therapy', 'Sports Medicine'],
    accepted_insurance: ['Blue Cross Blue Shield', 'United Healthcare'],
    rating: 4.7,
    latitude: 42.3505,
    longitude: -71.0743,
    availability_next: 'This Friday',
    in_network_plans: ['Blue Cross Blue Shield', 'United Healthcare'],
    created_at: '2025-01-01T00:00:00Z',
  }
];

// Mock patient data
const mockPatient = {
  id: 'patient-1',
  name: 'Test Patient',
  date_of_birth: '1950-01-01',
  diagnosis: 'Hip Replacement',
  discharge_date: '2025-01-20',
  required_followup: 'Physical Therapy',
  insurance: 'Blue Cross Blue Shield',
  address: '789 Beacon St, Boston, MA',
  leakage_risk_score: 75,
  leakage_risk_level: 'high',
  referral_status: 'needed',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  leakageRisk: {
    score: 75,
    level: 'high',
  },
};

console.log('🧪 Testing Provider Matching Logic\n');
console.log('=' .repeat(60));

// Test basic functions
console.log('\n1. Basic Function Tests:');
console.log('-'.repeat(40));

// Test distance calculation
const patientCoords = getApproximateCoordinates(mockPatient.address);
const provider1Coords = { lat: mockProviders[0].latitude, lng: mockProviders[0].longitude };
const distance = calculateDistance(patientCoords.lat, patientCoords.lng, provider1Coords.lat, provider1Coords.lng);
console.log(`   Distance calculation: ${distance.toFixed(1)} miles`);

// Test insurance matching
const inNetwork = isInNetwork(mockProviders[0], mockPatient.insurance);
console.log(`   Insurance match: ${inNetwork ? 'Yes' : 'No'}`);

// Test specialty matching
const specialtyMatch = hasSpecialtyMatch(mockProviders[0], mockPatient.required_followup);
console.log(`   Specialty match: ${specialtyMatch ? 'Yes' : 'No'}`);

// Test availability scoring
const availabilityScore = calculateAvailabilityScore(mockProviders[0].availability_next);
console.log(`   Availability score: ${availabilityScore}/100`);

// Test comprehensive provider matching
console.log('\n2. Provider Matching Results:');
console.log('-'.repeat(40));

const matches = findMatchingProviders(mockProviders, mockPatient, 3);

matches.forEach((match, index) => {
  console.log(`\n   ${index + 1}. ${match.provider.name}`);
  console.log(`      Match Score: ${match.matchScore}%`);
  console.log(`      Distance: ${match.distance} miles`);
  console.log(`      In Network: ${match.inNetwork ? 'Yes' : 'No'}`);
  console.log(`      Specialty Match: ${match.provider.specialtyMatch ? 'Yes' : 'No'}`);
  console.log(`      Rating: ${match.provider.rating}/5`);
  console.log(`      Reasons:`);
  match.explanation.reasons.forEach(reason => {
    console.log(`        • ${reason}`);
  });
});

// Test edge cases
console.log('\n3. Edge Case Tests:');
console.log('-'.repeat(40));

// Test with patient requiring cardiology
const cardiologyPatient = {
  ...mockPatient,
  required_followup: 'Cardiology',
  insurance: 'United Healthcare'
};

const cardiologyMatches = findMatchingProviders(mockProviders, cardiologyPatient, 2);
console.log(`\n   Cardiology matches for United Healthcare patient:`);
cardiologyMatches.forEach((match, index) => {
  console.log(`   ${index + 1}. ${match.provider.name} - ${match.matchScore}% match`);
});

// Test with out-of-network patient
const outOfNetworkPatient = {
  ...mockPatient,
  insurance: 'Medicaid'
};

const outOfNetworkMatches = findMatchingProviders(mockProviders, outOfNetworkPatient, 2);
console.log(`\n   Matches for out-of-network patient (Medicaid):`);
outOfNetworkMatches.forEach((match, index) => {
  console.log(`   ${index + 1}. ${match.provider.name} - ${match.matchScore}% match (${match.inNetwork ? 'In' : 'Out'}-Network)`);
});

console.log('\n' + '=' .repeat(60));
console.log('✅ Provider Matching Tests Completed');

// Verify expected outcomes
console.log('\n🔍 Verification:');
const bestMatch = matches[0];
console.log(`   Best match: ${bestMatch.provider.name} (${bestMatch.matchScore}%)`);
console.log(`   Expected: Physical Therapy provider with high score`);
console.log(`   In-network: ${bestMatch.inNetwork ? 'Yes' : 'No'}`);
console.log(`   Specialty match: ${bestMatch.provider.specialtyMatch ? 'Yes' : 'No'}`);

console.log('\n🎉 Provider matching logic verification complete!');