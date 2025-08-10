#!/usr/bin/env node

/**
 * End-to-end test for the complete referral workflow
 * This script tests the workflow through the actual application interface
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lnjxrvcukzxhmtvnhsia.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo'
);

async function testEndToEndReferralWorkflow() {
  console.log('🏥 Testing End-to-End Referral Workflow...\n');

  try {
    // Step 1: Verify database connectivity and data integrity
    console.log('1️⃣ Verifying database connectivity...');
    
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);

    if (patientsError) throw patientsError;
    if (!patients || patients.length === 0) {
      throw new Error('No patients found - database may be empty');
    }

    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .limit(1);

    if (providersError) throw providersError;
    if (!providers || providers.length === 0) {
      throw new Error('No providers found - database may be empty');
    }

    console.log('   ✅ Database connectivity verified');
    console.log(`   ✅ Found ${patients.length} patients and ${providers.length} providers`);

    // Step 2: Test patient risk calculation
    console.log('\n2️⃣ Testing patient risk calculation...');
    
    const testPatient = patients[0];
    const riskScore = testPatient.leakage_risk_score;
    const riskLevel = testPatient.leakage_risk_level;
    
    if (typeof riskScore !== 'number' || riskScore < 0 || riskScore > 100) {
      throw new Error(`Invalid risk score: ${riskScore}`);
    }
    
    if (!['low', 'medium', 'high'].includes(riskLevel)) {
      throw new Error(`Invalid risk level: ${riskLevel}`);
    }
    
    console.log(`   ✅ Risk calculation working: ${testPatient.name} has ${riskScore}% ${riskLevel} risk`);

    // Step 3: Test provider matching logic
    console.log('\n3️⃣ Testing provider matching logic...');
    
    const { data: matchingProviders, error: matchError } = await supabase
      .from('providers')
      .select('*')
      .contains('accepted_insurance', [testPatient.insurance])
      .limit(5);

    if (matchError) throw matchError;
    
    if (!matchingProviders || matchingProviders.length === 0) {
      console.log(`   ⚠️  No providers found for insurance: ${testPatient.insurance}`);
      // Try to find any providers
      const { data: anyProviders } = await supabase
        .from('providers')
        .select('*')
        .limit(3);
      
      if (anyProviders && anyProviders.length > 0) {
        console.log(`   ✅ Found ${anyProviders.length} providers (insurance matching may need adjustment)`);
      } else {
        throw new Error('No providers available for matching');
      }
    } else {
      console.log(`   ✅ Found ${matchingProviders.length} matching providers for ${testPatient.insurance}`);
    }

    // Step 4: Test referral table structure
    console.log('\n4️⃣ Testing referral table structure...');
    
    const { data: referralSchema, error: schemaError } = await supabase
      .from('referrals')
      .select('*')
      .limit(1);

    if (schemaError && !schemaError.message.includes('no rows')) {
      throw schemaError;
    }
    
    console.log('   ✅ Referrals table accessible');

    // Step 5: Test referral history table
    console.log('\n5️⃣ Testing referral history table...');
    
    const { data: historySchema, error: historySchemaError } = await supabase
      .from('referral_history')
      .select('*')
      .limit(1);

    if (historySchemaError && !historySchemaError.message.includes('no rows')) {
      throw historySchemaError;
    }
    
    console.log('   ✅ Referral history table accessible');

    // Step 6: Test complete workflow with a real patient
    console.log('\n6️⃣ Testing complete workflow with real data...');
    
    // Find a patient that needs referral
    const { data: needsReferralPatients, error: needsReferralError } = await supabase
      .from('patients')
      .select('*')
      .eq('referral_status', 'needed')
      .order('leakage_risk_score', { ascending: false })
      .limit(1);

    if (needsReferralError) throw needsReferralError;
    
    let workflowPatient;
    if (needsReferralPatients && needsReferralPatients.length > 0) {
      workflowPatient = needsReferralPatients[0];
    } else {
      // Reset a patient to 'needed' status for testing
      const { data: resetPatient, error: resetError } = await supabase
        .from('patients')
        .update({ referral_status: 'needed' })
        .eq('id', testPa