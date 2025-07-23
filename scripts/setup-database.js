import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabaseConnection() {
  try {
    console.log("🚀 Testing database connection and schema...");

    // Test patients table
    console.log("\n📋 Testing patients table...");
    const { data: patientsData, error: patientsError } = await supabase
      .from("patients")
      .select("*")
      .limit(1);

    if (patientsError) {
      console.log("❌ Patients table error:", patientsError.message);
      return;
    } else {
      console.log("✅ Patients table: Connected successfully");
      console.log("📊 Current patients count:", patientsData?.length || 0);
    }

    // Test providers table
    console.log("\n🏥 Testing providers table...");
    const { data: providersData, error: providersError } = await supabase
      .from("providers")
      .select("*")
      .limit(1);

    if (providersError) {
      console.log("❌ Providers table error:", providersError.message);
      return;
    } else {
      console.log("✅ Providers table: Connected successfully");
      console.log("📊 Current providers count:", providersData?.length || 0);
    }

    // Test insert capability with a sample patient
    console.log("\n🧪 Testing insert capability...");
    const testPatient = {
      name: "Test Patient",
      date_of_birth: "1980-01-01",
      diagnosis: "Test Diagnosis",
      discharge_date: "2025-01-20",
      required_followup: "Test Follow-up",
      insurance: "Test Insurance",
      address: "123 Test St, Boston, MA",
      leakage_risk_score: 75,
      leakage_risk_level: "medium",
      referral_status: "needed"
    };

    const { data: insertData, error: insertError } = await supabase
      .from("patients")
      .insert([testPatient])
      .select();

    if (insertError) {
      console.log("❌ Insert test failed:", insertError.message);
    } else {
      console.log("✅ Insert test successful!");
      console.log("📝 Created test patient with ID:", insertData[0]?.id);
      
      // Clean up test data
      await supabase
        .from("patients")
        .delete()
        .eq("id", insertData[0]?.id);
      console.log("🧹 Test data cleaned up");
    }

    console.log("\n🎉 Database schema verification complete!");
    console.log("✅ Ready for data population (Task 1.2)");

  } catch (error) {
    console.error("❌ Database test failed:", error);
  }
}

testDatabaseConnection();
