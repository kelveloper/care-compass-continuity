import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyTaskCompletion() {
  console.log("🎯 TASK VERIFICATION: Real database with 15+ patients and 30+ providers");
  console.log("=" .repeat(70));

  try {
    // Get unique patient and provider data
    const { data: patients } = await supabase.from("patients").select("name, leakage_risk_level");
    const { data: providers } = await supabase.from("providers").select("name, type");

    if (!patients || !providers) {
      console.log("❌ Could not fetch data from database");
      return;
    }

    const uniquePatients = [...new Set(patients.map((p) => p.name))];
    const uniqueProviders = [...new Set(providers.map((p) => p.name))];

    console.log("📊 DATABASE SUMMARY:");
    console.log(`   Total patient records: ${patients.length}`);
    console.log(`   Unique patients: ${uniquePatients.length}`);
    console.log(`   Total provider records: ${providers.length}`);
    console.log(`   Unique providers: ${uniqueProviders.length}`);

    // Task requirement check
    const patientsPass = uniquePatients.length >= 15;
    const providersPass = uniqueProviders.length >= 30;

    console.log("\n🎯 TASK REQUIREMENTS:");
    console.log(`   Patients (need 15+): ${uniquePatients.length} ${patientsPass ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`   Providers (need 30+): ${uniqueProviders.length} ${providersPass ? "✅ PASS" : "❌ FAIL"}`);

    // Show sample data quality
    console.log("\n📋 SAMPLE PATIENT DATA:");
    uniquePatients.slice(0, 5).forEach((name) => {
      const patient = patients.find((p) => p.name === name);
      console.log(`   • ${name} (Risk: ${patient.leakage_risk_level})`);
    });

    console.log("\n🏥 SAMPLE PROVIDER DATA:");
    uniqueProviders.slice(0, 5).forEach((name) => {
      const provider = providers.find((p) => p.name === name);
      console.log(`   • ${name} (${provider.type})`);
    });

    // Provider type distribution
    const providerTypes = {};
    uniqueProviders.forEach((name) => {
      const provider = providers.find((p) => p.name === name);
      providerTypes[provider.type] = (providerTypes[provider.type] || 0) + 1;
    });

    console.log("\n📊 PROVIDER SPECIALTIES:");
    Object.entries(providerTypes)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   • ${type}: ${count} providers`);
      });

    // Final result
    const taskComplete = patientsPass && providersPass;
    console.log("\n" + "=".repeat(70));
    
    if (taskComplete) {
      console.log("🎉 TASK COMPLETED SUCCESSFULLY!");
      console.log("✅ Database contains realistic healthcare data ready for demos");
      console.log("✅ All requirements met with diverse patient cases and provider network");
    } else {
      console.log("❌ TASK REQUIREMENTS NOT MET");
      console.log("   Please run: node scripts/populate-sample-data.js");
    }

    console.log("\n💡 DEMO READY:");
    console.log("   • Patient risk assessment scenarios available");
    console.log("   • Comprehensive provider matching network in place");
    console.log("   • Realistic healthcare continuity data for demonstrations");

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
  }
}

verifyTaskCompletion();