// Simple Node.js script to test Supabase connection
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test patients table
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, name, diagnosis, leakage_risk_score, leakage_risk_level')
      .limit(3);
    
    if (patientsError) {
      console.error('❌ Patients query failed:', patientsError);
      return;
    }
    
    console.log('✅ Patients data retrieved successfully!');
    console.log('📊 Sample patients:');
    patients?.forEach(patient => {
      console.log(`  • ${patient.name} - ${patient.diagnosis} (Risk: ${patient.leakage_risk_score}%)`);
    });
    
    // Test providers table
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('id, name, type, rating')
      .limit(3);
    
    if (providersError) {
      console.error('❌ Providers query failed:', providersError);
      return;
    }
    
    console.log('\n✅ Providers data retrieved successfully!');
    console.log('🏥 Sample providers:');
    providers?.forEach(provider => {
      console.log(`  • ${provider.name} - ${provider.type} (Rating: ${provider.rating}/5)`);
    });
    
    // Get total counts
    const { count: patientCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });
    
    const { count: providerCount } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true });
    
    console.log('\n📈 Database Summary:');
    console.log(`  • Total Patients: ${patientCount}`);
    console.log(`  • Total Providers: ${providerCount}`);
    console.log('\n🎉 Supabase connection is working perfectly!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testConnection();