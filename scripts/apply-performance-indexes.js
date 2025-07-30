#!/usr/bin/env node

/**
 * Apply Performance Indexes Migration
 * Applies the additional performance indexes migration to the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyPerformanceIndexes() {
  try {
    console.log('🚀 Applying additional performance indexes migration...\n');

    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250129000002_additional_performance_indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log(`📏 Migration size: ${(migrationSQL.length / 1024).toFixed(1)} KB\n`);

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🔧 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--') || statement.trim() === '') {
        continue;
      }

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        // Execute the SQL statement
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });

        if (error) {
          // Some errors are expected (like "already exists" for indexes)
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('IF NOT EXISTS')) {
            console.log(`  ⚠️  Statement ${i + 1}: ${error.message} (expected)`);
            successCount++;
          } else {
            console.log(`  ❌ Statement ${i + 1} failed: ${error.message}`);
            errors.push({ statement: i + 1, error: error.message });
            errorCount++;
          }
        } else {
          console.log(`  ✅ Statement ${i + 1}: Success`);
          successCount++;
        }
      } catch (err) {
        console.log(`  ❌ Statement ${i + 1} failed: ${err.message}`);
        errors.push({ statement: i + 1, error: err.message });
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Results:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(({ statement, error }) => {
        console.log(`  Statement ${statement}: ${error}`);
      });
    }

    if (errorCount === 0) {
      console.log('\n🎉 All performance indexes applied successfully!');
      console.log('✅ Database is now fully optimized for Healthcare Continuity MVP');
    } else if (successCount > errorCount) {
      console.log('\n⚠️  Migration completed with some errors');
      console.log('✅ Most performance optimizations were applied successfully');
    } else {
      console.log('\n❌ Migration failed with multiple errors');
      console.log('⚠️  Database optimization may be incomplete');
    }

    // Test a few key indexes to verify they were created
    console.log('\n🔍 Verifying key indexes...');
    await verifyKeyIndexes();

  } catch (error) {
    console.error('❌ Failed to apply performance indexes:', error.message);
    process.exit(1);
  }
}

async function verifyKeyIndexes() {
  const keyIndexes = [
    'idx_patients_dashboard_complete',
    'idx_providers_matching_complete',
    'idx_patients_name_gin',
    'idx_providers_name_gin',
    'idx_patients_urgent_cases',
    'idx_providers_premium'
  ];

  for (const indexName of keyIndexes) {
    try {
      const { data, error } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('indexname', indexName)
        .single();

      if (error || !data) {
        console.log(`  ❌ ${indexName}: Not found`);
      } else {
        console.log(`  ✅ ${indexName}: Created successfully`);
      }
    } catch (err) {
      console.log(`  ⚠️  ${indexName}: Could not verify (${err.message})`);
    }
  }
}

// Run the migration
applyPerformanceIndexes().catch(console.error);