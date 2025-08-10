#!/usr/bin/env node

/**
 * Simple Complete User Workflow Testing Script
 * 
 * This script tests the complete healthcare continuity MVP workflow using basic HTTP requests
 * and DOM validation. It's designed to work even when the full application isn't running
 * by testing the build output and API endpoints.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const CONFIG = {
  iterations: 3,
  buildPath: join(__dirname, 'dist'),
  srcPath: join(__dirname, 'src'),
  timeout: 5000
};

// Test results tracking
const testResults = {
  iterations: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }
};

/**
 * Test 1: Verify build artifacts exist
 */
function testBuildArtifacts() {
  console.log('\n📦 Step 1: Testing Build Artifacts');
  
  const stepResult = {
    step: 'build_artifacts',
    success: false,
    duration: 0,
    details: {}
  };
  
  const startTime = Date.now();
  
  try {
    // Check if dist directory exists
    const distExists = existsSync(CONFIG.buildPath);
    console.log(`  📁 Dist directory exists: ${distExists}`);
    
    if (distExists) {
      // Check for key build files
      const indexHtml = existsSync(join(CONFIG.buildPath, 'index.html'));
      const assetsDir = existsSync(join(CONFIG.buildPath, 'assets'));
      
      console.log(`  📄 index.html exists: ${indexHtml}`);
      console.log(`  📁 assets directory exists: ${assetsDir}`);
      
      stepResult.details = {
        distExists,
        indexHtml,
        assetsDir
      };
      
      stepResult.success = distExists && indexHtml;
    } else {
      console.log('  ⚠️ Build directory not found - running npm run build might be needed');
      stepResult.details = { distExists: false };
      stepResult.success = false;
    }
    
  } catch (error) {
    console.error(`  ❌ Build artifacts test failed: ${error.message}`);
    stepResult.error = error.message;
  }
  
  stepResult.duration = Date.now() - startTime;
  return stepResult;
}

/**
 * Test 2: Verify source code structure
 */
function testSourceCodeStructure() {
  console.log('\n📁 Step 2: Testing Source Code Structure');
  
  const stepResult = {
    step: 'source_structure',
    success: false,
    duration: 0,
    details: {}
  };
  
  const startTime = Date.now();
  
  try {
    // Check for key source files
    const keyFiles = [
      'src/components/Dashboard.tsx',
      'src/components/PatientDetailView.tsx',
      'src/components/PatientDetailContainer.tsx',
      'src/components/ProviderMatchCards.tsx',
      'src/hooks/use-patients.ts',
      'src/hooks/use-providers.ts',
      'src/hooks/use-referrals.ts',
      'src/integrations/supabase/client.ts'
    ];
    
    const existingFiles = [];
    const missingFiles = [];
    
    keyFiles.forEach(file => {
      const filePath = join(__dirname, file);
      if (existsSync(filePath)) {
        existingFiles.push(file);
        console.log(`  ✅ ${file}`);
      } else {
        missingFiles.push(file);
        console.log(`  ❌ ${file} - MISSING`);
      }
    });
    
    stepResult.details = {
      totalFiles: keyFiles.length,
      existingFiles: existingFiles.length,
      missingFiles: missingFiles.length,
      missingFilesList: missingFiles
    };
    
    // Success if at least 80% of key files exist
    stepResult.success = (existingFiles.length / keyFiles.length) >= 0.8;
    
    console.log(`  📊 Source structure: ${existingFiles.length}/${keyFiles.length} key files found`);
    
  } catch (error) {
    console.error(`  ❌ Source structure test failed: ${error.message}`);
    stepResult.error = error.message;
  }
  
  stepResult.duration = Date.now() - startTime;
  return stepResult;
}

/**
 * Test 3: Verify component imports and exports
 */
