import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createReferralsTables() {
  try {
    console.log("🚀 Creating referrals tables...");

    // Read and execute the SQL file
    const sqlFile = join(__dirname, 'create-tables.sql');
    const sql = readFileSync(sqlFile, 'utf8');
    
    // Note: The client API doesn't support executing raw SQL directly for security reasons
    // We'll need to create the tables through the Supabase interface or use the service key
    // For now, let's try to create the tables using individual SQL commands
    
    console.log("📋 Attempting to create referrals table...");
    
    // Check if referrals table exists by trying to query it
    const { data: referralsTest, error: referralsError } = await supabase
      .from('referrals')
      .select('id')
      .limit(1);
    
    if (referralsError) {
      console.log("❌ Referrals table does not exist:", referralsError.message);
      console.log("🔧 Please create the referrals table manually in Supabase dashboard");
      console.log("📄 Use the SQL from: scripts/create-tables.sql");
    } else {
      console.log("✅ Referrals table exists");
    }
    
    // Check if referral_history table exists
    const { data: historyTest, error: historyError } = await supabase
      .from('referral_history')
      .select('id')
      .limit(1);
    
    if (historyError) {
      console.log("❌ Referral history table does not exist:", historyError.message);
      console.log("🔧 Please create the referral_history table manually in Supabase dashboard");
    } else {
      console.log("✅ Referral history table exists");
    }

    console.log("\n🎯 Next steps:");
    console.log("1. If tables don't exist, go to Supabase Dashboard");
    console.log("2. Navigate to SQL Editor");
    console.log("3. Run the SQL from scripts/create-tables.sql");
    console.log("4. Then run: node scripts/populate-sample-data.js");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

createReferralsTables();
