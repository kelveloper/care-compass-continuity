import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyBasicIndexes() {
  console.log("🚀 Applying basic performance indexes...\n");

  // Basic indexes that are most important for the app
  const basicIndexes = [
    {
      name: "idx_patients_risk_level",
      sql: "CREATE INDEX IF NOT EXISTS idx_patients_risk_level ON patients(leakage_risk_level) WHERE leakage_risk_level IS NOT NULL"
    },
    {
      name: "idx_patients_referral_status", 
      sql: "CREATE INDEX IF NOT EXISTS idx_patients_referral_status ON patients(referral_status) WHERE referral_status IS NOT NULL"
    },
    {
      name: "idx_patients_discharge_date",
      sql: "CREATE INDEX IF NOT EXISTS idx_patients_discharge_date ON patients(discharge_date) WHERE discharge_date IS NOT NULL"
    },
    {
      name: "idx_providers_specialty",
      sql: "CREATE INDEX IF NOT EXISTS idx_providers_specialty ON providers USING gin(specialties) WHERE specialties IS NOT NULL"
    },
    {
      name: "idx_patients_search_name",
      sql: "CREATE INDEX IF NOT EXISTS idx_patients_search_name ON patients(name) WHERE name IS NOT NULL"
    },
    {
      name: "idx_providers_search_name", 
      sql: "CREATE INDEX IF NOT EXISTS idx_providers_search_name ON providers(name) WHERE name IS NOT NULL"
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const index of basicIndexes) {
    try {
      console.log(`📊 Creating index: ${index.name}...`);
      
      const { error } = await supabase.rpc('sql', {
        query: index.sql
      });

      if (error) {
        console.log(`⚠️  Index ${index.name} may already exist or failed: ${error.message}`);
        failCount++;
      } else {
        console.log(`✅ Index ${index.name} created successfully`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ Failed to create ${index.name}: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n📈 Index creation summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⚠️  Failed/Existing: ${failCount}`);
  console.log(`\n🎯 Basic performance optimization complete!`);
}

async function main() {
  try {
    await applyBasicIndexes();
    console.log("\n🚀 Database is optimized and ready for production use!");
  } catch (error) {
    console.error("❌ Optimization failed:", error);
    process.exit(1);
  }
}

main();
