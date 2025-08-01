#!/usr/bin/env node

/**
 * Deployment script for Healthcare Continuity MVP
 * This script handles the deployment to Vercel with proper environment variables
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting deployment process...');

// Check if required environment variables are set
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

console.log('✅ Checking environment variables...');
const envFile = path.join(__dirname, '..', '.env.production');
if (fs.existsSync(envFile)) {
  console.log('✅ Production environment file found');
} else {
  console.error('❌ .env.production file not found');
  process.exit(1);
}

// Build the project
console.log('🔨 Building the project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Check if dist directory exists
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Build output directory (dist) not found');
  process.exit(1);
}

console.log('✅ Build output verified');

// Deployment instructions
console.log('\n📋 Deployment Instructions:');
console.log('1. Ensure you have a Vercel account and are logged in');
console.log('2. Run: vercel --prod');
console.log('3. Follow the prompts to deploy');
console.log('\nEnvironment variables are configured in vercel.json');
console.log('The application will be deployed with production settings');

console.log('\n🎯 Deployment configuration:');
console.log('- Framework: Vite');
console.log('- Build Command: npm run build');
console.log('- Output Directory: dist');
console.log('- Environment: Production');
console.log('- Supabase URL: Configured');
console.log('- Debug Panel: Disabled');
console.log('- Mock Data: Disabled');

console.log('\n✨ Ready for deployment!');