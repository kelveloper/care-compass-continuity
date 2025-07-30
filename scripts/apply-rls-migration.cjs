#!/usr/bin/env node

/**
 * Apply RLS migration for Healthcare Continuity MVP
 * This script applies the advanced RLS policies migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.development
const envPath = path.join(__dirname, '..', '.env.development');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyRLSMigration() {
  console.log('🔒 Applying RLS migration for Healthcare Continuity MVP...');
  
  try {
    // Read the RLS migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250127000003_configure_rls_policies.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ RLS migration file not found:', migrationPath);
      return;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded successfully');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔧 Executing ${statements.length} migration statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }
      
      try {
        console.log(`   ${i + 1}/${statements.length}: Executing statement...`);
        
        // Use rpc to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try alternative approach using direct query
          const { error: directError } = await supabase.from('_').select('*').limit(0);
          console.log(`   ⚠️  Statement ${i + 1} may have failed: ${error.message}`);
          // Continue with other statements
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`   ⚠️  Statement ${i + 1} error: ${err.message}`);
        // Continue with other statements
      }
    }
    
    console.log('\n🔍 Verifying migration application...');
    
    // Test if the migration was applied successfully
    const { data: testResult, error: testError } = await supabase.rpc('test_rls_policies');
    
    if (testError) {
      console.log('⚠️  Migration verification failed - trying manual approach');
      
      // Since we can't execute raw SQL directly, let's create a simpler approach
      // We'll create a script that shows the user how to apply the migration manually
      console.log('\n📝 Manual Migration Instructions:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Navigate to your project: Healthcare Continuity MVP');
      console.log('3. Go to SQL Editor');
      console.log('4. Copy and paste the contents of: supabase/migrations/20250127000003_configure_rls_policies.sql');
      console.log('5. Execute the SQL');
      console.log('\nAlternatively, if you have Supabase CLI with service role key:');
      console.log('   supabase db push');
      
    } else {
      console.log('✅ Migration applied successfully!');
      console.log('📊 Test results:');
      testResult.forEach(result => {
        const status = result.allowed ? '✅' : '❌';
        console.log(`   ${status} ${result.table_name} ${result.operation}: ${result.allowed ? 'Allowed' : 'Denied'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error applying RLS migration:', error.message);
    console.log('\n📝 Manual Migration Required:');
    console.log('Since automatic migration failed, please apply the migration manually:');
    console.log('1. Open Supabase Dashboard SQL Editor');
    console.log('2. Execute the contents of: supabase/migrations/20250127000003_configure_rls_policies.sql');
  }
}

// Run the migration
applyRLSMigration().catch(console.error);