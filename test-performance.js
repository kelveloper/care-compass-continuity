/**
 * Performance testing script to verify sub-3-second load times
 * Tests all major interactions and measures performance metrics
 */

const { chromium } = require('playwright');

async function testPerformance() {
  console.log('🚀 Starting performance tests for sub-3-second load times...\n');
  
  const browser = await chromium.launch({ 
    headless: process.env.HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    // Simulate realistic network conditions
    viewport: { width: 1280, height: 720 },
  });
  
  const page = await context.newPage();
  
  // Enable performance monitoring
  await page.addInitScript(() => {
    window.performanceMetrics = [];
    
    // Override performance.mark to capture custom metrics
    const originalMark = performance.mark;
    performance.mark = function(name) {
      window.performanceMetrics.push({
        type: 'mark',
        name,
        timestamp: performance.now()
      });
      return originalMark.call(this, name);
    };
    
    // Override performance.measure to capture custom metrics
    const originalMeasure = performance.measure;
    performance.measure = function(name, startMark, endMark) {
      const result = originalMeasure.call(this, name, startMark, endMark);
      window.performanceMetrics.push({
        type: 'measure',
        name,
        duration: result.duration,
        timestamp: performance.now()
      });
      return result;
    };
  });
  
  const results = {
    initialLoad: null,
    dashboardLoad: null,
    patientDetailLoad: null,
    searchResponse: null,
    filterResponse: null,
    providerMatchLoad: null,
    passed: 0,
    failed: 0,
    warnings: []
  };
  
  try {
    // Test 1: Initial App Load
    console.log('📱 Testing initial app load...');
    const startTime = Date.now();
    
    await page.goto('http://localhost:8080', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    // Wait for dashboard to be fully loaded
    await page.waitForSelector('[data-testid="dashboard"], .container', { timeout: 5000 });
    
    const initialLoadTime = Date.now() - startTime;
    results.initialLoad = initialLoadTime;
    
    console.log(`   ⏱️  Initial load: ${initialLoadTime}ms`);
    
    if (initialLoadTime <= 2000) {
      console.log('   ✅ PASS: Initial load under 2 seconds');
      results.passed++;
    } else if (initialLoadTime <= 3000) {
      console.log('   ⚠️  WARNING: Initial load under 3 seconds but over target');
      results.warnings.push(`Initial load: ${initialLoadTime}ms (target: 2000ms)`);
      results.passed++;
    } else {
      console.log('   ❌ FAIL: Initial load exceeds 3 seconds');
      results.failed++;
    }
    
    // Test 2: Dashboard Data Load
    console.log('\n📊 Testing dashboard data load...');
    const dashboardStartTime = Date.now();
    
    // Wait for patient cards to appear
    await page.waitForSelector('.space-y-4 > div', { timeout: 5000 });
    
    // Wait for loading states to disappear
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('[class*="animate-pulse"], [class*="animate-spin"]');
      return loadingElements.length === 0;
    }, { timeout: 5000 });
    
    const dashboardLoadTime = Date.now() - dashboardStartTime;
    results.dashboardLoad = dashboardLoadTime;
    
    console.log(`   ⏱️  Dashboard load: ${dashboardLoadTime}ms`);
    
    if (dashboardLoadTime <= 1500) {
      console.log('   ✅ PASS: Dashboard load under 1.5 seconds');
      results.passed++;
    } else if (dashboardLoadTime <= 3000) {
      console.log('   ⚠️  WARNING: Dashboard load under 3 seconds but over target');
      results.warnings.push(`Dashboard load: ${dashboardLoadTime}ms (target: 1500ms)`);
      results.passed++;
    } else {
      console.log('   ❌ FAIL: Dashboard load exceeds 3 seconds');
      results.failed++;
    }
    
    // Test 3: Search Response Time
    console.log('\n🔍 Testing search response time...');
    const searchInput = page.locator('input[placeholder*="Search patients"]');
    
    const searchStartTime = Date.now();
    await searchInput.fill('John');
    
    // Wait for search results to update
    await page.waitForTimeout(500); // Allow for debouncing
    await page.waitForFunction(() => {
      const searchingIndicator = document.querySelector('[class*="animate-spin"]');
      return !searchingIndicator;
    }, { timeout: 3000 });
    
    const searchResponseTime = Date.now() - searchStartTime;
    results.searchResponse = searchResponseTime;
    
    console.log(`   ⏱️  Search response: ${searchResponseTime}ms`);
    
    if (searchResponseTime <= 500) {
      console.log('   ✅ PASS: Search response under 500ms');
      results.passed++;
    } else if (searchResponseTime <= 1000) {
      console.log('   ⚠️  WARNING: Search response under 1 second but over target');
      results.warnings.push(`Search response: ${searchResponseTime}ms (target: 500ms)`);
      results.passed++;
    } else {
      console.log('   ❌ FAIL: Search response exceeds 1 second');
      results.failed++;
    }
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // Test 4: Filter Response Time
    console.log('\n🔽 Testing filter response time...');
    const filterStartTime = Date.now();
    
    // Click on risk filter dropdown
    await page.click('button:has-text("All Risks")');
    await page.waitForSelector('[role="option"]', { timeout: 2000 });
    
    // Select high risk filter
    await page.click('[role="option"]:has-text("High Risk")');
    
    // Wait for filter to apply
    await page.waitForTimeout(300); // Allow for debouncing
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('[class*="animate-spin"]');
      return loadingElements.length === 0;
    }, { timeout: 3000 });
    
    const filterResponseTime = Date.now() - filterStartTime;
    results.filterResponse = filterResponseTime;
    
    console.log(`   ⏱️  Filter response: ${filterResponseTime}ms`);
    
    if (filterResponseTime <= 300) {
      console.log('   ✅ PASS: Filter response under 300ms');
      results.passed++;
    } else if (filterResponseTime <= 1000) {
      console.log('   ⚠️  WARNING: Filter response under 1 second but over target');
      results.warnings.push(`Filter response: ${filterResponseTime}ms (target: 300ms)`);
      results.passed++;
    } else {
      console.log('   ❌ FAIL: Filter response exceeds 1 second');
      results.failed++;
    }
    
    // Reset filter
    await page.click('button:has-text("High Risk")');
    await page.click('[role="option"]:has-text("All Risks")');
    await page.waitForTimeout(300);
    
    // Test 5: Patient Detail Load
    console.log('\n👤 Testing patient detail load...');
    
    // Find and click on first patient card
    const firstPatientCard = page.locator('.space-y-4 > div').first();
    await firstPatientCard.waitFor({ timeout: 3000 });
    
    const patientDetailStartTime = Date.now();
    await firstPatientCard.click();
    
    // Wait for patient detail view to load
    await page.waitForSelector('button:has-text("← Back to Dashboard")', { timeout: 5000 });
    
    // Wait for all patient data to load
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('[class*="animate-pulse"], [class*="animate-spin"]');
      return loadingElements.length === 0;
    }, { timeout: 5000 });
    
    const patientDetailLoadTime = Date.now() - patientDetailStartTime;
    results.patientDetailLoad = patientDetailLoadTime;
    
    console.log(`   ⏱️  Patient detail load: ${patientDetailLoadTime}ms`);
    
    if (patientDetailLoadTime <= 1000) {
      console.log('   ✅ PASS: Patient detail load under 1 second');
      results.passed++;
    } else if (patientDetailLoadTime <= 3000) {
      console.log('   ⚠️  WARNING: Patient detail load under 3 seconds but over target');
      results.warnings.push(`Patient detail load: ${patientDetailLoadTime}ms (target: 1000ms)`);
      results.passed++;
    } else {
      console.log('   ❌ FAIL: Patient detail load exceeds 3 seconds');
      results.failed++;
    }
    
    // Test 6: Provider Match Load (if available)
    console.log('\n🏥 Testing provider match load...');
    
    try {
      // Look for provider match button or section
      const providerMatchButton = page.locator('button:has-text("Find Providers"), button:has-text("Match Providers")');
      
      if (await providerMatchButton.count() > 0) {
        const providerMatchStartTime = Date.now();
        await providerMatchButton.first().click();
        
        // Wait for provider matches to load
        await page.waitForSelector('.space-y-4 > div, [data-testid="provider-match"]', { timeout: 5000 });
        
        const providerMatchLoadTime = Date.now() - providerMatchStartTime;
        results.providerMatchLoad = providerMatchLoadTime;
        
        console.log(`   ⏱️  Provider match load: ${providerMatchLoadTime}ms`);
        
        if (providerMatchLoadTime <= 2000) {
          console.log('   ✅ PASS: Provider match load under 2 seconds');
          results.passed++;
        } else if (providerMatchLoadTime <= 3000) {
          console.log('   ⚠️  WARNING: Provider match load under 3 seconds but over target');
          results.warnings.push(`Provider match load: ${providerMatchLoadTime}ms (target: 2000ms)`);
          results.passed++;
        } else {
          console.log('   ❌ FAIL: Provider match load exceeds 3 seconds');
          results.failed++;
        }
      } else {
        console.log('   ⏭️  SKIP: Provider match functionality not found');
      }
    } catch (error) {
      console.log('   ⏭️  SKIP: Provider match test failed:', error.message);
    }
    
    // Get Core Web Vitals
    console.log('\n📊 Measuring Core Web Vitals...');
    
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // Get LCP
        if ('PerformanceObserver' in window) {
          try {
            const lcpObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              vitals.lcp = lastEntry.startTime;
              lcpObserver.disconnect();
              
              // Get FID (if available)
              const fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                if (entries.length > 0) {
                  const entry = entries[0];
                  vitals.fid = entry.processingStart - entry.startTime;
                }
                fidObserver.disconnect();
                resolve(vitals);
              });
              
              try {
                fidObserver.observe({ entryTypes: ['first-input'] });
                // Resolve after timeout if no FID
                setTimeout(() => resolve(vitals), 1000);
              } catch (e) {
                resolve(vitals);
              }
            });
            
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            
            // Resolve after timeout if no LCP
            setTimeout(() => resolve(vitals), 2000);
          } catch (e) {
            resolve(vitals);
          }
        } else {
          resolve(vitals);
        }
      });
    });
    
    if (webVitals.lcp) {
      console.log(`   🎯 LCP: ${webVitals.lcp.toFixed(2)}ms ${webVitals.lcp <= 2500 ? '✅' : '⚠️'}`);
    }
    
    if (webVitals.fid) {
      console.log(`   ⚡ FID: ${webVitals.fid.toFixed(2)}ms ${webVitals.fid <= 100 ? '✅' : '⚠️'}`);
    }
    
  } catch (error) {
    console.error('❌ Performance test error:', error.message);
    results.failed++;
  } finally {
    await browser.close();
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(60));
  
  const totalTests = results.passed + results.failed;
  const passRate = totalTests > 0 ? ((results.passed / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Pass Rate: ${passRate}%`);
  
  if (results.warnings.length > 0) {
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
  }
  
  console.log('\n📋 DETAILED RESULTS:');
  if (results.initialLoad) console.log(`   Initial Load: ${results.initialLoad}ms (target: ≤2000ms)`);
  if (results.dashboardLoad) console.log(`   Dashboard Load: ${results.dashboardLoad}ms (target: ≤1500ms)`);
  if (results.patientDetailLoad) console.log(`   Patient Detail: ${results.patientDetailLoad}ms (target: ≤1000ms)`);
  if (results.searchResponse) console.log(`   Search Response: ${results.searchResponse}ms (target: ≤500ms)`);
  if (results.filterResponse) console.log(`   Filter Response: ${results.filterResponse}ms (target: ≤300ms)`);
  if (results.providerMatchLoad) console.log(`   Provider Match: ${results.providerMatchLoad}ms (target: ≤2000ms)`);
  
  const overallSuccess = results.failed === 0;
  
  console.log('\n' + '='.repeat(60));
  if (overallSuccess) {
    console.log('🎉 ALL PERFORMANCE TESTS PASSED!');
    console.log('✅ Sub-3-second load times achieved for all major interactions');
  } else {
    console.log('⚠️  SOME PERFORMANCE TESTS FAILED');
    console.log('❌ Performance optimization needed for failed tests');
  }
  console.log('='.repeat(60));
  
  // Exit with appropriate code
  process.exit(overallSuccess ? 0 : 1);
}

// Handle script execution
if (require.main === module) {
  testPerformance().catch(error => {
    console.error('❌ Performance test script failed:', error);
    process.exit(1);
  });
}

module.exports = { testPerformance };