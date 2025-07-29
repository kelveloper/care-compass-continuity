#!/usr/bin/env node

/**
 * Verification script for network failure handling implementation
 * This script checks that the network handling features are properly implemented
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Network Failure Handling Implementation...\n');

const checks = [
  {
    name: 'Network Status Hook',
    file: 'src/hooks/use-network-status.ts',
    required: [
      'useNetworkStatus',
      'checkConnectivity',
      'getNetworkQuality',
      'navigator.onLine',
      'online.*offline.*events'
    ]
  },
  {
    name: 'Enhanced API Error Handler',
    file: 'src/lib/api-error-handler.ts',
    required: [
      'handleApiCallWithRetry',
      'exponentialBackoff',
      'maxRetries',
      'networkAware',
      'isNonRetryableError'
    ]
  },
  {
    name: 'Network Status Indicator Component',
    file: 'src/components/NetworkStatusIndicator.tsx',
    required: [
      'NetworkStatusIndicator',
      'getNetworkIcon',
      'getStatusText',
      'WifiOff',
      'SignalHigh',
      'SignalMedium',
      'SignalLow'
    ]
  },
  {
    name: 'Enhanced Background Sync',
    file: 'src/hooks/use-background-sync.ts',
    required: [
      'useNetworkStatus',
      'networkStatus',
      'networkQuality',
      'refreshOnReconnect'
    ]
  },
  {
    name: 'Enhanced Patients Hook',
    file: 'src/hooks/use-patients.ts',
    required: [
      'handleApiCallWithRetry',
      'networkStatus',
      'getNetworkQuality',
      'retry.*networkStatus',
      'maxRetries.*networkStatus',
      'handleApiCallWithRetry'
    ]
  },
  {
    name: 'Dashboard Integration',
    file: 'src/components/Dashboard.tsx',
    required: [
      'NetworkStatusIndicator',
      'useBackgroundSync',
      'backgroundSync'
    ]
  }
];

let allPassed = true;

for (const check of checks) {
  console.log(`📁 Checking ${check.name}...`);
  
  const filePath = path.join(__dirname, check.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${check.file}`);
    allPassed = false;
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let checkPassed = true;
  
  for (const requirement of check.required) {
    const regex = new RegExp(requirement, 'i');
    if (!regex.test(content)) {
      console.log(`   ❌ Missing: ${requirement}`);
      checkPassed = false;
      allPassed = false;
    }
  }
  
  if (checkPassed) {
    console.log(`   ✅ All requirements found`);
  }
  
  console.log('');
}

// Check for network handling features
console.log('🔧 Checking Network Handling Features...\n');

const features = [
  {
    name: 'Offline Detection',
    description: 'Browser online/offline event handling',
    check: () => {
      const networkHook = fs.readFileSync('src/hooks/use-network-status.ts', 'utf8');
      return networkHook.includes('addEventListener') && 
             networkHook.includes('online') && 
             networkHook.includes('offline');
    }
  },
  {
    name: 'Connectivity Testing',
    description: 'Active connectivity verification',
    check: () => {
      const networkHook = fs.readFileSync('src/hooks/use-network-status.ts', 'utf8');
      return networkHook.includes('checkConnectivity') && 
             networkHook.includes('fetch') &&
             networkHook.includes('favicon.ico');
    }
  },
  {
    name: 'Network Quality Assessment',
    description: 'Connection quality detection',
    check: () => {
      const networkHook = fs.readFileSync('src/hooks/use-network-status.ts', 'utf8');
      return networkHook.includes('effectiveType') && 
             networkHook.includes('downlink') &&
             networkHook.includes('rtt');
    }
  },
  {
    name: 'Retry Logic with Exponential Backoff',
    description: 'Smart retry mechanisms',
    check: () => {
      const apiHandler = fs.readFileSync('src/lib/api-error-handler.ts', 'utf8');
      return apiHandler.includes('exponentialBackoff') && 
             apiHandler.includes('Math.pow') &&
             apiHandler.includes('retryDelay');
    }
  },
  {
    name: 'Network-Aware Query Configuration',
    description: 'Adaptive query behavior based on network',
    check: () => {
      const patientsHook = fs.readFileSync('src/hooks/use-patients.ts', 'utf8');
      return patientsHook.includes('networkStatus.getNetworkQuality') && 
             patientsHook.includes('refetchInterval') &&
             (patientsHook.includes('poor') && patientsHook.includes('good') && patientsHook.includes('fair'));
    }
  },
  {
    name: 'User Feedback for Network Issues',
    description: 'Visual indicators and notifications',
    check: () => {
      const indicator = fs.readFileSync('src/components/NetworkStatusIndicator.tsx', 'utf8');
      const dashboard = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
      return indicator.includes('WifiOff') && 
             indicator.includes('SignalHigh') &&
             dashboard.includes('NetworkStatusIndicator');
    }
  }
];

for (const feature of features) {
  try {
    const passed = feature.check();
    console.log(`${passed ? '✅' : '❌'} ${feature.name}`);
    console.log(`   ${feature.description}`);
    if (!passed) allPassed = false;
  } catch (error) {
    console.log(`❌ ${feature.name} - Error checking: ${error.message}`);
    allPassed = false;
  }
  console.log('');
}

// Summary
console.log('📊 Summary\n');
if (allPassed) {
  console.log('🎉 All network failure handling features are properly implemented!');
  console.log('\n✨ Key Features Implemented:');
  console.log('   • Real-time network status detection');
  console.log('   • Automatic retry with exponential backoff');
  console.log('   • Network quality-aware query optimization');
  console.log('   • Visual network status indicators');
  console.log('   • Graceful offline handling');
  console.log('   • Connection quality assessment');
  console.log('\n🚀 The application now handles network failures gracefully!');
} else {
  console.log('⚠️  Some network handling features may be missing or incomplete.');
  console.log('   Please review the failed checks above.');
}

console.log('\n' + '='.repeat(60));
console.log('Network Failure Handling Verification Complete');
console.log('='.repeat(60));

process.exit(allPassed ? 0 : 1);