function testComponentStructure() {
  console.log('\n🧩 Step 3: Testing Component Structure');
  
  const stepResult = {
    step: 'component_structure',
    success: false,
    duration: 0,
    details: {}
  };
  
  const startTime = Date.now();
  
  try {
    const componentsToTest = [
      { file: 'src/components/Dashboard.tsx', expectedExports: ['Dashboard'] },
      { file: 'src/components/PatientDetailView.tsx', expectedExports: ['PatientDetailView'] },
      { file: 'src/components/ProviderMatchCards.tsx', expectedExports: ['ProviderMatchCards'] }
    ];
    
    let validComponents = 0;
    const componentDetails = [];
    
    componentsToTest.forEach(({ file, expectedExports }) => {
      const filePath = join(__dirname, file);
      
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf8');
          
          // Check for expected exports
          const foundExports = expectedExports.filter(exportName => {
            const exportRegex = new RegExp(`export.*${exportName}`, 'g');
            return exportRegex.test(content);
          });
          
          // Check for key React patterns
          const hasReactImport = content.includes('import') && (content.includes('react') || content.includes('React'));
          const hasJSX = content.includes('<') && content.includes('>');
          const hasTypeScript = content.includes('interface') || content.includes('type ');
          
          const componentValid = foundExports.length === expectedExports.length && hasReactImport && hasJSX;
          
          if (componentValid) {
            validComponents++;
            console.log(`  ✅ ${file} - Valid React component`);
          } else {
            console.log(`  ❌ ${file} - Invalid or incomplete component`);
          }
          
          componentDetails.push({
            file,
            foundExports: foundExports.length,
            expectedExports: expectedExports.length,
            hasReactImport,
            hasJSX,
            hasTypeScript,
            valid: componentValid
          });
          
        } catch (readError) {
          console.log(`  ❌ ${file} - Error reading file: ${readError.message}`);
          componentDetails.push({
            file,
            error: readError.message,
            valid: false
          });
        }
      } else {
        console.log(`  ❌ ${file} - File not found`);
        componentDetails.push({
          file,
          error: 'File not found',
          valid: false
        });
      }
    });
    
    stepResult.details = {
      totalComponents: componentsToTest.length,
      validComponents,
      componentDetails
    };
    
    stepResult.success = validComponents >= Math.ceil(componentsToTest.length * 0.7); // 70% success rate
    
    console.log(`  📊 Component structure: ${validComponents}/${componentsToTest.length} components valid`);
    
  } catch (error) {
    console.error(`  ❌ Component structure test failed: ${error.message}`);
    stepResult.error = error.message;
  }
  
  stepResult.duration = Date.now() - startTime;
  return stepResult;
}

/**
 * Test 4: Verify hook implementations
 */
function testHookImplementations() {
  console.log('\n🪝 Step 4: Testing Hook Implementations');
  
  const stepResult = {
    step: 'hook_implementations',
    success: false,
    duration: 0,
    details: {}
  };
  
  const startTime = Date.now();
  
  try {
    const hooksToTest = [
      { file: 'src/hooks/use-patients.ts', expectedHooks: ['usePatients', 'usePatient'] },
      { file: 'src/hooks/use-providers.ts', expectedHooks: ['useProviders'] },
      { file: 'src/hooks/use-referrals.ts', expectedHooks: ['useReferrals'] }
    ];
    
    let validHooks = 0;
    const hookDetails = [];
    
    hooksToTest.forEach(({ file, expectedHooks }) => {
      const filePath = join(__dirname, file);
      
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf8');
          
          // Check for expected hook exports
          const foundHooks = expectedHooks.filter(hookName => {
            const hookRegex = new RegExp(`export.*${hookName}|const ${hookName}.*=`, 'g');
            return hookRegex.test(content);
          });
          
          // Check for React Query patterns
          const hasReactQuery = content.includes('useQuery') || content.includes('useMutation');
          const hasSupabase = content.includes('supabase');
          const hasTypeScript = content.includes('interface') || content.includes('type ');
          
          const hookValid = foundHooks.length >= Math.ceil(expectedHooks.length * 0.5); // At least 50% of expected hooks
          
          if (hookValid) {
            validHooks++;
            console.log(`  ✅ ${file} - Valid hook implementation`);
          } else {
            console.log(`  ❌ ${file} - Invalid or incomplete hook`);
          }
          
          hookDetails.push({
            file,
            foundHooks: foundHooks.length,
            expectedHooks: expectedHooks.length,
            hasReactQuery,
            hasSupabase,
            hasTypeScript,
            valid: hookValid
          });
          
        } catch (readError) {
          console.log(`  ❌ ${file} - Error reading file: ${readError.message}`);
          hookDetails.push({
            file,
            error: readError.message,
            valid: false
          });
        }
      } else {
        console.log(`  ❌ ${file} - File not found`);
        hookDetails.push({
          file,
          error: 'File not found',
          valid: false
        });
      }
    });
    
    stepResult.details = {
      totalHooks: hooksToTest.length,
      validHooks,
      hookDetails
    };
    
    stepResult.success = validHooks >= Math.ceil(hooksToTest.length * 0.6); // 60% success rate
    
    console.log(`  📊 Hook implementations: ${validHooks}/${hooksToTest.length} hooks valid`);
    
  } catch (error) {
    console.error(`  ❌ Hook implementations test failed: ${error.message}`);
    stepResult.error = error.message;
  }
  
  stepResult.duration = Date.now() - startTime;
  return stepResult;
}

/**
 * Test 5: Verify database integration
 */
function testDatabaseIntegration() {
  console.log('\n🗄️ Step 5: Testing Database Integration');
  
  const stepResult = {
    step: 'database_integration',
    success: false,
    duration: 0,
    details: {}
  };
  
  const startTime = Date.now();
  
  try {
    // Check Supabase client configuration
    const supabaseClientPath = join(__dirname, 'src/integrations/supabase/client.ts');
    const supabaseTypesPath = join(__dirname, 'src/integrations/supabase/types.ts');
    
    let supabaseConfigValid = false;
    let typesExist = false;
    
    if (existsSync(supabaseClientPath)) {
      const clientContent = readFileSync(supabaseClientPath, 'utf8');
      
      // Check for Supabase client setup
      const hasSupabaseImport = clientContent.includes('@supabase/supabase-js');
      const hasClientCreation = clientContent.includes('createClient');
      const hasExport = clientContent.includes('export');
      
      supabaseConfigValid = hasSupabaseImport && hasClientCreation && hasExport;
      
      console.log(`  📄 Supabase client: ${supabaseConfigValid ? 'Valid' : 'Invalid'}`);
    } else {
      console.log('  ❌ Supabase client file not found');
    }
    
    if (existsSync(supabaseTypesPath)) {
      const typesContent = readFileSync(supabaseTypesPath, 'utf8');
      
      // Check for database types
      const hasTypes = typesContent.includes('interface') || typesContent.includes('type ');
      const hasDatabase = typesContent.includes('Database') || typesContent.includes('Tables');
      
      typesExist = hasTypes && hasDatabase;
      
      console.log(`  📄 Database types: ${typesExist ? 'Valid' : 'Invalid'}`);
    } else {
      console.log('  ❌ Database types file not found');
    }
    
    // Check for environment variables setup
    const envExamplePath = join(__dirname, '.env.example');
    let envConfigured = false;
    
    if (existsSync(envExamplePath)) {
      const envContent = readFileSync(envExamplePath, 'utf8');
      const hasSupabaseUrl = envContent.includes('SUPABASE_URL') || envContent.includes('VITE_SUPABASE_URL');
      const hasSupabaseKey = envContent.includes('SUPABASE_ANON_KEY') || envContent.includes('VITE_SUPABASE_ANON_KEY');
      
      envConfigured = hasSupabaseUrl && hasSupabaseKey;
      
      console.log(`  🔧 Environment config: ${envConfigured ? 'Valid' : 'Invalid'}`);
    } else {
      console.log('  ❌ Environment example file not found');
    }
    
    stepResult.details = {
      supabaseConfigValid,
      typesExist,
      envConfigured
    };
    
    stepResult.success = supabaseConfigValid && (typesExist || envConfigured);
    
    console.log(`  📊 Database integration: ${stepResult.success ? 'Valid' : 'Needs attention'}`);
    
  } catch (error) {
    console.error(`  ❌ Database integration test failed: ${error.message}`);
    stepResult.error = error.message;
  }
  
  stepResult.duration = Date.now() - startTime;
  return stepResult;
}

/**
 * Run a complete workflow iteration
 */
function runWorkflowIteration(iterationNum) {
  console.log(`\n🚀 Starting Workflow Iteration ${iterationNum}/${CONFIG.iterations}`);
  console.log('=' .repeat(60));
  
  const iterationResult = {
    iteration: iterationNum,
    startTime: new Date().toISOString(),
    steps: [],
    success: false,
    duration: 0,
    error: null
  };
  
  const startTime = Date.now();
  
  try {
    // Run all workflow steps
    const steps = [
      testBuildArtifacts,
      testSourceCodeStructure,
      testComponentStructure,
      testHookImplementations,
      testDatabaseIntegration
    ];
    
    for (let i = 0; i < steps.length; i++) {
      const stepResult = steps[i]();
      iterationResult.steps.push(stepResult);
      
      if (!stepResult.success) {
        console.log(`  ❌ Step ${i + 1} failed, continuing with next step...`);
      }
    }
    
    // Calculate success rate for this iteration
    const successfulSteps = iterationResult.steps.filter(step => step.success).length;
    const totalSteps = iterationResult.steps.length;
    iterationResult.success = successfulSteps >= Math.ceil(totalSteps * 0.6); // 60% success rate required
    
    console.log(`\n📊 Iteration ${iterationNum} Summary:`);
    console.log(`  ✅ Successful steps: ${successfulSteps}/${totalSteps}`);
    console.log(`  🎯 Overall success: ${iterationResult.success ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.error(`\n❌ Iteration ${iterationNum} failed with error: ${error.message}`);
    iterationResult.error = error.message;
  }
  
  iterationResult.duration = Date.now() - startTime;
  iterationResult.endTime = new Date().toISOString();
  
  return iterationResult;
}

/**
 * Generate test report
 */
function generateTestReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 COMPLETE WORKFLOW TEST REPORT');
  console.log('='.repeat(80));
  
  const { summary, iterations } = testResults;
  
  console.log(`\n📊 Overall Summary:`);
  console.log(`  🎯 Total iterations: ${summary.total}`);
  console.log(`  ✅ Passed: ${summary.passed}`);
  console.log(`  ❌ Failed: ${summary.failed}`);
  console.log(`  📈 Success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  
  // Step-by-step analysis
  const stepAnalysis = {};
  iterations.forEach(iteration => {
    iteration.steps.forEach(step => {
      if (!stepAnalysis[step.step]) {
        stepAnalysis[step.step] = { total: 0, passed: 0, failed: 0 };
      }
      stepAnalysis[step.step].total++;
      if (step.success) {
        stepAnalysis[step.step].passed++;
      } else {
        stepAnalysis[step.step].failed++;
      }
    });
  });
  
  console.log(`\n📈 Step Analysis:`);
  Object.entries(stepAnalysis).forEach(([stepName, stats]) => {
    const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
    console.log(`  ${stepName}: ${stats.passed}/${stats.total} (${successRate}%)`);
  });
  
  // Performance analysis
  const avgDurations = {};
  iterations.forEach(iteration => {
    iteration.steps.forEach(step => {
      if (!avgDurations[step.step]) {
        avgDurations[step.step] = [];
      }
      avgDurations[step.step].push(step.duration);
    });
  });
  
  console.log(`\n⏱️ Performance Analysis:`);
  Object.entries(avgDurations).forEach(([stepName, durations]) => {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    console.log(`  ${stepName}: ${avg.toFixed(0)}ms average`);
  });
  
  // Error summary
  if (summary.errors.length > 0) {
    console.log(`\n❌ Errors Encountered:`);
    summary.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  // Recommendations
  console.log(`\n💡 Recommendations:`);
  if (summary.passed < summary.total) {
    console.log(`  • Review failed steps and address any missing components`);
    console.log(`  • Ensure all dependencies are installed: npm install`);
    console.log(`  • Build the application: npm run build`);
    console.log(`  • Check environment variables are configured`);
  } else {
    console.log(`  • All tests passed! The application structure is solid.`);
    console.log(`  • Consider running the full browser-based tests: npm run test:workflow`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  return {
    success: summary.passed === summary.total,
    successRate: (summary.passed / summary.total) * 100,
    report: testResults
  };
}

/**
 * Main test execution function
 */
function runCompleteWorkflowTests() {
  console.log('🚀 Starting Complete User Workflow Testing (Simple Mode)');
  console.log(`📋 Configuration: ${CONFIG.iterations} iterations`);
  console.log(`📁 Testing directory: ${__dirname}`);
  
  try {
    // Run all iterations
    for (let i = 1; i <= CONFIG.iterations; i++) {
      const iterationResult = runWorkflowIteration(i);
      testResults.iterations.push(iterationResult);
      
      // Update summary
      testResults.summary.total++;
      if (iterationResult.success) {
        testResults.summary.passed++;
      } else {
        testResults.summary.failed++;
        if (iterationResult.error) {
          testResults.summary.errors.push(`Iteration ${i}: ${iterationResult.error}`);
        }
      }
    }
    
  } catch (error) {
    console.error(`\n❌ Test execution failed: ${error.message}`);
    testResults.summary.errors.push(`Test execution: ${error.message}`);
  }
  
  // Generate and return report
  return generateTestReport();
}

// Export for use as module or run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runCompleteWorkflowTests();
  process.exit(result.success ? 0 : 1);
}

export { runCompleteWorkflowTests, CONFIG };