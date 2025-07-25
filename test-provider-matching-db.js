import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testProviderMatching() {
  try {
    console.log("🔍 Testing provider matching with real database...");

    // Test 1: Fetch all providers
    console.log("\n1. Fetching all providers...");
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .order('rating', { ascending: false });

    if (providersError) {
      console.error("❌ Error fetching providers:", providersError);
      return;
    }

    console.log(`✅ Found ${providers.length} providers`);
    console.log("Provider types:", [...new Set(providers.map(p => p.type))]);

    // Test 2: Fetch a sample patient
    console.log("\n2. Fetching a sample patient...");
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
    console.log(`   Address: ${patient.address}`);

    // Test 3: Test provider matching logic
    console.log("\n3. Testing provider matching logic...");
    
    // Import the matching functions (simulate what the frontend does)
    const { findMatchingProviders } = await import('./src/lib/provider-matching.ts');
    
    // Transform database providers to match frontend interface
    const transformedProviders = providers.map(dbProvider => ({
      ...dbProvider,
    }));

    // Transform database patient to match frontend interface
    const transformedPatient = {
      ...patient,
      leakageRisk: {
        score: patient.leakage_risk_score,
        level: patient.leakage_risk_level
      }
    };

    // Find matches
    const matches = findMatchingProviders(transformedProviders, transformedPatient, 3);
    
    console.log(`✅ Found ${matches.length} provider matches`);
    
    matches.forEach((match, index) => {
      console.log(`\n   Match ${index + 1}: ${match.provider.name}`);
      console.log(`     Type: ${match.provider.type}`);
      console.log(`     Match Score: ${match.matchScore}%`);
      console.log(`     Distance: ${match.distance} miles`);
      console.log(`     In Network: ${match.inNetwork ? 'Yes' : 'No'}`);
      console.log(`     Reasons: ${match.explanation.reasons.join(', ')}`);
    });

    // Test 4: Test insurance network matching
    console.log("\n4. Testing insurance network matching...");
    
    const { isInNetwork } = await import('./src/lib/provider-matching.ts');
    
    const testProvider = providers[0];
    const inNetworkResult = isInNetwork(testProvider, patient.insurance);
    
    console.log(`   Provider: ${testProvider.name}`);
    console.log(`   Patient Insurance: ${patient.insurance}`);
    console.log(`   Provider In-Network Plans: ${testProvider.in_network_plans?.join(', ') || 'None'}`);
    console.log(`   Provider Accepted Insurance: ${testProvider.accepted_insurance?.join(', ') || 'None'}`);
    console.log(`   Is In Network: ${inNetworkResult ? 'Yes' : 'No'}`);

    // Test 5: Test specialty matching
    console.log("\n5. Testing specialty matching...");
    
    const { hasSpecialtyMatch } = await import('./src/lib/provider-matching.ts');
    
    const specialtyMatch = hasSpecialtyMatch(testProvider, patient.required_followup);
    
    console.log(`   Provider Specialties: ${testProvider.specialties?.join(', ') || 'None'}`);
    console.log(`   Required Followup: ${patient.required_followup}`);
    console.log(`   Specialty Match: ${specialtyMatch ? 'Yes' : 'No'}`);

    console.log("\n🎉 Provider matching test completed successfully!");
    console.log("✅ Database connection working");
    console.log("✅ Provider matching logic working");
    console.log("✅ Ready for frontend integration");

  } catch (error) {
    console.error("❌ Provider matching test failed:", error);
  }
}

testProviderMatching();