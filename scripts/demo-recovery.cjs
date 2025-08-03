#!/usr/bin/env node

/**
 * Demo Recovery Script
 * Quick recovery options for demo day issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚨 Healthcare Continuity MVP - Demo Recovery\n');

const recoveryOptions = [
  {
    id: '1',
    name: 'Start Local Development Server',
    description: 'Start the application locally as backup',
    action: () => {
      console.log('Starting local development server...');
      console.log('Run: npm run dev');
      console.log('Then open: http://localhost:5173');
    }
  },
  {
    id: '2',
    name: 'Open Offline Demo Fallback',
    description: 'Open static HTML demo in browser',
    action: () => {
      const fallbackPath = path.join(process.cwd(), 'demo-assets', 'offline-demo-fallback.html');
      if (fs.existsSync(fallbackPath)) {
        console.log('Opening offline demo fallback...');
        console.log(`File location: ${fallbackPath}`);
        console.log('Open this file in your browser for offline demo');
      } else {
        console.log('❌ Offline demo fallback not found');
      }
    }
  },
  {
    id: '3',
    name: 'Display Key Demo Statistics',
    description: 'Show memorized statistics for manual presentation',
    action: () => {
      console.log('📊 KEY DEMO STATISTICS:\n');
      console.log('Problem:');
      console.log('  • 30% of discharged patients don\'t get timely follow-up');
      console.log('  • $15,000-$18,500 cost per lost patient');
      console.log('  • Care coordinators spend 45+ minutes per patient\n');
      
      console.log('Solution Impact:');
      console.log('  • 20x faster processing (45 minutes → 2 minutes)');
      console.log('  • 40% reduction in patient leakage');
      console.log('  • 94% provider match accuracy vs 60% manual');
      console.log('  • 89% risk prediction accuracy\n');
      
      console.log('Hero Patient - Margaret Thompson:');
      console.log('  • Age: 67, Hip replacement recovery');
      console.log('  • Risk Score: 95% (CRITICAL)');
      console.log('  • Days since discharge: 194');
      console.log('  • Insurance: Medicare');
      console.log('  • Status: Needs PT + Orthopedics');
    }
  },
  {
    id: '4',
    name: 'Show Demo Script',
    description: 'Display the complete demo script',
    action: () => {
      const scriptPath = 'DEMO_SCRIPT.md';
      if (fs.existsSync(scriptPath)) {
        console.log('📋 DEMO SCRIPT:\n');
        const script = fs.readFileSync(scriptPath, 'utf8');
        console.log(script);
      } else {
        console.log('❌ Demo script not found');
      }
    }
  },
  {
    id: '5',
    name: 'Emergency Contact Information',
    description: 'Show emergency contacts and support info',
    action: () => {
      console.log('📞 EMERGENCY CONTACTS:\n');
      console.log('Technical Support:');
      console.log('  • Supabase: support@supabase.com');
      console.log('  • Vercel: support@vercel.com\n');
      
      console.log('Quick Recovery Commands:');
      console.log('  • npm run dev (local server)');
      console.log('  • npm run build (rebuild app)');
      console.log('  • npm run preview (preview build)\n');
      
      console.log('Backup Materials:');
      console.log('  • demo-assets/offline-demo-fallback.html');
      console.log('  • DEMO_BACKUP_PLANS.md');
      console.log('  • DEMO_SCRIPT.md');
    }
  },
  {
    id: '6',
    name: 'Test Application Status',
    description: 'Quick health check of the application',
    action: () => {
      console.log('🔍 APPLICATION HEALTH CHECK:\n');
      
      // Check if package.json exists
      if (fs.existsSync('package.json')) {
        console.log('✅ package.json found');
      } else {
        console.log('❌ package.json missing');
      }
      
      // Check if node_modules exists
      if (fs.existsSync('node_modules')) {
        console.log('✅ node_modules found');
      } else {
        console.log('❌ node_modules missing - run: npm install');
      }
      
      // Check if build files exist
      if (fs.existsSync('dist')) {
        console.log('✅ Build files found');
      } else {
        console.log('⚠️  Build files missing - run: npm run build');
      }
      
      // Check environment files
      const envFiles = ['.env.development', '.env.production'];
      envFiles.forEach(file => {
        if (fs.existsSync(file)) {
          console.log(`✅ ${file} found`);
        } else {
          console.log(`⚠️  ${file} missing`);
        }
      });
    }
  }
];

function showMenu() {
  console.log('🛠️  RECOVERY OPTIONS:\n');
  recoveryOptions.forEach(option => {
    console.log(`${option.id}. ${option.name}`);
    console.log(`   ${option.description}\n`);
  });
  console.log('0. Exit\n');
}

function handleUserInput() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  showMenu();
  
  rl.question('Select recovery option (1-6, or 0 to exit): ', (answer) => {
    const option = recoveryOptions.find(opt => opt.id === answer);
    
    if (answer === '0') {
      console.log('👋 Good luck with your demo!');
      rl.close();
      return;
    }
    
    if (option) {
      console.log(`\n🔧 ${option.name}\n`);
      option.action();
      console.log('\n' + '─'.repeat(50) + '\n');
      
      rl.question('Press Enter to return to menu, or type "exit" to quit: ', (input) => {
        if (input.toLowerCase() === 'exit') {
          console.log('👋 Good luck with your demo!');
          rl.close();
        } else {
          handleUserInput();
        }
      });
    } else {
      console.log('❌ Invalid option. Please try again.\n');
      handleUserInput();
    }
  });
}

// Start the recovery interface
handleUserInput();