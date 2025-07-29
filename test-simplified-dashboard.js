// Test the simplified dashboard logic
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lnjxrvcukzxhmtvnhsia.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo'
);

// Simulate the simplified usePatients hook
async function testSimplifiedDashboard() {
  console.log('🧪 Testing simplified dashboard logic...\n');
  
  try {
    console.log('usePatientsSimple: Fetching patients...');
    
    // Simulate the exact query from the simplified hook
    let query = supabase
      .from('patients')
      .select('*');
    
    query = query.order('leakage_risk_score', { ascending: false })
                .order('created_at', { ascending: false });
    
    query = query.limit(100);
    
    const result = await query;
    const data = result.data;
    const error = result.error;
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    if (!data) {
      console.log('❌ No data returned from database');
      return;
    }
    
    console.log('✅ Successfully fetched', data.length, 'patients from patients table');
    
    // Simulate the enhancePatients function
    const enhancedPatients = data.map((dbPatient) => {
      const patient = {
        ...dbPatient,
        leakageRisk: {
          score: dbPatient.leakage_risk_score,
          level: dbPatient.leakage_risk_level,
        },
      };
      
      // Add computed fields
      const age = calculateAge(patient.date_of_birth);
      const daysSinceDischarge = calculateDaysSinceDischarge(patient.discharge_date);
      
      return {
        ...patient,
        age,
        daysSinceDischarge,
        leakageRisk: {
          score: patient.leakageRisk.score,
          level: patient.leakageRisk.level,
          factors: {
            age: 50,
            diagnosisComplexity: 50,
            timeSinceDischarge: 50,
            insuranceType: 50,
            geographicFactors: 50,
          },
        },
      };
    });
    
    // Sort by leakage risk score (highest risk first)
    const sortedPatients = enhancedPatients.sort((a, b) => b.leakageRisk.score - a.leakageRisk.score);
    
    console.log('✅ Enhanced and sorted patients:', sortedPatients.length);
    
    // Simulate Dashboard component logic
    const patients = sortedPatients; // This is what usePatients returns
    const isLoading = false;
    const dashboardError = null;
    
    // Simulate the sortedPatients useMemo
    const patientsArray = Array.isArray(patients) ? patients : [];
    const finalSortedPatients = patientsArray; // No optimistic updates
    
    // Simulate pagination
    const totalPatients = finalSortedPatients.length;
    const patientsPerPage = 10;
    const currentPage = 1;
    const startIndex = (currentPage - 1) * patientsPerPage;
    const endIndex = startIndex + patientsPerPage;
    const paginatedPatients = finalSortedPatients.slice(startIndex, endIndex);
    
    console.log('\n🎯 Dashboard component state:');
    console.log('  - patients:', Array.isArray(patients) ? `Array[${patients.length}]` : typeof patients);
    console.log('  - isLoading:', isLoading);
    console.log('  - error:', dashboardError);
    console.log('  - totalPatients:', totalPatients);
    console.log('  - paginatedPatients:', Array.isArray(paginatedPatients) ? `Array[${paginatedPatients.length}]` : typeof paginatedPatients);
    
    // Test the render condition
    const shouldShowPatientList = !isLoading && !dashboardError && totalPatients > 0;
    console.log('  - shouldShowPatientList:', shouldShowPatientList);
    
    if (shouldShowPatientList) {
      console.log('\n✅ Patient list SHOULD be displayed!');
      console.log('Patients that would be shown on page 1:');
      paginatedPatients.forEach((patient, index) => {
        console.log(`  ${index + 1}. ${patient.name} - Risk: ${patient.leakageRisk.score}% (${patient.leakageRisk.level}) - Status: ${patient.referral_status}`);
      });
      
      // Test specific patient data structure
      const firstPatient = paginatedPatients[0];
      console.log('\n🔍 First patient data structure:');
      console.log('  - id:', firstPatient.id);
      console.log('  - name:', firstPatient.name);
      console.log('  - diagnosis:', firstPatient.diagnosis);
      console.log('  - discharge_date:', firstPatient.discharge_date);
      console.log('  - required_followup:', firstPatient.required_followup);
      console.log('  - referral_status:', firstPatient.referral_status);
      console.log('  - leakageRisk.score:', firstPatient.leakageRisk.score);
      console.log('  - leakageRisk.level:', firstPatient.leakageRisk.level);
      console.log('  - age:', firstPatient.age);
      console.log('  - daysSinceDischarge:', firstPatient.daysSinceDischarge);
      
    } else {
      console.log('\n❌ Patient list would NOT be displayed');
      console.log('Reasons:');
      console.log('  - isLoading:', isLoading);
      console.log('  - error:', dashboardError);
      console.log('  - totalPatients:', totalPatients);
    }
    
    return sortedPatients;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

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

testSimplifiedDashboard();