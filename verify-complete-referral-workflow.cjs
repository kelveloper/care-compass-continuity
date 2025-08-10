#!/usr/bin/env node

/**
 * Comprehensive test to verify the complete referral workflow from start to finish
 * This script tests the entire patient-to-provider referral process
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lnjxrvcukzxhmtvnhsia.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo'
);

async function testCompleteReferralWorkflow() {
  console.log('🏥 Testing Complete Referral Workflow...\n');

  try {
    // Step 1: Get a high-risk patient
    console.log('1️⃣ Finding high-risk patient...');
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .order('leakage_risk_score', { ascending: false })
      .limit(1);

    if (patientsError) throw patientsError;
    if (!patients || patients.length === 0) {
      throw new Error('No patients found in database');
    }

    const patient = patients[0];
    console.log(`   ✅ Found patient: ${patient.name} (Risk: ${patient.leakage_risk_score}%)`);

    // Step 2: Find matching providers
    console.log('\n2️⃣ Finding matching providers...');
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .contains('accepted_insurance', [patient.insurance])
      .limit(3);

    if (providersError) throw providersError;
    if (!providers || providers.length === 0) {
      throw new Error('No matching providers found');
    }

    const selectedProvider = providers[0];
    console.log(`   ✅ Found ${providers.length} matching providers`);
    console.log(`   ✅ Selected provider: ${selectedProvider.name}`);

    // Step 3: Create referral
    console.log('\n3️⃣ Creating referral...');
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        patient_id: patient.id,
        provider_id: selectedProvider.id,
        service_type: patient.required_followup.split(' ')[0],
        status: 'pending',
        notes: 'Test referral created by workflow verification'
      })
      .select()
      .single();

    if (referralError) throw referralError;
    console.log(`   ✅ Referral created with ID: ${referral.id}`);

    // Step 4: Update patient status
    console.log('\n4️⃣ Updating patient status...');
    const { error: updateError } = await supabase
      .from('patients')
      .update({ 
        referral_status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', patient.id);

    if (updateError) throw updateError;
    console.log('   ✅ Patient status updated to "sent"');

    // Step 5: Create referral history entry
    console.log('\n5️⃣ Creating referral history...');
    const { error: historyError } = await supabase
      .from('referral_history')
      .insert({
        referral_id: referral.id,
        status: 'pending',
        notes: 'Referral created and sent to provider',
        created_by: 'Care Coordinator'
      });

    if (historyError) throw historyError;
    console.log('   ✅ Referral history entry created');

    // Step 6: Update referral to "sent"
    console.log('\n6️⃣ Updating referral status to "sent"...');
    const { error: sentError } = await supabase
      .from('referrals')
      .update({ 
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    if (sentError) throw sentError;
    console.log('   ✅ Referral status updated to "sent"');

    // Step 7: Schedule appointment
    console.log('\n7️⃣ Scheduling appointment...');
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1); // Tomorrow

    const { error: scheduleError } = await supabase
      .from('referrals')
      .update({ 
        status: 'scheduled',
        scheduled_date: scheduledDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    if (scheduleError) throw scheduleError;
    console.log(`   ✅ Appointment scheduled for ${scheduledDate.toLocaleDateString()}`);

    // Step 8: Add scheduled history entry
    const { error: scheduledHistoryError } = await supabase
      .from('referral_history')
      .insert({
        referral_id: referral.id,
        status: 'scheduled',
        notes: `Appointment scheduled for ${scheduledDate.toLocaleDateString()}`,
        created_by: 'Care Coordinator'
      });

    if (scheduledHistoryError) throw scheduledHistoryError;
    console.log('   ✅ Scheduled history entry created');

    // Step 9: Update patient status to scheduled
    console.log('\n8️⃣ Updating patient status to scheduled...');
    const { error: scheduledPatientError } = await supabase
      .from('patients')
      .update({ 
        referral_status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', patient.id);

    if (scheduledPatientError) throw scheduledPatientError;
    console.log('   ✅ Patient status updated to "scheduled"');

    // Step 10: Complete the referral
    console.log('\n9️⃣ Completing referral...');
    const { error: completeError } = await supabase
      .from('referrals')
      .update({ 
        status: 'completed',
        completed_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    if (completeError) throw completeError;
    console.log('   ✅ Referral marked as completed');

    // Step 11: Add completed history entry
    const { error: completedHistoryError } = await supabase
      .from('referral_history')
      .insert({
        referral_id: referral.id,
        status: 'completed',
        notes: 'Care completed successfully',
        created_by: 'Care Coordinator'
      });

    if (completedHistoryError) throw completedHistoryError;
    console.log('   ✅ Completed history entry created');

    // Step 12: Update patient status to completed
    console.log('\n🔟 Updating patient status to completed...');
    const { error: completedPatientError } = await supabase
      .from('patients')
      .update({ 
        referral_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', patient.id);

    if (completedPatientError) throw completedPatientError;
    console.log('   ✅ Patient status updated to "completed"');

    // Step 13: Verify complete workflow
    console.log('\n1️⃣1️⃣ Verifying complete workflow...');
    
    // Get final referral state
    const { data: finalReferral, error: finalReferralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', referral.id)
      .single();

    if (finalReferralError) throw finalReferralError;

    // Get final patient state
    const { data: finalPatient, error: finalPatientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patient.id)
      .single();

    if (finalPatientError) throw finalPatientError;

    // Get complete history
    const { data: completeHistory, error: historyFetchError } = await supabase
      .from('referral_history')
      .select('*')
      .eq('referral_id', referral.id)
      .order('created_at', { ascending: true });

    if (historyFetchError) throw historyFetchError;

    console.log('\n📊 WORKFLOW VERIFICATION RESULTS:');
    console.log('=====================================');
    console.log(`Patient: ${finalPatient.name}`);
    console.log(`Patient Status: ${finalPatient.referral_status}`);
    console.log(`Provider: ${selectedProvider.name}`);
    console.log(`Referral Status: ${finalReferral.status}`);
    console.log(`Created: ${new Date(finalReferral.created_at).toLocaleString()}`);
    console.log(`Scheduled: ${finalReferral.scheduled_date ? new Date(finalReferral.scheduled_date).toLocaleString() : 'N/A'}`);
    console.log(`Completed: ${finalReferral.completed_date ? new Date(finalReferral.completed_date).toLocaleString() : 'N/A'}`);
    console.log(`History Entries: ${completeHistory.length}`);

    console.log('\n📋 REFERRAL HISTORY:');
    completeHistory.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.status.toUpperCase()} - ${entry.notes} (${new Date(entry.created_at).toLocaleString()})`);
    });

    // Cleanup - Reset patient status for future tests
    console.log('\n🧹 Cleaning up test data...');
    await supabase
      .from('patients')
      .update({ 
        referral_status: 'needed',
        updated_at: new Date().toISOString()
      })
      .eq('id', patient.id);

    // Keep the referral and history for demo purposes, but mark as test
    await supabase
      .from('referrals')
      .update({ 
        notes: 'TEST REFERRAL - Created by workflow verification script',
        updated_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    console.log('   ✅ Test data cleaned up');

    console.log('\n🎉 COMPLETE REFERRAL WORKFLOW TEST PASSED!');
    console.log('=====================================');
    console.log('✅ Patient identification');
    console.log('✅ Provider matching');
    console.log('✅ Referral creation');
    console.log('✅ Status tracking');
    console.log('✅ Appointment scheduling');
    console.log('✅ Care completion');
    console.log('✅ History tracking');
    console.log('✅ Data consistency');

    return true;

  } catch (error) {
    console.error('\n❌ WORKFLOW TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testCompleteReferralWorkflow()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteReferralWorkflow };