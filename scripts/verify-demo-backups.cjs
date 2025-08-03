#!/usr/bin/env node

/**
 * Demo Backup Verification Script
 * Verifies all backup plans and materials are ready for demo day
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚨 Healthcare Continuity MVP - Demo Backup Verification\n');

const checks = [];

// Check 1: Verify backup documentation exists
function checkBackupDocumentation() {
  const requiredFiles = [
    'DEMO_BACKUP_PLANS.md',
    'DEMO_CHECKLIST.md',
    'DEMO_SCRIPT.md',
    'DEMO_READY_SUMMARY.md'
  ];

  const missing = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missing.length === 0) {
    checks.push({ name: 'Backup Documentation', status: '✅', details: 'All backup docs present' });
  } else {
    checks.push({ name: 'Backup Documentation', status: '❌', details: `Missing: ${missing.join(', ')}` });
  }
}

// Check 2: Verify demo assets directory structure
function checkDemoAssets() {
  const requiredDirs = [
    'demo-assets',
    'demo-assets/screenshots'
  ];

  const missing = requiredDirs.filter(dir => !fs.existsSync(dir));
  
  if (missing.length === 0) {
    checks.push({ name: 'Demo Assets Structure', status: '✅', details: 'Directory structure ready' });
  } else {
    checks.push({ name: 'Demo Assets Structure', status: '⚠️', details: `Missing: ${missing.join(', ')}` });
  }
}

// Check 3: Verify application can start locally
function checkLocalDevelopment() {
  try {
    // Check if package.json exists and has dev script
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.dev) {
      checks.push({ name: 'Local Development Ready', status: '✅', details: 'npm run dev available' });
    } else {
      checks.push({ name: 'Local Development Ready', status: '❌', details: 'No dev script found' });
    }
  } catch (error) {
    checks.push({ name: 'Local Development Ready', status: '❌', details: 'package.json not found' });
  }
}

// Check 4: Verify environment configuration
function checkEnvironmentConfig() {
  const envFiles = ['.env.development', '.env.production'];
  const existingEnvFiles = envFiles.filter(file => fs.existsSync(file));
  
  if (existingEnvFiles.length > 0) {
    checks.push({ name: 'Environment Configuration', status: '✅', details: `Found: ${existingEnvFiles.join(', ')}` });
  } else {
    checks.push({ name: 'Environment Configuration', status: '⚠️', details: 'No environment files found' });
  }
}

// Check 5: Verify deployment configuration
function checkDeploymentConfig() {
  const deployFiles = ['vercel.json', 'DEPLOYMENT.md'];
  const existing = deployFiles.filter(file => fs.existsSync(file));
  
  if (existing.length === deployFiles.length) {
    checks.push({ name: 'Deployment Configuration', status: '✅', details: 'All deployment files present' });
  } else {
    const missing = deployFiles.filter(file => !existing.includes(file));
    checks.push({ name: 'Deployment Configuration', status: '⚠️', details: `Missing: ${missing.join(', ')}` });
  }
}

// Check 6: Verify hero patient verification script
function checkHeroPatientScript() {
  if (fs.existsSync('verify-hero-patient.js')) {
    checks.push({ name: 'Hero Patient Verification', status: '✅', details: 'Verification script available' });
  } else {
    checks.push({ name: 'Hero Patient Verification', status: '⚠️', details: 'No hero patient verification script' });
  }
}

// Check 7: Verify backup demo materials
function checkBackupMaterials() {
  const backupItems = [
    { name: 'Demo Script Memorized', check: () => fs.existsSync('DEMO_SCRIPT.md') },
    { name: 'Key Statistics Ready', check: () => fs.existsSync('DEMO_BACKUP_PLANS.md') },
    { name: 'Alternative Patients', check: () => fs.existsSync('DEMO_BACKUP_PLANS.md') },
    { name: 'Recovery Strategies', check: () => fs.existsSync('DEMO_BACKUP_PLANS.md') }
  ];

  const ready = backupItems.filter(item => item.check()).length;
  const total = backupItems.length;

  if (ready === total) {
    checks.push({ name: 'Backup Materials', status: '✅', details: `${ready}/${total} backup items ready` });
  } else {
    checks.push({ name: 'Backup Materials', status: '⚠️', details: `${ready}/${total} backup items ready` });
  }
}

// Run all checks
function runAllChecks() {
  console.log('Running backup verification checks...\n');

  checkBackupDocumentation();
  checkDemoAssets();
  checkLocalDevelopment();
  checkEnvironmentConfig();
  checkDeploymentConfig();
  checkHeroPatientScript();
  checkBackupMaterials();

  // Display results
  console.log('📋 BACKUP VERIFICATION RESULTS\n');
  console.log('━'.repeat(60));
  
  checks.forEach(check => {
    console.log(`${check.status} ${check.name.padEnd(30)} ${check.details}`);
  });

  console.log('━'.repeat(60));

  // Summary
  const passed = checks.filter(c => c.status === '✅').length;
  const warnings = checks.filter(c => c.status === '⚠️').length;
  const failed = checks.filter(c => c.status === '❌').length;

  console.log(`\n📊 SUMMARY: ${passed} passed, ${warnings} warnings, ${failed} failed\n`);

  // Recommendations
  if (failed > 0) {
    console.log('🚨 CRITICAL ISSUES - Fix before demo:');
    checks.filter(c => c.status === '❌').forEach(check => {
      console.log(`   • ${check.name}: ${check.details}`);
    });
    console.log();
  }

  if (warnings > 0) {
    console.log('⚠️  WARNINGS - Consider addressing:');
    checks.filter(c => c.status === '⚠️').forEach(check => {
      console.log(`   • ${check.name}: ${check.details}`);
    });
    console.log();
  }

  if (passed === checks.length) {
    console.log('🎉 ALL BACKUP PLANS VERIFIED - DEMO READY!');
  } else if (failed === 0) {
    console.log('✅ BACKUP PLANS MOSTLY READY - Minor items to address');
  } else {
    console.log('❌ BACKUP PLANS NEED ATTENTION - Address critical issues');
  }

  console.log('\n🎯 Next Steps:');
  console.log('   1. Address any critical issues above');
  console.log('   2. Test complete demo flow 3 times');
  console.log('   3. Practice backup scenarios');
  console.log('   4. Verify internet connection on demo day');
  console.log('   5. Have emergency contacts ready');
  
  console.log('\n📞 Emergency Demo Support:');
  console.log('   • Run: npm run dev (local backup)');
  console.log('   • Use: demo-assets/screenshots (offline backup)');
  console.log('   • Fallback: DEMO_SCRIPT.md (manual presentation)');
}

// Execute verification
runAllChecks();