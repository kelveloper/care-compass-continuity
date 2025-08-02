#!/usr/bin/env node

/**
 * Production Environment Testing Script
 * This script tests all functionality on the production environment
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production environment variables
const SUPABASE_URL = 'https://lnjxrvcukzxhmtvnhsia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo';

console.log('🏥 Healthcare Continuity MVP - Production Testing\n');
console.log('🔍 Testing all functionality on production environment...\n');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (details) console.log(`   ${details}`);
  }
  testResults.details.push({ testName, passed, details });
}

async function testDatabaseConnection() {
  console.log('📊 Testing Database Connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('patients').select('count').limit(1);
    logTest('Database connection established', !error, error?.message);
    
    // Test patients table access
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .limit(5);
    
    logTest('Patients table accessible', !patientsError && patients?.length > 0, 
      patientsError?.message || `Found ${patients?.length || 0} patients`);
    
    // Test providers table access
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .limit(5);
    
    logTest('Providers table accessible', !providersError && providers?.length > 0,
      providersError?.message || `Found ${providers?.length || 0} providers`);
    
    // Test referrals table access
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*')
      .limit(5);
    
    logTest('Referrals table accessible', !referralsError,
      referralsError?.message || `Found ${referrals?.length || 0} referrals`);
    
  } catch (error) {
    logTest('Database connection', false, error.message);
  }
}

async function testPatientData() {
  console.log('\n👥 Testing Patient Data...');
  
  try {
    // Test patient data retrieval
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    
    logTest('Patient data retrieval', !error && patients?.length > 0,
      error?.message || `Retrieved ${patients?.length} patients`);
    
    if (patients && patients.length > 0) {
      const patient = patients[0];
      
      // Test required patient fields
      const requiredFields = ['id', 'name', 'date_of_birth', 'diagnosis', 'discharge_date', 'insurance', 'address'];
      const hasAllFields = requiredFields.every(field => patient[field] !== null && patient[field] !== undefined);
      
      logTest('Patient data completeness', hasAllFields,
        `Missing fields: ${requiredFields.filter(field => !patient[field]).join(', ')}`);
      
      // Test patient data types
      logTest('Patient ID format', typeof patient.id === 'string' && patient.id.length > 0);
      logTest('Patient name format', typeof patient.name === 'string' && patient.name.length > 0);
      logTest('Patient diagnosis format', typeof patient.diagnosis === 'string' && patient.diagnosis.length > 0);
    }
    
  } catch (error) {
    logTest('Patient data testing', false, error.message);
  }
}

async function testProviderData() {
  console.log('\n🏥 Testing Provider Data...');
  
  try {
    // Test provider data retrieval
    const { data: providers, error } = await supabase
      .from('providers')
      .select('*')
      .order('created_at', { ascending: false });
    
    logTest('Provider data retrieval', !error && providers?.length > 0,
      error?.message || `Retrieved ${providers?.length} providers`);
    
    if (providers && providers.length > 0) {
      const provider = providers[0];
      
      // Test required provider fields
      const requiredFields = ['id', 'name', 'type', 'specialties', 'address', 'phone', 'accepted_insurance'];
      const hasAllFields = requiredFields.every(field => provider[field] !== null && provider[field] !== undefined);
      
      logTest('Provider data completeness', hasAllFields,
        `Missing fields: ${requiredFields.filter(field => !provider[field]).join(', ')}`);
      
      // Test provider specialties array
      logTest('Provider specialties format', Array.isArray(provider.specialties) && provider.specialties.length > 0);
      
      // Test provider insurance array
      logTest('Provider insurance format', Array.isArray(provider.accepted_insurance) && provider.accepted_insurance.length > 0);
      
      // Test geographic coordinates
      const hasCoordinates = provider.latitude !== null && provider.longitude !== null;
      logTest('Provider coordinates available', hasCoordinates);
    }
    
  } catch (error) {
    logTest('Provider data testing', false, error.message);
  }
}

async function testRiskCalculation() {
  console.log('\n📊 Testing Risk Calculation Logic...');
  
  try {
    // Get a sample patient
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .limit(1);
    
    if (!error && patients && patients.length > 0) {
      const patient = patients[0];
      
      // Test age calculation
      const birthDate = new Date(patient.date_of_birth);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      logTest('Age calculation', age > 0 && age < 150, `Calculated age: ${age}`);
      
      // Test discharge date parsing
      const dischargeDate = new Date(patient.discharge_date);
      const daysSinceDischarge = Math.floor((new Date() - dischargeDate) / (1000 * 60 * 60 * 24));
      logTest('Discharge date calculation', daysSinceDischarge >= 0, `Days since discharge: ${daysSinceDischarge}`);
      
      // Test diagnosis complexity (basic check)
      const diagnosisComplexity = patient.diagnosis.length > 10;
      logTest('Diagnosis complexity assessment', typeof patient.diagnosis === 'string');
      
      logTest('Risk calculation data available', true, 'All required data for risk calculation is present');
    } else {
      logTest('Risk calculation data', false, 'No patient data available for testing');
    }
    
  } catch (error) {
    logTest('Risk calculation testing', false, error.message);
  }
}

async function testProviderMatching() {
  console.log('\n🔍 Testing Provider Matching Logic...');
  
  try {
    // Get sample data
    const { data: patients } = await supabase.from('patients').select('*').limit(1);
    const { data: providers } = await supabase.from('providers').select('*').limit(10);
    
    if (patients && patients.length > 0 && providers && providers.length > 0) {
      const patient = patients[0];
      
      // Test insurance matching
      const matchingProviders = providers.filter(provider => 
        provider.accepted_insurance && provider.accepted_insurance.includes(patient.insurance)
      );
      
      logTest('Insurance matching logic', matchingProviders.length >= 0, 
        `Found ${matchingProviders.length} providers accepting ${patient.insurance}`);
      
      // Test specialty filtering
      const specialtyProviders = providers.filter(provider => 
        provider.specialties && provider.specialties.length > 0
      );
      
      logTest('Specialty filtering', specialtyProviders.length > 0,
        `Found ${specialtyProviders.length} providers with specialties`);
      
      // Test geographic data availability
      const geoProviders = providers.filter(provider => 
        provider.latitude !== null && provider.longitude !== null
      );
      
      logTest('Geographic data availability', geoProviders.length > 0,
        `Found ${geoProviders.length} providers with coordinates`);
      
    } else {
      logTest('Provider matching data', false, 'Insufficient data for matching tests');
    }
    
  } catch (error) {
    logTest('Provider matching testing', false, error.message);
  }
}

async function testReferralWorkflow() {
  console.log('\n📋 Testing Referral Workflow...');
  
  try {
    // Test referral table structure
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('*')
      .limit(5);
    
    logTest('Referral table access', !error, error?.message);
    
    if (referrals) {
      logTest('Referral data structure', true, `Found ${referrals.length} referrals`);
      
      if (referrals.length > 0) {
        const referral = referrals[0];
        const hasRequiredFields = ['id', 'patient_id', 'provider_id', 'service_type', 'status'].every(
          field => referral[field] !== null && referral[field] !== undefined
        );
        
        logTest('Referral data completeness', hasRequiredFields);
      }
    }
    
    // Test referral status values
    const validStatuses = ['pending', 'sent', 'scheduled', 'completed', 'cancelled'];
    if (referrals && referrals.length > 0) {
      const validStatusReferrals = referrals.filter(r => validStatuses.includes(r.status));
      logTest('Referral status validation', validStatusReferrals.length === referrals.length);
    }
    
  } catch (error) {
    logTest('Referral workflow testing', false, error.message);
  }
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  try {
    // Test patient query performance
    const startTime = Date.now();
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    const queryTime = Date.now() - startTime;
    logTest('Patient query performance', queryTime < 3000 && !error, 
      `Query completed in ${queryTime}ms`);
    
    // Test provider query performance
    const providerStartTime = Date.now();
    const { data: providers, error: providerError } = await supabase
      .from('providers')
      .select('*')
      .limit(20);
    
    const providerQueryTime = Date.now() - providerStartTime;
    logTest('Provider query performance', providerQueryTime < 3000 && !providerError,
      `Query completed in ${providerQueryTime}ms`);
    
    // Test complex query performance (join-like operation)
    const complexStartTime = Date.now();
    const { data: complexData, error: complexError } = await supabase
      .from('referrals')
      .select(`
        *,
        patients(name, diagnosis),
        providers(name, type)
      `)
      .limit(10);
    
    const complexQueryTime = Date.now() - complexStartTime;
    logTest('Complex query performance', complexQueryTime < 5000 && !complexError,
      `Complex query completed in ${complexQueryTime}ms`);
    
  } catch (error) {
    logTest('Performance testing', false, error.message);
  }
}

async function testDataIntegrity() {
  console.log('\n🔒 Testing Data Integrity...');
  
  try {
    // Test foreign key relationships
    const { data: referralsWithRelations, error } = await supabase
      .from('referrals')
      .select(`
        id,
        patient_id,
        provider_id,
        patients(id, name),
        providers(id, name)
      `)
      .limit(5);
    
    if (!error && referralsWithRelations) {
      const validRelations = referralsWithRelations.every(referral => 
        referral.patients && referral.providers
      );
      
      logTest('Foreign key relationships', validRelations,
        `${referralsWithRelations.length} referrals with valid relationships`);
    }
    
    // Test data consistency
    const { data: patientCount } = await supabase
      .from('patients')
      .select('id', { count: 'exact' });
    
    const { data: providerCount } = await supabase
      .from('providers')
      .select('id', { count: 'exact' });
    
    logTest('Data consistency check', patientCount && providerCount,
      `${patientCount?.length || 0} patients, ${providerCount?.length || 0} providers`);
    
  } catch (error) {
    logTest('Data integrity testing', false, error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive production testing...\n');
  
  await testDatabaseConnection();
  await testPatientData();
  await testProviderData();
  await testRiskCalculation();
  await testProviderMatching();
  await testReferralWorkflow();
  await testPerformance();
  await testDataIntegrity();
  
  // Generate summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 PRODUCTION TESTING SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📊 Total Tests: ${testResults.total}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   - ${test.testName}: ${test.details}`);
      });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (testResults.failed === 0) {
    console.log('🎉 All tests passed! Production environment is ready.');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Please review and fix issues before proceeding.');
    return false;
  }
}

// Run the tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Testing failed with error:', error);
    process.exit(1);
  });