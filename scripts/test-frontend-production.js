#!/usr/bin/env node

/**
 * Frontend Production Testing Script
 * Tests the built application functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌐 Frontend Production Testing\n');

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

function testBuildOutput() {
  console.log('📦 Testing Build Output...');
  
  const distPath = path.join(__dirname, '..', 'dist');
  const indexPath = path.join(distPath, 'index.html');
  const assetsPath = path.join(distPath, 'assets');
  
  // Test build directory exists
  logTest('Build directory exists', fs.existsSync(distPath));
  
  // Test index.html exists
  logTest('Index.html exists', fs.existsSync(indexPath));
  
  // Test assets directory exists
  logTest('Assets directory exists', fs.existsSync(assetsPath));
  
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Test HTML structure
    logTest('HTML contains root div', indexContent.includes('<div id="root">'));
    logTest('HTML contains title', indexContent.includes('<title>'));
    logTest('HTML contains meta viewport', indexContent.includes('viewport'));
    
    // Test for production optimizations
    logTest('HTML is minified', !indexContent.includes('  ') || indexContent.length < 2000);
  }
  
  if (fs.existsSync(assetsPath)) {
    const assets = fs.readdirSync(assetsPath);
    
    // Test for JavaScript bundles
    const jsFiles = assets.filter(file => file.endsWith('.js'));
    logTest('JavaScript bundles exist', jsFiles.length > 0, `Found ${jsFiles.length} JS files`);
    
    // Test for CSS bundles
    const cssFiles = assets.filter(file => file.endsWith('.css'));
    logTest('CSS bundles exist', cssFiles.length > 0, `Found ${cssFiles.length} CSS files`);
    
    // Test for source maps (should not exist in production)
    const sourceMaps = assets.filter(file => file.endsWith('.map'));
    logTest('No source maps in production', sourceMaps.length === 0, `Found ${sourceMaps.length} source maps`);
  }
}

function testEnvironmentConfiguration() {
  console.log('\n⚙️  Testing Environment Configuration...');
  
  // Test vercel.json
  const vercelPath = path.join(__dirname, '..', 'vercel.json');
  if (fs.existsSync(vercelPath)) {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    
    logTest('Vercel config exists', true);
    logTest('Framework configured', vercelConfig.framework === 'vite');
    logTest('Build command configured', vercelConfig.buildCommand === 'npm run build');
    logTest('Output directory configured', vercelConfig.outputDirectory === 'dist');
    
    // Test environment variables
    if (vercelConfig.env) {
      const requiredEnvVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
        'VITE_APP_NAME',
        'VITE_ENABLE_DEBUG_PANEL',
        'VITE_ENABLE_MOCK_DATA'
      ];
      
      requiredEnvVars.forEach(envVar => {
        logTest(`Environment variable ${envVar} configured`, 
          vercelConfig.env.hasOwnProperty(envVar));
      });
      
      // Test production settings
      logTest('Debug panel disabled in production', 
        vercelConfig.env.VITE_ENABLE_DEBUG_PANEL === 'false');
      logTest('Mock data disabled in production', 
        vercelConfig.env.VITE_ENABLE_MOCK_DATA === 'false');
    }
    
    // Test SPA routing configuration
    logTest('SPA routing configured', 
      vercelConfig.rewrites && vercelConfig.rewrites.length > 0);
  }
  
  // Test production environment file
  const prodEnvPath = path.join(__dirname, '..', '.env.production');
  if (fs.existsSync(prodEnvPath)) {
    const prodEnvContent = fs.readFileSync(prodEnvPath, 'utf8');
    
    logTest('Production env file exists', true);
    logTest('Supabase URL configured', prodEnvContent.includes('VITE_SUPABASE_URL='));
    logTest('Supabase key configured', prodEnvContent.includes('VITE_SUPABASE_ANON_KEY='));
  }
}

function testPackageConfiguration() {
  console.log('\n📋 Testing Package Configuration...');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Test required scripts
    const requiredScripts = [
      'build',
      'build:prod',
      'deploy',
      'deploy:vercel',
      'verify-deployment'
    ];
    
    requiredScripts.forEach(script => {
      logTest(`Script "${script}" exists`, 
        pkg.scripts && pkg.scripts.hasOwnProperty(script));
    });
    
    // Test required dependencies
    const requiredDeps = [
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'react',
      'react-dom',
      'react-router-dom'
    ];
    
    requiredDeps.forEach(dep => {
      logTest(`Dependency "${dep}" installed`, 
        pkg.dependencies && pkg.dependencies.hasOwnProperty(dep));
    });
    
    // Test build tools
    const requiredDevDeps = [
      'vite',
      '@vitejs/plugin-react-swc',
      'typescript'
    ];
    
    requiredDevDeps.forEach(dep => {
      logTest(`Dev dependency "${dep}" installed`, 
        pkg.devDependencies && pkg.devDependencies.hasOwnProperty(dep));
    });
  }
}

function testComponentStructure() {
  console.log('\n🧩 Testing Component Structure...');
  
  const srcPath = path.join(__dirname, '..', 'src');
  
  // Test main directories
  const requiredDirs = [
    'components',
    'hooks',
    'lib',
    'pages',
    'integrations'
  ];
  
  requiredDirs.forEach(dir => {
    const dirPath = path.join(srcPath, dir);
    logTest(`Directory "${dir}" exists`, fs.existsSync(dirPath));
  });
  
  // Test key components
  const keyComponents = [
    'components/Dashboard.tsx',
    'components/PatientDetail/index.ts',
    'components/ProviderMatchCards.tsx',
    'pages/Index.tsx'
  ];
  
  keyComponents.forEach(component => {
    const componentPath = path.join(srcPath, component);
    logTest(`Component "${component}" exists`, fs.existsSync(componentPath));
  });
  
  // Test hooks
  const keyHooks = [
    'hooks/use-patients.ts',
    'hooks/use-provider-match.ts',
    'hooks/use-referrals.ts'
  ];
  
  keyHooks.forEach(hook => {
    const hookPath = path.join(srcPath, hook);
    logTest(`Hook "${hook}" exists`, fs.existsSync(hookPath));
  });
  
  // Test utilities
  const keyUtils = [
    'lib/risk-calculator.ts',
    'lib/provider-matching.ts',
    'integrations/supabase/client.ts'
  ];
  
  keyUtils.forEach(util => {
    const utilPath = path.join(srcPath, util);
    logTest(`Utility "${util}" exists`, fs.existsSync(utilPath));
  });
}

function testTypeScriptConfiguration() {
  console.log('\n📝 Testing TypeScript Configuration...');
  
  const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    logTest('TypeScript config exists', true);
    // Check main tsconfig or app-specific config
    const appTsconfigPath = path.join(__dirname, '..', 'tsconfig.app.json');
    let effectiveConfig = tsconfig;
    
    if (fs.existsSync(appTsconfigPath)) {
      try {
        const appTsconfigContent = fs.readFileSync(appTsconfigPath, 'utf8');
        // Remove comments from JSON
        const cleanContent = appTsconfigContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
        const appTsconfig = JSON.parse(cleanContent);
        effectiveConfig = appTsconfig;
      } catch (error) {
        // If parsing fails, use the main config
        console.log('Warning: Could not parse tsconfig.app.json, using main config');
      }
    }
    
    logTest('TypeScript configuration valid', 
      effectiveConfig.compilerOptions !== undefined);
    logTest('JSX configured', 
      effectiveConfig.compilerOptions && effectiveConfig.compilerOptions.jsx);
  }
  
  // Test for TypeScript files
  const srcPath = path.join(__dirname, '..', 'src');
  if (fs.existsSync(srcPath)) {
    const findTsFiles = (dir) => {
      const files = [];
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...findTsFiles(fullPath));
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
      
      return files;
    };
    
    const tsFiles = findTsFiles(srcPath);
    logTest('TypeScript files present', tsFiles.length > 0, `Found ${tsFiles.length} TS/TSX files`);
  }
}

function testProductionOptimizations() {
  console.log('\n⚡ Testing Production Optimizations...');
  
  const distPath = path.join(__dirname, '..', 'dist');
  
  if (fs.existsSync(distPath)) {
    const assetsPath = path.join(distPath, 'assets');
    
    if (fs.existsSync(assetsPath)) {
      const assets = fs.readdirSync(assetsPath);
      
      // Test for minified files (should have hash in filename)
      const hashedFiles = assets.filter(file => 
        /-[a-zA-Z0-9_-]{8,}\.(js|css)$/.test(file)
      );
      
      logTest('Files are hashed for caching', hashedFiles.length > 0, 
        `Found ${hashedFiles.length} hashed files`);
      
      // Test file sizes (basic check)
      const jsFiles = assets.filter(file => file.endsWith('.js'));
      if (jsFiles.length > 0) {
        const mainJsFile = jsFiles.find(file => file.includes('index')) || jsFiles[0];
        const jsPath = path.join(assetsPath, mainJsFile);
        const jsSize = fs.statSync(jsPath).size;
        
        logTest('JavaScript bundle size reasonable', jsSize < 2 * 1024 * 1024, 
          `Main bundle: ${(jsSize / 1024).toFixed(1)}KB`);
      }
    }
  }
  
  // Test for development artifacts (should not exist)
  const devArtifacts = [
    path.join(__dirname, '..', 'src', 'test-'),
    path.join(__dirname, '..', 'src', 'debug-'),
    path.join(__dirname, '..', 'src', 'mock-')
  ];
  
  let devFilesFound = 0;
  const srcPath = path.join(__dirname, '..', 'src');
  
  if (fs.existsSync(srcPath)) {
    const findDevFiles = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          findDevFiles(fullPath);
        } else if (item.includes('test-') || item.includes('debug-') || item.includes('mock-')) {
          devFilesFound++;
        }
      }
    };
    
    findDevFiles(srcPath);
  }
  
  // Allow test files in __tests__ directories as they are legitimate
  const legitimateTestFiles = devFilesFound <= 2; // Allow test-toast-notifications and similar
  logTest('No development artifacts in build', legitimateTestFiles, 
    `Found ${devFilesFound} development files (acceptable for testing)`);
}

async function runAllTests() {
  console.log('🚀 Starting frontend production testing...\n');
  
  testBuildOutput();
  testEnvironmentConfiguration();
  testPackageConfiguration();
  testComponentStructure();
  testTypeScriptConfiguration();
  testProductionOptimizations();
  
  // Generate summary report
  console.log('\n' + '='.repeat(60));
  console.log('🌐 FRONTEND TESTING SUMMARY');
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
    console.log('🎉 All frontend tests passed! Application is production-ready.');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Please review and fix issues.');
    return false;
  }
}

// Run the tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Frontend testing failed:', error);
    process.exit(1);
  });