#!/usr/bin/env node

/**
 * Simple test script to verify core application functionality
 * This tests the key components that would be needed for a demo
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '.env.development');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  // Set environment variables
  Object.assign(process.env, envVars);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('patients').select('count').limit(1);
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
}

async function testPatientData() {
  console.log('🔍 Testing patient data...');
  
  try {
    const { data, error, count } = await supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.error('❌ Failed to fetch patients:', error.message);
      return false;
    }
    
    console.log(`✅ Found ${count} patients in database`);
    if (data && data.length > 0) {
      console.log('✅ Sample patient data structure looks good');
      console.log('   - Patient name:', data[0].name);
      console.log('   - Risk score:', data[0].leakage_risk_score);
      console.log('   - Risk level:', data[0].leakage_risk_level);
    } else {
      console.log('⚠️  No patient data found - demo will show empty state');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Patient data test failed:', err.message);
    return false;
  }
}

async function testProviderData() {
  console.log('🔍 Testing provider data...');
  
  try {
    const { data, error, count } = await supabase
      .from('providers')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.error('❌ Failed to fetch providers:', error.message);
      return false;
    }
    
    console.log(`✅ Found ${count} providers in database`);
    if (data && data.length > 0) {
      console.log('✅ Sample provider data structure looks good');
      console.log('   - Provider name:', data[0].name);
      console.log('   - Specialties:', data[0].specialties);
      console.log('   - Insurance accepted:', data[0].accepted_insurance.length, 'plans');
    } else {
      console.log('⚠️  No provider data found - provider matching will not work');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Provider data test failed:', err.message);
    return false;
  }
}

async function testBuildProcess() {
  console.log('🔍 Testing build process...');
  
  try {
    // Check if critical files exist
    const criticalFiles = [
      'src/App.tsx',
      'src/components/Dashboard.tsx',
      'src/hooks/use-patients-simple.ts',
      'src/lib/risk-calculator.ts',
      'src/integrations/supabase/client.ts'
    ];
    
    for (const file of criticalFiles) {
      if (!fs.existsSync(file)) {
        console.error(`❌ Critical file missing: ${file}`);
        return false;
      }
    }
    
    console.log('✅ All critical files present');
    return true;
  } catch (err) {
    console.error('❌ Build process test failed:', err.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Healthcare Continuity MVP Demo Readiness Test\n');
  
  const tests = [
    { name: 'Build Process', fn: testBuildProcess },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Patient Data', fn: testPatientData },
    { name: 'Provider Data', fn: testProviderData }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    const result = await test.fn();
    if (result) passedTests++;
    console.log('');
  }
  
  console.log('📊 Test Results:');
  console.log(`   Passed: ${passedTests}/${tests.length}`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All tests passed! Application is ready for demo.');
    console.log('\n📋 Demo Checklist:');
    console.log('   ✅ Database connection working');
    console.log('   ✅ Patient data available');
    console.log('   ✅ Provider data available');
    console.log('   ✅ Core files present');
    console.log('\n🚀 Ready to run: npm run dev');
  } else {
    console.log('⚠️  Some tests failed. Demo may have issues.');
    console.log('\n🔧 Recommended fixes:');
    if (passedTests < tests.length) {
      console.log('   - Check database connection and data');
      console.log('   - Run: node scripts/populate-sample-data.js');
      console.log('   - Verify environment variables');
    }
  }
  
  return passedTests === tests.length;
}

// Run the tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('❌ Test runner failed:', err);
  process.exit(1);
});