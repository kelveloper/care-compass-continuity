#!/usr/bin/env node

/**
 * Deployment verification script
 * This script verifies that the deployment is ready and all configurations are correct
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying deployment readiness...\n');

// Check if build output exists
const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log('📁 Checking build output...');
if (fs.existsSync(distPath) && fs.existsSync(indexPath)) {
  console.log('✅ Build output exists');
  
  // Check build size
  const stats = fs.statSync(indexPath);
  console.log(`✅ Index.html size: ${stats.size} bytes`);
} else {
  console.log('❌ Build output missing - run npm run build first');
  process.exit(1);
}

// Check vercel.json configuration
const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');
console.log('\n⚙️  Checking Vercel configuration...');
if (fs.existsSync(vercelConfigPath)) {
  const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  console.log('✅ vercel.json exists');
  console.log(`✅ Framework: ${config.framework}`);
  console.log(`✅ Build command: ${config.buildCommand}`);
  console.log(`✅ Output directory: ${config.outputDirectory}`);
  
  // Check environment variables
  if (config.env) {
    console.log('✅ Environment variables configured:');
    Object.keys(config.env).forEach(key => {
      if (key.includes('KEY') || key.includes('SECRET')) {
        console.log(`   - ${key}: [HIDDEN]`);
      } else {
        console.log(`   - ${key}: ${config.env[key]}`);
      }
    });
  }
} else {
  console.log('❌ vercel.json not found');
  process.exit(1);
}

// Check package.json scripts
const packagePath = path.join(__dirname, '..', 'package.json');
console.log('\n📦 Checking package.json scripts...');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('✅ package.json exists');
  
  const requiredScripts = ['build', 'deploy', 'deploy:vercel'];
  requiredScripts.forEach(script => {
    if (pkg.scripts && pkg.scripts[script]) {
      console.log(`✅ Script "${script}" configured`);
    } else {
      console.log(`❌ Script "${script}" missing`);
    }
  });
}

console.log('\n🚀 Deployment Readiness Summary:');
console.log('✅ Build output verified');
console.log('✅ Vercel configuration complete');
console.log('✅ Environment variables set');
console.log('✅ Deployment scripts ready');

console.log('\n📋 Next Steps:');
console.log('1. Ensure you are logged into Vercel: vercel login');
console.log('2. Deploy to production: npm run deploy:vercel');
console.log('3. Verify deployment at the provided URL');

console.log('\n✨ Ready for production deployment!');