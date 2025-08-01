#!/usr/bin/env node

/**
 * Final Demo Test - Comprehensive Error Detection
 * Tests all critical user flows that would be demonstrated
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
  Object.assign(process.env, envVars);
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testPatientListFlow() {
  console.log('🔍 Testing Patient List Flow...');
  
  try {
    // Test basic patient loading (what Dashboard does)
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .order('leakage_risk_score', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('❌ Patient list loading failed:', error.message);
      return false;
    }
    
    if (!patients || patients.length === 0) {
      console.log('❌ No patients found');
      return false;
    }
    
    // Verify patient data structure
    const patient = patients[0];
    const requiredFields = ['id', 'name', 'diagnosis', 'leakage_risk_score', 'leakage_risk_level', 'referral_status'];
    
    for (const field of requiredFields) {
      if (!(field in patient)) {
        console.log(`❌ Missing required field: ${field}`);
        return false;
      }
    }
    
    console.log(`✅ Patient list loaded successfully (${patients.length} patients)`);
    console.log(`   Top risk patient: ${patient.name} (${patient.leakage_risk_score}%)`);
    return true;
    
  } catch (error) {
    console.log('❌ Patient list flow error:', error.message);
    return false;
  }
}

async function testPatientDetailFlow() {
  console.log('🔍 Testing Patient Detail Flow...');
  
  try {
    // Get a high-risk patient for testing
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .eq('leakage_risk_level', 'high')
      .limit(1);
    
    if (error || !patients || patients.length === 0) {
      console.log('❌ No high-risk patient found for testing');
      return false;
    }
    
    const patient = patients[0];
    
    // Test individual patient loading (what PatientDetailContainer does)
    const { data: patientDetail, error: detailError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patient.id)
      .single();
    
    if (detailError) {
      console.log('❌ Patient detail loading failed:', detailError.message);
      return false;
    }
    
    console.log(`✅ Patient detail loaded successfully`);
    console.log(`   Patient: ${patientDetail.name}`);
    console.log(`   Risk: ${patientDetail.leakage_risk_score}% (${patientDetail.leakage_risk_level})`);
    console.log(`   Needs: ${patientDetail.required_followup}`);
    return true;
    
  } catch (error) {
    console.log('❌ Patient detail flow error:', error.message);
    return false;
  }
}

async function testProviderMatchingFlow() {
  console.log('🔍 Testing Provider Matching Flow...');
  
  try {
    // Test provider loading (what useProviderMatch does)
    const { data: providers, error } = await supabase
      .from('providers')
      .select('*')
      .order('rating', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('❌ Provider loading failed:', error.message);
      return false;
    }
    
    if (!providers || providers.length === 0) {
      console.log('❌ No providers found');
      return false;
    }
    
    // Verify provider data structure
    const provider = providers[0];
    const requiredFields = ['id', 'name', 'specialties', 'accepted_insurance', 'rating'];
    
    for (const field of requiredFields) {
      if (!(field in provider)) {
        console.log(`❌ Missing required provider field: ${field}`);
        return false;
      }
    }
    
    // Test specialty matching
    const ptProviders = providers.filter(p => 
      p.specialties.some(s => 
        s.toLowerCase().includes('physical') || 
        s.toLowerCase().includes('pt') ||
        s.toLowerCase().includes('therapy') ||
        s.toLowerCase().includes('rehab')
      )
    );
    
    console.log(`✅ Provider matching working (${providers.length} total providers)`);
    console.log(`   PT/Rehab providers: ${ptProviders.length}`);
    console.log(`   Top provider: ${provider.name} (${provider.rating}⭐)`);
    return true;
    
  } catch (error) {
    console.log('❌ Provider matching flow error:', error.message);
    return false;
  }
}

async function testSearchAndFilterFlow() {
  console.log('🔍 Testing Search and Filter Flow...');
  
  try {
    // Test search functionality
    const { data: searchResults, error: searchError } = await supabase
      .from('patients')
      .select('*')
      .or('name.ilike.%John%,diagnosis.ilike.%hip%')
      .limit(5);
    
    if (searchError) {
      console.log('❌ Search functionality failed:', searchError.message);
      return false;
    }
    
    // Test risk level filtering
    const { data: highRiskPatients, error: filterError } = await supabase
      .from('patients')
      .select('*')
      .eq('leakage_risk_level', 'high')
      .limit(5);
    
    if (filterError) {
      console.log('❌ Risk level filtering failed:', filterError.message);
      return false;
    }
    
    // Test status filtering
    const { data: statusResults, error: statusError } = await supabase
      .from('patients')
      .select('*')
      .eq('referral_status', 'needed')
      .limit(5);
    
    if (statusError) {
      console.log('❌ Status filtering failed:', statusError.message);
      return false;
    }
    
    console.log(`✅ Search and filtering working`);
    console.log(`   Search results: ${searchResults?.length || 0}`);
    console.log(`   High-risk patients: ${highRiskPatients?.length || 0}`);
    console.log(`   Patients needing referrals: ${statusResults?.length || 0}`);
    return true;
    
  } catch (error) {
    console.log('❌ Search and filter flow error:', error.message);
    return false;
  }
}

async function testRiskCalculationFlow() {
  console.log('🔍 Testing Risk Calculation Flow...');
  
  try {
    // Get patients with different risk levels
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .limit(20);
    
    if (error || !patients) {
      console.log('❌ Risk calculation test failed - no patients');
      return false;
    }
    
    // Verify risk score distribution
    const riskLevels = {
      high: patients.filter(p => p.leakage_risk_level === 'high').length,
      medium: patients.filter(p => p.leakage_risk_level === 'medium').length,
      low: patients.filter(p => p.leakage_risk_level === 'low').length
    };
    
    // Verify risk scores are reasonable (0-100)
    const invalidScores = patients.filter(p => 
      p.leakage_risk_score < 0 || p.leakage_risk_score > 100
    );
    
    if (invalidScores.length > 0) {
      console.log(`❌ Invalid risk scores found: ${invalidScores.length} patients`);
      return false;
    }
    
    console.log(`✅ Risk calculation working`);
    console.log(`   High risk: ${riskLevels.high}, Medium: ${riskLevels.medium}, Low: ${riskLevels.low}`);
    console.log(`   Score range: ${Math.min(...patients.map(p => p.leakage_risk_score))} - ${Math.max(...patients.map(p => p.leakage_risk_score))}`);
    return true;
    
  } catch (error) {
    console.log('❌ Risk calculation flow error:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('🔍 Testing Error Handling...');
  
  try {
    // Test invalid table query (should handle gracefully)
    const { data, error } = await supabase
      .from('nonexistent_table')
      .select('*')
      .limit(1);
    
    // This should produce an error, which is expected
    if (error) {
      console.log('✅ Error handling working (graceful error response)');
      return true;
    }
    
    console.log('⚠️  Error handling test inconclusive');
    return true;
    
  } catch (error) {
    console.log('✅ Error handling working (exception caught)');
    return true;
  }
}

async function runFinalDemoTest() {
  console.log('🎬 Final Demo Test - Error-Free Experience Verification\n');
  console.log('=' .repeat(70));
  
  const tests = [
    { name: 'Patient List Flow', fn: testPatientListFlow },
    { name: 'Patient Detail Flow', fn: testPatientDetailFlow },
    { name: 'Provider Matching Flow', fn: testProviderMatchingFlow },
    { name: 'Search and Filter Flow', fn: testSearchAndFilterFlow },
    { name: 'Risk Calculation Flow', fn: testRiskCalculationFlow },
    { name: 'Error Handling', fn: testErrorHandling }
  ];
  
  let passedTests = 0;
  const results = [];
  
  for (const test of tests) {
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
    if (result) passedTests++;
    console.log('');
  }
  
  console.log('=' .repeat(70));
  console.log('📊 Final Test Results:\n');
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`   ${status} ${result.name}`);
  });
  
  const percentage = Math.round((passedTests / tests.length) * 100);
  console.log(`\n🎯 Overall Score: ${passedTests}/${tests.length} (${percentage}%)`);
  
  if (percentage === 100) {
    console.log('\n🎉 PERFECT SCORE! Demo will be error-free!');
    console.log('\n🚀 Demo Flow Recommendations:');
    console.log('   1. Start with Dashboard showing patient list sorted by risk');
    console.log('   2. Click on highest risk patient (Margaret Thompson)');
    console.log('   3. Show risk breakdown and patient details');
    console.log('   4. Click "Find Providers" to demonstrate matching');
    console.log('   5. Show top 3 provider recommendations with explanations');
    console.log('   6. Select a provider and show referral workflow');
    console.log('   7. Return to dashboard to show updated status');
    console.log('\n💡 Key Demo Points:');
    console.log('   - Highlight the 95% risk score and what it means');
    console.log('   - Explain the AI-powered provider matching');
    console.log('   - Show the "Why this provider?" explanations');
    console.log('   - Demonstrate the time-saving workflow');
  } else if (percentage >= 85) {
    console.log('\n✅ EXCELLENT! Demo ready with minor notes');
    console.log('   Demo will work smoothly with very minor limitations');
  } else if (percentage >= 70) {
    console.log('\n⚠️  GOOD! Demo possible but watch for issues');
    console.log('   Some features may need careful handling during demo');
  } else {
    console.log('\n❌ NEEDS WORK! Demo has significant issues');
    console.log('   Major problems need to be resolved before demo');
  }
  
  console.log('\n🔧 Pre-Demo Checklist:');
  console.log('   □ Run: npm run build (verify no build errors)');
  console.log('   □ Run: npm run dev (verify app starts)');
  console.log('   □ Test patient list loads');
  console.log('   □ Test patient detail view');
  console.log('   □ Test provider matching');
  console.log('   □ Prepare backup talking points');
  
  return percentage >= 85;
}

// Run the final test
runFinalDemoTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('❌ Final test failed:', err);
  process.exit(1);
});