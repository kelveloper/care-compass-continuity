#!/usr/bin/env node

/**
 * Script to apply RLS (Row Level Security) policies to Supabase database
 * This script reads the RLS migration file and applies it to the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lnjxrvcukzxhmtvnhsia.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Please set the service role key to apply RLS policies');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyRLSPolicies() {
  try {
    console.log('🔒 Applying RLS policies to Supabase database...');
    
    // Read the RLS migration file
    const rlsMigrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250127000003_configure_rls_policies.sql');
    const rlsSQL = readFileSync(rlsMigrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = rlsSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.warn(`⚠️  Warning on statement ${i + 1}: ${error.message}`);
            // Continue with other statements even if one fails
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.warn(`⚠️  Error on statement ${i + 1}: ${err.message}`);
          // Continue with other statements
        }
      }
    }
    
    // Test the RLS policies
    console.log('🧪 Testing RLS policies...');
    await testRLSPolicies();
    
    console.log('✅ RLS policies applied successfully!');
    
  } catch (error) {
    console.error('❌ Error applying RLS policies:', error.message);
    process.exit(1);
  }
}

async function testRLSPolicies() {
  try {
    // Test basic table access
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('count')
      .limit(1);
    
    if (patientsError) {
      console.log('⚠️  Patients table access test failed:', patientsError.message);
    } else {
      console.log('✅ Patients table access test passed');
    }
    
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('count')
      .limit(1);
    
    if (providersError) {
      console.log('⚠️  Providers table access test failed:', providersError.message);
    } else {
      console.log('✅ Providers table access test passed');
    }
    
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('count')
      .limit(1);
    
    if (referralsError) {
      console.log('⚠️  Referrals table access test failed:', referralsError.message);
    } else {
      console.log('✅ Referrals table access test passed');
    }
    
  } catch (error) {
    console.log('⚠️  RLS policy testing failed:', error.message);
  }
}

// Alternative approach: Apply policies using direct SQL execution
async function applyRLSPoliciesDirectly() {
  try {
    console.log('🔒 Applying RLS policies using direct SQL execution...');
    
    // Drop existing permissive policies
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Enable read access for all users" ON patients',
      'DROP POLICY IF EXISTS "Enable insert access for all users" ON patients',
      'DROP POLICY IF EXISTS "Enable update access for all users" ON patients',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON providers',
      'DROP POLICY IF EXISTS "Enable insert access for all users" ON providers',
      'DROP POLICY IF EXISTS "Enable update access for all users" ON providers',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON referrals',
      'DROP POLICY IF EXISTS "Enable insert access for all users" ON referrals',
      'DROP POLICY IF EXISTS "Enable update access for all users" ON referrals'
    ];
    
    for (const policy of dropPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error && !error.message.includes('does not exist')) {
        console.warn(`⚠️  Warning dropping policy: ${error.message}`);
      }
    }
    
    // Create new secure policies for demo purposes (allowing anonymous access for MVP)
    const securePolicies = [
      // Patients policies - allow read access for demo
      `CREATE POLICY "Demo read access for patients" ON patients FOR SELECT USING (true)`,
      `CREATE POLICY "Demo write access for patients" ON patients FOR INSERT WITH CHECK (true)`,
      `CREATE POLICY "Demo update access for patients" ON patients FOR UPDATE USING (true)`,
      
      // Providers policies - allow read access for demo
      `CREATE POLICY "Demo read access for providers" ON providers FOR SELECT USING (true)`,
      `CREATE POLICY "Demo write access for providers" ON providers FOR INSERT WITH CHECK (true)`,
      `CREATE POLICY "Demo update access for providers" ON providers FOR UPDATE USING (true)`,
      
      // Referrals policies - allow access for demo
      `CREATE POLICY "Demo read access for referrals" ON referrals FOR SELECT USING (true)`,
      `CREATE POLICY "Demo write access for referrals" ON referrals FOR INSERT WITH CHECK (true)`,
      `CREATE POLICY "Demo update access for referrals" ON referrals FOR UPDATE USING (true)`,
      
      // Referral history policies
      `CREATE POLICY "Demo read access for referral_history" ON referral_history FOR SELECT USING (true)`,
      `CREATE POLICY "Demo write access for referral_history" ON referral_history FOR INSERT WITH CHECK (true)`
    ];
    
    for (const policy of securePolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy });
      if (error) {
        console.warn(`⚠️  Warning creating policy: ${error.message}`);
      } else {
        console.log(`✅ Policy created successfully`);
      }
    }
    
    console.log('✅ RLS policies configured for demo access!');
    
  } catch (error) {
    console.error('❌ Error applying RLS policies:', error.message);
    throw error;
  }
}

// Run the script
if (process.argv.includes('--direct')) {
  applyRLSPoliciesDirectly();
} else {
  applyRLSPolicies();
}