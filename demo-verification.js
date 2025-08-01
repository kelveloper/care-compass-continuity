#!/usr/bin/env node

/**
 * Demo Verification Script
 * Ensures the application is ready for a flawless demo experience
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

async function verifyDemoData() {
  console.log('🎯 Verifying Demo Data Quality...\n');
  
  // Check for high-risk patients (essential for demo story)
  const { data: highRiskPatients } = await supabase
    .from('patients')
    .select('*')
    .eq('leakage_risk_level', 'high')
    .order('leakage_risk_score', { ascending: false })
    .limit(5);
  
  console.log(`✅ High-risk patients: ${highRiskPatients?.length || 0}`);
  if (highRiskPatients && highRiskPatients.length > 0) {
    console.log(`   Top risk patient: ${highRiskPatients[0].name} (${highRiskPatients[0].leakage_risk_score}% risk)`);
  }
  
  // Check for providers with good coverage
  const { data: providers } = await supabase
    .from('providers')
    .select('*')
    .order('rating', { ascending: false })
    .limit(3);
  
  console.log(`✅ Top providers: ${providers?.length || 0}`);
  if (providers && providers.length > 0) {
    console.log(`   Best provider: ${providers[0].name} (${providers[0].rating}⭐)`);
  }
  
  // Check for diverse insurance types
  const { data: insuranceTypes } = await supabase
    .from('patients')
    .select('insurance')
    .limit(100);
  
  const uniqueInsurance = [...new Set(insuranceTypes?.map(p => p.insurance) || [])];
  console.log(`✅ Insurance diversity: ${uniqueInsurance.length} different types`);
  
  // Check for diverse diagnoses
  const { data: diagnoses } = await supabase
    .from('patients')
    .select('diagnosis')
    .limit(100);
  
  const uniqueDiagnoses = [...new Set(diagnoses?.map(p => p.diagnosis) || [])];
  console.log(`✅ Diagnosis diversity: ${uniqueDiagnoses.length} different conditions`);
  
  return {
    highRiskPatients: highRiskPatients?.length || 0,
    providers: providers?.length || 0,
    insuranceTypes: uniqueInsurance.length,
    diagnoses: uniqueDiagnoses.length
  };
}

async function verifyDemoScenarios() {
  console.log('\n🎬 Verifying Demo Scenarios...\n');
  
  // Scenario 1: High-risk patient needing physical therapy
  const { data: ptPatients } = await supabase
    .from('patients')
    .select('*')
    .ilike('required_followup', '%physical therapy%')
    .eq('leakage_risk_level', 'high')
    .limit(1);
  
  console.log(`✅ High-risk PT scenario: ${ptPatients?.length > 0 ? 'Available' : 'Missing'}`);
  
  // Scenario 2: Cardiac patient with insurance challenges
  const { data: cardiacPatients } = await supabase
    .from('patients')
    .select('*')
    .or('diagnosis.ilike.%cardiac%,diagnosis.ilike.%heart%')
    .limit(1);
  
  console.log(`✅ Cardiac patient scenario: ${cardiacPatients?.length > 0 ? 'Available' : 'Missing'}`);
  
  // Scenario 3: Provider matching for common specialties
  const { data: ptProviders } = await supabase
    .from('providers')
    .select('*')
    .contains('specialties', ['Physical Therapy'])
    .limit(1);
  
  console.log(`✅ PT provider matching: ${ptProviders?.length > 0 ? 'Available' : 'Missing'}`);
  
  return {
    ptScenario: ptPatients?.length > 0,
    cardiacScenario: cardiacPatients?.length > 0,
    providerMatching: ptProviders?.length > 0
  };
}

async function checkApplicationHealth() {
  console.log('\n🏥 Checking Application Health...\n');
  
  const healthChecks = [];
  
  // Check if all critical components exist
  const criticalFiles = [
    'src/App.tsx',
    'src/components/Dashboard.tsx',
    'src/components/PatientDetailContainer.tsx',
    'src/components/ProviderMatchCards.tsx',
    'src/hooks/use-patients-simple.ts',
    'src/hooks/use-provider-match.ts',
    'src/lib/risk-calculator.ts'
  ];
  
  let missingFiles = 0;
  for (const file of criticalFiles) {
    if (!fs.existsSync(file)) {
      console.log(`❌ Missing: ${file}`);
      missingFiles++;
    }
  }
  
  if (missingFiles === 0) {
    console.log('✅ All critical files present');
    healthChecks.push(true);
  } else {
    console.log(`❌ ${missingFiles} critical files missing`);
    healthChecks.push(false);
  }
  
  // Check environment configuration
  const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  let missingEnvVars = 0;
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.log(`❌ Missing environment variable: ${envVar}`);
      missingEnvVars++;
    }
  }
  
  if (missingEnvVars === 0) {
    console.log('✅ Environment variables configured');
    healthChecks.push(true);
  } else {
    console.log(`❌ ${missingEnvVars} environment variables missing`);
    healthChecks.push(false);
  }
  
  return healthChecks.every(check => check);
}

async function generateDemoScript() {
  console.log('\n📝 Generating Demo Script...\n');
  
  // Get a compelling patient story
  const { data: heroPatient } = await supabase
    .from('patients')
    .select('*')
    .eq('leakage_risk_level', 'high')
    .order('leakage_risk_score', { ascending: false })
    .limit(1);
  
  if (heroPatient && heroPatient.length > 0) {
    const patient = heroPatient[0];
    console.log('🎭 Hero Patient Story:');
    console.log(`   Name: ${patient.name}`);
    console.log(`   Condition: ${patient.diagnosis}`);
    console.log(`   Risk Score: ${patient.leakage_risk_score}% (${patient.leakage_risk_level} risk)`);
    console.log(`   Needs: ${patient.required_followup}`);
    console.log(`   Insurance: ${patient.insurance}`);
    console.log(`   Days since discharge: ${Math.ceil((new Date() - new Date(patient.discharge_date)) / (1000 * 60 * 60 * 24))}`);
  }
  
  // Get matching providers
  const { data: matchingProviders } = await supabase
    .from('providers')
    .select('*')
    .order('rating', { ascending: false })
    .limit(3);
  
  if (matchingProviders && matchingProviders.length > 0) {
    console.log('\n🏥 Top Provider Recommendations:');
    matchingProviders.forEach((provider, index) => {
      console.log(`   ${index + 1}. ${provider.name}`);
      console.log(`      Rating: ${provider.rating}⭐`);
      console.log(`      Specialties: ${provider.specialties.join(', ')}`);
      console.log(`      Insurance: ${provider.accepted_insurance.length} plans accepted`);
    });
  }
}

async function runDemoVerification() {
  console.log('🚀 Healthcare Continuity MVP - Demo Verification\n');
  console.log('=' .repeat(60));
  
  try {
    // Run all verification checks
    const dataQuality = await verifyDemoData();
    const scenarios = await verifyDemoScenarios();
    const appHealth = await checkApplicationHealth();
    
    // Generate demo script
    await generateDemoScript();
    
    // Final assessment
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Demo Readiness Assessment:');
    
    const score = [
      dataQuality.highRiskPatients > 0,
      dataQuality.providers > 0,
      dataQuality.insuranceTypes > 3,
      scenarios.ptScenario,
      scenarios.cardiacScenario,
      scenarios.providerMatching,
      appHealth
    ].filter(Boolean).length;
    
    const maxScore = 7;
    const percentage = Math.round((score / maxScore) * 100);
    
    console.log(`   Overall Score: ${score}/${maxScore} (${percentage}%)`);
    
    if (percentage >= 90) {
      console.log('🎉 EXCELLENT - Demo ready!');
      console.log('   All systems operational. Demo will be flawless.');
    } else if (percentage >= 75) {
      console.log('✅ GOOD - Demo ready with minor notes');
      console.log('   Demo will work well with minor limitations.');
    } else if (percentage >= 60) {
      console.log('⚠️  FAIR - Demo possible but needs attention');
      console.log('   Some features may not work optimally.');
    } else {
      console.log('❌ POOR - Demo needs significant work');
      console.log('   Major issues need to be resolved first.');
    }
    
    console.log('\n🎯 Demo Tips:');
    console.log('   1. Start with the highest risk patient');
    console.log('   2. Show the risk calculation breakdown');
    console.log('   3. Demonstrate provider matching');
    console.log('   4. Highlight the "Why this provider?" feature');
    console.log('   5. Show the referral workflow');
    
    return percentage >= 75;
    
  } catch (error) {
    console.error('❌ Demo verification failed:', error.message);
    return false;
  }
}

// Run the verification
runDemoVerification().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});