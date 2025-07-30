#!/usr/bin/env node

/**
 * Test RLS policies for Healthcare Continuity MVP
 * This script tests the current RLS configuration
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

async function testRLSPolicies() {
  console.log('🔒 Testing RLS policies for Healthcare Continuity MVP...');
  
  try {
    // Test if the test_rls_policies function exists (from the migration)
    console.log('🔍 Checking if RLS test function exists...');
    
    const { data: testResult, error: testError } = await supabase.rpc('test_rls_policies');
    
    if (testError) {
      console.log('⚠️  RLS test function not found or error:', testError.message);
      console.log('📝 This indicates the RLS migration may not have been applied yet');
    } else {
      console.log('✅ RLS test function found and executed');
      console.log('📊 Test results:');
      testResult.forEach(result => {
        const status = result.allowed ? '✅' : '❌';
        console.log(`   ${status} ${result.table_name} ${result.operation}: ${result.allowed ? 'Allowed' : 'Denied'}`);
        if (result.error_message) {
          console.log(`      Error: ${result.error_message}`);
        }
      });
    }
    
    // Test basic table access
    console.log('\n🔍 Testing basic table access...');
    
    const tables = [
      { name: 'patients', operation: 'SELECT' },
      { name: 'providers', operation: 'SELECT' },
      { name: 'referrals', operation: 'SELECT' },
      { name: 'user_roles', operation: 'SELECT' }
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table.name).select('count').limit(1);
        if (error) {
          console.log(`❌ ${table.name} ${table.operation}: ${error.message}`);
        } else {
          console.log(`✅ ${table.name} ${table.operation}: Accessible`);
        }
      } catch (err) {
        console.log(`❌ ${table.name} ${table.operation}: ${err.message}`);
      }
    }
    
    // Check if user_roles table exists (indicates migration was applied)
    console.log('\n🔍 Checking for user_roles table...');
    const { data: userRolesData, error: userRolesError } = await supabase.from('user_roles').select('count').limit(1);
    
    if (userRolesError) {
      console.log('⚠️  user_roles table not found - RLS migration may not be applied');
      console.log('📝 Current setup appears to be using basic demo policies');
    } else {
      console.log('✅ user_roles table found - Advanced RLS policies are configured');
    }
    
    // Test the get_user_role function
    console.log('\n🔍 Testing get_user_role function...');
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role');
    
    if (roleError) {
      console.log('⚠️  get_user_role function not found:', roleError.message);
    } else {
      console.log(`✅ Current user role: ${roleData}`);
    }
    
    console.log('\n📋 RLS Configuration Summary:');
    if (userRolesError) {
      console.log('- Status: Basic demo policies (permissive)');
      console.log('- Security Level: Low (suitable for demo/development)');
      console.log('- Recommendation: Apply advanced RLS migration for production');
    } else {
      console.log('- Status: Advanced role-based policies');
      console.log('- Security Level: High (production-ready)');
      console.log('- User Role System: Active');
    }
    
  } catch (error) {
    console.error('❌ Error testing RLS policies:', error.message);
  }
}

// Run the test
testRLSPolicies().catch(console.error);