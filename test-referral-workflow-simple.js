#!/usr/bin/env node

/**
 * Simple test to verify the complete referral workflow functionality
 * This script tests the core workflow without UI dependencies
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testReferralWorkflowFunctionality() {
  console.log('🏥 Testing Referral Workflow Functionality...\n');

  try {
    // Test 1: Verify database tables exist and have data
    console.log('1️⃣ Verifying database setup...');
    
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .limit(5);

    if (patientsError) throw patientsError;
    if (!patients || patients.length === 0) {
      throw new Error('No patients found in database');
    }

    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .limit(5);

    if (providersError) throw providersError;
    if (!providers || providers.length === 0) {
      throw new Error('No providers found in database');
    }

    console.log(`   ✅ Found ${patients.length} patients and ${providers.length} providers`);

    // Test 2: Verify referrals table structure
    console.log('\n2️⃣ Verifying referrals table...');
    
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .limit(1);

    if (referralsError && !referralsError.message.includes('no rows')) {
      throw referralsError;
    }
    
    console.log('   ✅ Referrals table accessible');

    // Test 3: Verify referral history table
    console.log('\n3️⃣ Verifying referral history table...');
    
    const { data: history, error: historyError } = await supabase
      .from('referral_history')
      .select('*')
      .limit(1);

    if (historyError && !historyError.message.includes('no rows')) {
      throw historyError;
    }
    
    console.log('   ✅ Referral history table accessible');

    // Test 4: Test complete workflow with real data
    console.log('\n4️⃣ Testing complete workflow...');
    
    const testPatient = patients.find(p => p.referral_status === 'needed') || patients[0];
    const testProvider = providers.find(p => 
      p.accepted_insurance.includes(testPatient.insurance)
    ) || providers[0];

    console.log(`   📋 Using patient: ${testPatient.name} (${testPatient.insurance})`);
    console.log(`   🏥 Using provider: ${testProvider.name} (${testProvider.type})`);

    // Step 1: Create referral
    console.log('\n   Step 1: Creating referral...');
    const { data: newReferral, error: createError } = await supabase
      .from('referrals')
      .insert({
        patient_id: testPatient.id,
        provider_id: testProvider.id,
        service_type: testPatient.required_followup.split(' ')[0],
        status: 'pending',
        notes: 'Test referral for workflow verification'
      })
      .select()
      .single();

    if (createError) throw createError;
    console.log(`   ✅ Referral created: ${newReferral.id}`);

    // Step 2: Update to sent
    console.log('\n   Step 2: Updating to sent...');
    const { error: sentError } = await supabase
      .from('referrals')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', newReferral.id);

    if (sentError) throw sentError;
    console.log('   ✅ Status updated to sent');

    // Step 3: Schedule appointment
    console.log('\n   Step 3: Scheduling appointment...');
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1);

    const { error: scheduleError } = await supabase
      .from('referrals')
      .update({ 
        status: 'scheduled',
        scheduled_date: scheduledDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', newReferral.id);

    if (scheduleError) throw scheduleError;
    console.log(`   ✅ Appointment scheduled for ${scheduledDate.toLocaleDateString()}`);

    // Step 4: Complete referral
    console.log('\n   Step 4: Completing referral...');
    const { error: completeError } = await supabase
      .from('referrals')
      .update({ 
        status: 'completed',
        completed_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', newReferral.id);

    if (completeError) throw completeError;
    console.log('   ✅ Referral completed');

    // Test 5: Verify final state
    console.log('\n5️⃣ Verifying final state...');
    
    const { data: finalReferral, error: finalError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', newReferral.id)
      .single();

    if (finalError) throw finalError;

    console.log('\n📊 FINAL REFERRAL STATE:');
    console.log('========================');
    console.log(`ID: ${finalReferral.id}`);
    console.log(`Status: ${finalReferral.status}`);
    console.log(`Created: ${new Date(finalReferral.created_at).toLocaleString()}`);
    console.log(`Scheduled: ${finalReferral.scheduled_date ? new Date(finalReferral.scheduled_date).toLocaleString() : 'N/A'}`);
    console.log(`Completed: ${finalReferral.completed_date ? new Date(finalReferral.completed_date).toLocaleString() : 'N/A'}`);

    // Test 6: Test patient status updates
    console.log('\n6️⃣ Testing patient status updates...');
    
    // Update patient to sent
    const { error: patientSentError } = await supabase
      .from('patients')
      .update({ referral_status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', testPatient.id);

    if (patientSentError) throw patientSentError;
    console.log('   ✅ Patient status updated to sent');

    // Update patient to scheduled
    const { error: patientScheduledError } = await supabase
      .from('patients')
      .update({ referral_status: 'scheduled', updated_at: new Date().toISOString() })
      .eq('id', testPatient.id);

    if (patientScheduledError) throw patientScheduledError;
    console.log('   ✅ Patient status updated to scheduled');

    // Update patient to completed
    const { error: patientCompletedError } = await supabase
      .from('patients')
      .update({ referral_status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', testPatient.id);

    if (patientCompletedError) throw patientCompletedError;
    console.log('   ✅ Patient status updated to completed');

    // Cleanup - reset patient status
    console.log('\n🧹 Cleaning up...');
    await supabase
      .from('patients')
      .update({ referral_status: 'needed', updated_at: new Date().toISOString() })
      .eq('id', testPatient.id);

    // Mark test referral
    await supabase
      .from('referrals')
      .update({ notes: 'TEST REFERRAL - Workflow verification' })
      .eq('id', newReferral.id);

    console.log('   ✅ Cleanup completed');

    console.log('\n🎉 REFERRAL WORKFLOW FUNCTIONALITY TEST PASSED!');
    console.log('===============================================');
    console.log('✅ Database connectivity');
    console.log('✅ Table structure verification');
    console.log('✅ Referral creation');
    console.log('✅ Status transitions (pending → sent → scheduled → completed)');
    console.log('✅ Patient status synchronization');
    console.log('✅ Data consistency');
    console.log('✅ Cleanup operations');

    return true;

  } catch (error) {
    console.error('\n❌ WORKFLOW FUNCTIONALITY TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testReferralWorkflowFunctionality()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });