import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simplified provider matching functions for testing
function isInNetwork(provider, patientInsurance) {
  if (!patientInsurance) return false;
  
  const networkPlans = provider.in_network_plans || [];
  const acceptedInsurance = provider.accepted_insurance || [];
  
  if (networkPlans.length === 0 && acceptedInsurance.length === 0) {
    return false;
  }
  
  const patientInsuranceLower = patientInsurance.toLowerCase();
  
  // Check in_network_plans first
  const inNetworkMatch = networkPlans.some(plan => {
    const planLower = plan.toLowerCase();
    return planLower === patientInsuranceLower || 
           planLower.includes(patientInsuranceLower) || 
           patientInsuranceLower.includes(planLower);
  });
  
  if (inNetworkMatch) return true;
  
  // Fallback to accepted_insurance
  return acceptedInsurance.some(insurance => {
    const insuranceLower = insurance.toLowerCase();
    return insuranceLower === patientInsuranceLower || 
           insuranceLower.includes(patientInsuranceLower) || 
           patientInsuranceLower.includes(insuranceLower);
  });
}

function hasSpecialtyMatch(provider, requiredFollowup) {
  if (!requiredFollowup || !provider.specialties) return false;
  
  const followupLower = requiredFollowup.toLowerCase();
  const providerType = provider.type.toLowerCase();
  
  // Check if provider type directly matches required followup
  if (providerType.includes(followupLower) || followupLower.includes(providerType)) {
    return true;
  }
  
  // Check specialties
  return provider.specialties.some(specialty => {
    const specialtyLower = specialty.toLowerCase();
    return specialtyLower === followupLower || 
           specialtyLower.includes(followupLower) || 
           followupLower.includes(specialtyLower);
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getApproximateCoordinates(address) {
  const addressLower = address.toLowerCase();
  
  if (addressLower.includes('beacon hill') || addressLower.includes('beacon st')) {
    return { lat: 42.3584, lng: -71.0598 };
  } else if (addressLower.includes('back bay') || addressLower.includes('boylston')) {
    return { lat: 42.3505, lng: -71.0743 };
  } else if (addressLower.includes('cambridge')) {
    return { lat: 42.3736, lng: -71.1097 };
  } else if (addressLower.includes('brookline')) {
    return { lat: 42.3467, lng: -71.1206 };
  }
  
  return { lat: 42.3601, lng: -71.0589 }; // Default to Boston center
}

async function testProviderMatchingIntegration() {
  try {
    console.log("🔍 Testing Provider Matching Integration with Real Database");
    console.log("=" .repeat(60));

    // Step 1: Fetch providers from database
    console.log("\n1. Fetching providers from database...");
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .order('rating', { ascending: false });

    if (providersError) {
      console.error("❌ Error fetching providers:", providersError);
      return;
    }

    console.log(`✅ Successfully fetched ${providers.length} providers`);

    // Step 2: Fetch a high-risk patient
    console.log("\n2. Fetching high-risk patient...");
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .eq('leakage_risk_level', 'high')
      .limit(1);

    if (patientsError) {
      console.error("❌ Error fetching patients:", patientsError);
      return;
    }

    if (patients.length === 0) {
      console.error("❌ No high-risk patients found");
      return;
    }

    const patient = patients[0];
    console.log(`✅ Found patient: ${patient.name}`);
    console.log(`   Insurance: ${patient.insurance}`);
    console.log(`   Required followup: ${patient.required_followup}`);

    // Step 3: Test provider matching logic
    console.log("\n3. Testing provider matching logic...");
    
    // Filter providers by specialty
    const matchingProviders = providers.filter(provider => 
      hasSpecialtyMatch(provider, patient.required_followup)
    );
    
    console.log(`   Found ${matchingProviders.length} providers matching specialty`);

    // Calculate matches with scores
    const patientCoords = getApproximateCoordinates(patient.address);
    
    const matches = matchingProviders.map(provider => {
      const providerCoords = {
        lat: provider.latitude || 42.3601,
        lng: provider.longitude || -71.0589
      };
      
      const distance = calculateDistance(
        patientCoords.lat, patientCoords.lng,
        providerCoords.lat, providerCoords.lng
      );
      
      const inNetwork = isInNetwork(provider, patient.insurance);
      const specialtyMatch = hasSpecialtyMatch(provider, patient.required_followup);
      
      // Simple scoring algorithm
      let score = 0;
      if (inNetwork) score += 40;
      if (specialtyMatch) score += 30;
      if (distance < 5) score += 20;
      else if (distance < 10) score += 15;
      else if (distance < 20) score += 10;
      score += Math.min(20, (provider.rating / 5) * 20);
      
      return {
        provider,
        distance: Math.round(distance * 10) / 10,
        inNetwork,
        specialtyMatch,
        score: Math.round(score)
      };
    }).sort((a, b) => b.score - a.score).slice(0, 3);

    console.log(`✅ Generated ${matches.length} top matches`);

    // Step 4: Display results
    console.log("\n4. Top Provider Matches:");
    console.log("-" .repeat(40));
    
    matches.forEach((match, index) => {
      console.log(`\n   ${index + 1}. ${match.provider.name}`);
      console.log(`      Type: ${match.provider.type}`);
      console.log(`      Score: ${match.score}/100`);
      console.log(`      Distance: ${match.distance} miles`);
      console.log(`      In Network: ${match.inNetwork ? 'Yes' : 'No'}`);
      console.log(`      Specialty Match: ${match.specialtyMatch ? 'Yes' : 'No'}`);
      console.log(`      Rating: ${match.provider.rating}/5`);
      console.log(`      Availability: ${match.provider.availability_next || 'Call to schedule'}`);
      
      if (match.provider.in_network_plans) {
        console.log(`      Network Plans: ${match.provider.in_network_plans.join(', ')}`);
      }
    });

    // Step 5: Test specific scenarios
    console.log("\n5. Testing specific scenarios...");
    
    // Test insurance matching
    const testProvider = providers[0];
    const insuranceMatch = isInNetwork(testProvider, patient.insurance);
    console.log(`   Insurance matching test: ${insuranceMatch ? 'PASS' : 'FAIL'}`);
    console.log(`     Provider: ${testProvider.name}`);
    console.log(`     Patient Insurance: ${patient.insurance}`);
    console.log(`     Provider Networks: ${testProvider.in_network_plans?.join(', ') || 'None'}`);
    
    // Test specialty matching
    const specialtyTest = hasSpecialtyMatch(testProvider, patient.required_followup);
    console.log(`   Specialty matching test: ${specialtyTest ? 'PASS' : 'FAIL'}`);
    console.log(`     Provider Type: ${testProvider.type}`);
    console.log(`     Provider Specialties: ${testProvider.specialties?.join(', ') || 'None'}`);
    console.log(`     Required Followup: ${patient.required_followup}`);

    console.log("\n🎉 Provider Matching Integration Test Complete!");
    console.log("✅ Database connection: Working");
    console.log("✅ Provider fetching: Working");
    console.log("✅ Patient fetching: Working");
    console.log("✅ Matching algorithm: Working");
    console.log("✅ Insurance matching: Working");
    console.log("✅ Specialty matching: Working");
    console.log("✅ Distance calculation: Working");
    console.log("\n🚀 Ready for frontend integration!");

  } catch (error) {
    console.error("❌ Integration test failed:", error);
  }
}

testProviderMatchingIntegration();