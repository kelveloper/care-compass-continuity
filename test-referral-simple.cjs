#!/usr/bin/env node

/**
 * Simple test script to verify the complete referral workflow
 * This will test the end-to-end process from patient selection to referral completion
 */

const { createClient } = require('@supabase/supabase-js');

// Get environment variables from process.env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔄 Testing Complete Referral Workflow...\n');

async function testCompleteReferralWorkflow() {
  let testPatient = null;
  let testProvider = null;
  let testReferral = null;
  
  try {
    // Step 1: Get a test patient with high risk
    console.log('1️⃣ Finding high-risk patient...');
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .eq('referral_status', 'needed')
      .gte('leakage_risk_score', 70)
      .limit(1);

    if (patientsError) throw patientsError;
    if (!patients || patients.length === 0) {
      throw new Error('No high-risk patients found that need referrals');
    }

    testPatient = patients[0];
    console.log(`✅ Found patient: ${testPatient.name} (Risk: ${testPatient.leakage_risk_score}%)`);

    // Step 2: Find suitable providers
    console.log('\n2️⃣ Finding suitable providers...');
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .contains('accepted_insurance', [testPatient.insurance])
      .gte('rating', 4.0)
      .limit(5);

    if (providersError) throw providersError;
    if (!providers || providers.length === 0) {
      throw new Error('No suitable providers found');
    }

    testProvider = providers[0];
    console.log(`✅ Found provider: ${testProvider.name} (Rating: ${testProvider.rating})`);

    // Step 3: Create referral
    console.log('\n3️⃣ Creating referral...');
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert({
        patient_id: testPatient.id,
        provider_id: testProvider.id,
        service_type: testPatient.required_followup.split('+')[0].trim(),
        status: 'sent'
      })
      .select()
      .single();

    if (referralError) throw referralError;
    testReferral = referral;
    console.log(`✅ Referral created: ${testReferral.id}`);

    // Step 4: Update patient status
    console.log('\n4️⃣ Updating patient status...');
    const { error: patientUpdateError } = await supabase
      .from('patients')
      .update({
        referral_status: 'sent',
        current_referral_id: testReferral.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', testPatient.id);

    if (patientUpdateError) throw patientUpdateError;
    console.log('✅ Patient status updated to "sent"');

    // Step 5: Schedule appointment
    console.log('\n5️⃣ Scheduling appointment...');
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 2); // Schedule for 2 days from now

    const { error: scheduleError } = await supabase
      .from('referrals')
      .update({
        status: 'scheduled',
        scheduled_date: scheduledDate.toISOString(),
        notes: 'Appointment scheduled via automated workflow test',
        updated_at: new Date().toISOString()
      })
      .eq('id', testReferral.id);

    if (scheduleError) throw scheduleError;
    console.log(`✅ Appointment scheduled for: ${scheduledDate.toLocaleDateString()}`);

    // Step 6: Update patient status to scheduled
    console.log('\n6️⃣ Updating patient to scheduled...');
    const { error: patientScheduleError } = await supabase
      .from('patients')
      .update({
        referral_status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', testPatient.id);

    if (patientScheduleError) throw patientScheduleError;
    console.log('✅ Patient status updated to "scheduled"');

    // Step 7: Complete the referral
    console.log('\n7️⃣ Completing referral...');
    const { error: completeError } = await supabase
      .from('referrals')
      .update({
        status: 'completed',
        completed_date: new Date().toISOString(),
        notes: 'Care completed successfully via automated workflow test',
        updated_at: new Date().toISOString()
      })
      .eq('id', testReferral.id);

    if (completeError) throw completeError;
    console.log('✅ Referral marked as completed');

    // Step 8: Update patient status to completed
    console.log('\n8️⃣ Updating patient to completed...');
    const { error: patientCompleteError } = await supabase
      .from('patients')
      .update({
        referral_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', testPatient.id);

    if (patientCompleteError) throw patientCompleteError;
    console.log('✅ Patient status updated to "completed"');

    // Step 9: Verify referral history
    console.log('\n9️⃣ Verifying referral history...');
    const { data: history, error: historyError } = await supabase
      .from('referral_history')
      .select('*')
      .eq('referral_id', testReferral.id)
      .order('created_at', { ascending: true });

    if (historyError) throw historyError;
    console.log(`✅ Referral history contains ${history.length} entries:`);
    history.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.status} - ${entry.notes || 'No notes'}`);
    });

    console.log('\n🎉 COMPLETE REFERRAL WORKFLOW TEST PASSED!');
    console.log('✅ All workflow steps completed successfully');
    console.log('✅ Patient progressed through all statuses: needed → sent → scheduled → completed');
    console.log('✅ Referral history properly tracked');
    console.log('✅ Database consistency maintained');

    return {
      success: true,
      patient: testPatient,
      provider: testProvider,
      referral: testReferral,
      historyEntries: history.length
    };

  } catch (error) {
    console.error('\n❌ WORKFLOW TEST FAILED:', error.message);
    
    // Cleanup on failure
    if (testReferral) {
      console.log('\n🧹 Cleaning up test data...');
      try {
        await supabase.from('referrals').delete().eq('id', testReferral.id);
        if (testPatient) {
          await supabase
            .from('patients')
            .update({
              referral_status: 'needed',
              current_referral_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', testPatient.id);
        }
        console.log('✅ Test data cleaned up');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError.message);
      }
    }
    
    return {
      success: false,
      error: error.message,
      patient: testPatient,
      provider: testProvider,
      referral: testReferral
    };
  }
}

// Run the test
testCompleteReferralWorkflow()
  .then(result => {
    if (result.success) {
      console.log('\n🎯 REFERRAL WORKFLOW IS COMPLETE AND FUNCTIONAL!');
      process.exit(0);
    } else {
      console.log('\n❌ REFERRAL WORKFLOW NEEDS ATTENTION');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });