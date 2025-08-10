#!/usr/bin/env node

/**
 * Script to add the missing current_referral_id column to the patients table
 * This is needed to complete the referral workflow
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

// Load environment variables from .env.development
const envPath = join(__dirname, '..', '.env.development');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

process.env = { ...process.env, ...envVars };

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingColumn() {
  console.log('🔧 Adding missing current_referral_id column to patients table...');
  
  try {
    // First, check if the column already exists
    const { data: existingData, error: checkError } = await supabase
      .from('patients')
      .select('current_referral_id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Column current_referral_id already exists');
      return true;
    }
    
    // If we get here, the column doesn't exist, so we need to add it
    // Since we can't run DDL directly, we'll need to use the Supabase dashboard
    // or CLI to add this column
    
    console.log('❌ Column current_referral_id does not exist');
    console.log('');
    console.log('🔧 To fix this, you need to run the following SQL in your Supabase dashboard:');
    console.log('');
    console.log('ALTER TABLE patients ADD COLUMN current_referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL;');
    console.log('');
    console.log('Or run: supabase db push');
    console.log('');
    
    return false;
    
  } catch (error) {
    console.error('❌ Error checking column:', error);
    return false;
  }
}

async function updateExistingPatients() {
  console.log('🔄 Updating existing patients with their current referrals...');
  
  try {
    // Get all patients
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, referral_status');
    
    if (patientsError) {
      console.error('❌ Error fetching patients:', patientsError);
      return false;
    }
    
    console.log(`📋 Found ${patients.length} patients`);
    
    // For each patient with a referral status other than 'needed', 
    // find their most recent active referral
    let updatedCount = 0;
    
    for (const patient of patients) {
      if (patient.referral_status !== 'needed') {
        const { data: referrals, error: referralsError } = await supabase
          .from('referrals')
          .select('id, status')
          .eq('patient_id', patient.id)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!referralsError && referrals && referrals.length > 0) {
          const { error: updateError } = await supabase
            .from('patients')
            .update({ current_referral_id: referrals[0].id })
            .eq('id', patient.id);
          
          if (!updateError) {
            updatedCount++;
          }
        }
      }
    }
    
    console.log(`✅ Updated ${updatedCount} patients with current referral IDs`);
    return true;
    
  } catch (error) {
    console.error('❌ Error updating patients:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting referral workflow completion...');
  
  const columnExists = await addMissingColumn();
  
  if (columnExists) {
    await updateExistingPatients();
    console.log('✅ Referral workflow completion successful!');
  } else {
    console.log('❌ Please add the missing column first');
    process.exit(1);
  }
}

main().catch(console.error);