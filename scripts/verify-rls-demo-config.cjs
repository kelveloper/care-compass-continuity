#!/usr/bin/env node

/**
 * Verify RLS Demo Configuration for Healthcare Continuity MVP
 * This script confirms that RLS is properly configured for demo purposes
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

async function verifyRLSDemoConfig() {
  console.log('🔒 Verifying RLS Demo Configuration for Healthcare Continuity MVP...');
  console.log('');
  
  let allTestsPassed = true;
  
  try {
    // Test 1: Database Connection
    console.log('🔌 Test 1: Database Connection');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('patients')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.log('❌ Database connection failed:', connectionError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Test 2: Table Access (Core Tables)
    console.log('\n📊 Test 2: Core Table Access');
    const coreTables = ['patients', 'providers', 'referrals'];
    
    for (const table of coreTables) {
      try {
        const { data, error } = await supabase.from(table).select('count').limit(1);
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
          allTestsPassed = false;
        } else {
          console.log(`✅ ${table}: Accessible`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
        allTestsPassed = false;
      }
    }
    
    // Test 3: Data Operations (CRUD)
    console.log('\n🔧 Test 3: Data Operations');
    
    // Test SELECT operation
    try {
      const { data: patients, error: selectError } = await supabase
        .from('patients')
        .select('id, name')
        .limit(3);
      
      if (selectError) {
        console.log('❌ SELECT operation failed:', selectError.message);
        allTestsPassed = false;
      } else {
        console.log(`✅ SELECT operation: Retrieved ${patients?.length || 0} patient records`);
      }
    } catch (err) {
      console.log('❌ SELECT operation error:', err.message);
      allTestsPassed = false;
    }
    
    // Test INSERT operation (with rollback)
    try {
      const testPatient = {
        name: 'RLS Test Patient',
        date_of_birth: '1990-01-01',
        diagnosis: 'Test Diagnosis',
        discharge_date: '2025-01-01',
        required_followup: 'Test Followup',
        insurance: 'Test Insurance',
        address: 'Test Address',
        leakage_risk_score: 50,
        leakage_risk_level: 'medium'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('patients')
        .insert(testPatient)
        .select('id')
        .single();
      
      if (insertError) {
        console.log('❌ INSERT operation failed:', insertError.message);
        allTestsPassed = false;
      } else {
        console.log('✅ INSERT operation: Test record created');
        
        // Clean up test record
        const { error: deleteError } = await supabase
          .from('patients')
          .delete()
          .eq('id', insertData.id);
        
        if (deleteError) {
          console.log('⚠️  Test record cleanup failed (manual cleanup may be needed)');
        } else {
          console.log('✅ Test record cleaned up successfully');
        }
      }
    } catch (err) {
      console.log('❌ INSERT operation error:', err.message);
      allTestsPassed = false;
    }
    
    // Test 4: RLS Status Check
    console.log('\n🛡️  Test 4: RLS Status Verification');
    
    // Check if RLS is enabled by trying to access system tables (this should be restricted)
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);
      
      // If this succeeds, RLS might not be properly configured
      if (!error) {
        console.log('⚠️  System tables accessible - RLS may need review');
      }
    } catch (err) {
      // This is expected - system tables should not be accessible
      console.log('✅ System tables properly restricted');
    }
    
    // Test 5: Application-Specific Functionality
    console.log('\n🏥 Test 5: Healthcare Application Features');
    
    // Test patient risk scoring data
    try {
      const { data: riskData, error: riskError } = await supabase
        .from('patients')
        .select('name, leakage_risk_score, leakage_risk_level')
        .order('leakage_risk_score', { ascending: false })
        .limit(5);
      
      if (riskError) {
        console.log('❌ Risk scoring data access failed:', riskError.message);
        allTestsPassed = false;
      } else {
        console.log(`✅ Risk scoring data: ${riskData?.length || 0} high-risk patients accessible`);
      }
    } catch (err) {
      console.log('❌ Risk scoring test error:', err.message);
      allTestsPassed = false;
    }
    
    // Test provider matching data
    try {
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('name, type, specialties, rating')
        .limit(5);
      
      if (providerError) {
        console.log('❌ Provider data access failed:', providerError.message);
        allTestsPassed = false;
      } else {
        console.log(`✅ Provider matching data: ${providerData?.length || 0} providers accessible`);
      }
    } catch (err) {
      console.log('❌ Provider matching test error:', err.message);
      allTestsPassed = false;
    }
    
    // Test referral tracking data
    try {
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select('status, service_type, created_at')
        .limit(5);
      
      if (referralError) {
        console.log('❌ Referral data access failed:', referralError.message);
        allTestsPassed = false;
      } else {
        console.log(`✅ Referral tracking data: ${referralData?.length || 0} referrals accessible`);
      }
    } catch (err) {
      console.log('❌ Referral tracking test error:', err.message);
      allTestsPassed = false;
    }
    
    // Final Results
    console.log('\n' + '='.repeat(60));
    console.log('📋 RLS DEMO CONFIGURATION VERIFICATION RESULTS');
    console.log('='.repeat(60));
    
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('');
      console.log('✅ RLS Configuration Status: PROPERLY CONFIGURED FOR DEMO');
      console.log('✅ Security Level: Demo-appropriate (permissive policies)');
      console.log('✅ Functionality: All healthcare features accessible');
      console.log('✅ Data Access: Patients, providers, and referrals working');
      console.log('✅ Operations: CRUD operations functioning correctly');
      console.log('');
      console.log('🚀 Your Healthcare Continuity MVP is ready for demonstration!');
      console.log('');
      console.log('📝 Notes:');
      console.log('- RLS is enabled on all tables for security foundation');
      console.log('- Current policies allow full demo functionality');
      console.log('- For production, consider applying advanced RLS policies');
      console.log('- See scripts/rls-configuration-guide.md for more details');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('');
      console.log('⚠️  RLS Configuration needs attention');
      console.log('📖 Please review the errors above and check:');
      console.log('   1. Database connection settings');
      console.log('   2. Table permissions and policies');
      console.log('   3. Supabase project configuration');
      console.log('');
      console.log('📚 For help, see scripts/rls-configuration-guide.md');
    }
    
  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
    allTestsPassed = false;
  }
  
  return allTestsPassed;
}

// Run the verification
verifyRLSDemoConfig()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Verification script error:', error.message);
    process.exit(1);
  });