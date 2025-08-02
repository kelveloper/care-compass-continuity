import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function clearAllTables() {
  console.log("🗑️  Starting database reset - clearing all tables...\n");

  const tables = [
    'referrals',
    'provider_match_cache', 
    'patients',
    'providers'
  ];

  for (const table of tables) {
    try {
      console.log(`🧹 Clearing ${table} table...`);
      
      // Delete all records from the table
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // This will match all real records

      if (error) {
        console.log(`⚠️  Error clearing ${table}:`, error.message);
      } else {
        console.log(`✅ ${table} table cleared successfully`);
      }
    } catch (err) {
      console.log(`❌ Failed to clear ${table}:`, err.message);
    }
  }

  console.log("\n🎯 Database reset complete! All tables cleared.\n");
}

async function main() {
  try {
    await clearAllTables();
    console.log("✨ Database is now clean and ready for fresh data!");
    console.log("\n🚀 Next steps:");
    console.log("   1. Run: npm run populate-data");
    console.log("   2. Or run: node scripts/populate-sample-data.js");
  } catch (error) {
    console.error("❌ Reset failed:", error);
    process.exit(1);
  }
}

main();
