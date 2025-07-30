#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * Verifies that all required environment variables are properly configured
 */

const fs = require('fs');
const path = require('path');

// Required environment variables
const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

// Optional environment variables
const OPTIONAL_VARS = [
  'VITE_APP_NAME',
  'VITE_APP_VERSION',
  'VITE_ENABLE_DEBUG_PANEL',
  'VITE_ENABLE_MOCK_DATA',
  'VITE_ANALYTICS_ID',
  'VITE_SENTRY_DSN'
];

function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const vars = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          vars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return vars;
  } catch (error) {
    return null;
  }
}

function verifyEnvironment() {
  console.log('🔍 Verifying Environment Configuration...\n');
  
  // Check for environment files
  const envFiles = [
    '.env.example',
    '.env.development',
    '.env.production'
  ];
  
  console.log('📁 Environment Files:');
  envFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  });
  
  console.log('\n📋 Environment Variables Check:');
  
  // Check development environment
  console.log('\n🔧 Development Environment (.env.development):');
  const devVars = loadEnvFile('.env.development');
  if (devVars) {
    REQUIRED_VARS.forEach(varName => {
      const exists = varName in devVars && devVars[varName].trim() !== '';
      console.log(`  ${exists ? '✅' : '❌'} ${varName}`);
    });
  } else {
    console.log('  ❌ File not found or invalid');
  }
  
  // Check production environment
  console.log('\n🚀 Production Environment (.env.production):');
  const prodVars = loadEnvFile('.env.production');
  if (prodVars) {
    REQUIRED_VARS.forEach(varName => {
      const exists = varName in prodVars && prodVars[varName].trim() !== '';
      console.log(`  ${exists ? '✅' : '❌'} ${varName}`);
    });
  } else {
    console.log('  ❌ File not found or invalid');
  }
  
  // Check example file
  console.log('\n📝 Example Environment (.env.example):');
  const exampleVars = loadEnvFile('.env.example');
  if (exampleVars) {
    [...REQUIRED_VARS, ...OPTIONAL_VARS].forEach(varName => {
      const exists = varName in exampleVars;
      console.log(`  ${exists ? '✅' : '❌'} ${varName}`);
    });
  } else {
    console.log('  ❌ File not found or invalid');
  }
  
  console.log('\n🔒 Security Check:');
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const hasEnvIgnore = gitignore.includes('.env') && gitignore.includes('*.local');
  console.log(`  ${hasEnvIgnore ? '✅' : '❌'} Environment files in .gitignore`);
  
  console.log('\n✅ Environment verification complete!');
  console.log('\n📖 Next Steps:');
  console.log('  1. Copy .env.example to .env.local for local development');
  console.log('  2. Fill in actual values in .env.local');
  console.log('  3. Set environment variables in your deployment platform');
  console.log('  4. Test with: npm run build');
}

verifyEnvironment();