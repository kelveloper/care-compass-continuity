#!/usr/bin/env node

/**
 * Database Index Verification and Optimization Script
 * Verifies all required indexes are in place and suggests optimizations
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Expected indexes based on application query patterns
 */
const EXPECTED_INDEXES = {
  patients: [
    'idx_patients_leakage_risk_score_covering',
    'idx_patients_referral_status',
    'idx_patients_discharge_date',
    'idx_patients_insurance',
    'idx_patients_diagnosis_gin',
    'idx_patients_required_followup',
    'idx_patients_risk_status',
    'idx_patients_search_gin',
    'idx_patients_complex_filter',
    'idx_patients_active',
    'idx_patients_age',
    'idx_patients_days_since_discharge',
    'idx_patients_list_covering',
    'idx_patients_created_at_brin',
    'idx_patients_risk_referral_composite',
    'idx_patients_search_insurance',
    'idx_patients_recent_activity',
    'idx_patients_urgent',
    'idx_patients_computed_age',
    'idx_patients_computed_days_since_discharge',
    'idx_patients_dashboard_covering',
    'idx_patients_updated_at_brin',
    'idx_patients_current_referral_hash',
    'idx_patients_id_hash'
  ],
  providers: [
    'idx_providers_type',
    'idx_providers_rating_covering',
    'idx_providers_location',
    'idx_providers_accepted_insurance_gin',
    'idx_providers_in_network_plans_gin',
    'idx_providers_specialties_gin',
    'idx_providers_location_rating',
    'idx_providers_availability',
    'idx_providers_type_rating',
    'idx_providers_geo_rating',
    'idx_providers_available',
    'idx_providers_coordinates_hash',
    'idx_providers_search_covering',
    'idx_providers_id_hash',
    'idx_providers_availability_rating',
    'idx_providers_network_type',
    'idx_providers_geo_specialty',
    'idx_providers_top_available',
    'idx_providers_in_network_specialty',
    'idx_providers_coordinate_string',
    'idx_providers_matching_covering',
    'idx_providers_coordinates_not_null',
    'idx_providers_high_rated',
    'idx_providers_search_gin'
  ],
  referrals: [
    'idx_referrals_patient_status',
    'idx_referrals_provider_status',
    'idx_referrals_scheduled_date',
    'idx_referrals_completed_date',
    'idx_referrals_active',
    'idx_referrals_tracking',
    'idx_referrals_recent',
    'idx_referrals_created_at_brin',
    'idx_referrals_status_updated',
    'idx_referrals_completion_tracking',
    'idx_referrals_active_lookup',
    'idx_referrals_patient_hash',
    'idx_referrals_provider_hash',
    'idx_referrals_id_hash'
  ],
  referral_history: [
    'idx_referral_history_referral_created',
    'idx_referral_history_created_at_brin',
    'idx_referral_history_timeline',
    'idx_referral_history_status_changes'
  ]
};

/**
 * Performance-critical queries to test
 */
const PERFORMANCE_QUERIES = [
  {
    name: 'High-risk patients dashboard',
    query: `
      SELECT id, name, leakage_risk_score, leakage_risk_level, referral_status
      FROM patients 
      WHERE leakage_risk_level = 'high' 
      ORDER BY leakage_risk_score DESC 
      LIMIT 50
    `,
    expectedIndexes: ['idx_patients_risk_referral_composite', 'idx_patients_dashboard_covering']
  },
  {
    name: 'Provider matching by insurance and location',
    query: `
      SELECT id, name, rating, specialties, accepted_insurance, latitude, longitude
      FROM providers 
      WHERE 'Blue Cross Blue Shield' = ANY(accepted_insurance) 
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL 
        AND rating >= 4.0
      ORDER BY rating DESC 
      LIMIT 10
    `,
    expectedIndexes: ['idx_providers_accepted_insurance_gin', 'idx_providers_geo_rating', 'idx_providers_matching_covering']
  },
  {
    name: 'Patient search with full-text',
    query: `
      SELECT id, name, diagnosis, required_followup, leakage_risk_score
      FROM patients 
      WHERE name ILIKE '%John%' 
        OR diagnosis ILIKE '%John%' 
        OR required_followup ILIKE '%John%'
      ORDER BY leakage_risk_score DESC
    `,
    expectedIndexes: ['idx_patients_search_gin', 'idx_patients_leakage_risk_score_covering']
  },
  {
    name: 'Active referrals tracking',
    query: `
      SELECT r.id, r.status, r.created_at, r.patient_id
      FROM referrals r
      WHERE r.status IN ('pending', 'sent', 'scheduled')
      ORDER BY r.created_at DESC
      LIMIT 100
    `,
    expectedIndexes: ['idx_referrals_active_lookup', 'idx_referrals_tracking']
  }
];

/**
 * Check if all expected indexes exist
 */
async function verifyIndexes() {
  console.log('🔍 Verifying database indexes...\n');
  
  try {
    // Get all existing indexes
    const { data: indexes, error } = await supabase.rpc('get_table_indexes');
    
    if (error) {
      console.error('❌ Failed to fetch indexes:', error.message);
      return false;
    }
    
    const existingIndexes = new Set(indexes?.map(idx => idx.indexname) || []);
    let allIndexesPresent = true;
    
    // Check each table's indexes
    for (const [tableName, expectedIndexes] of Object.entries(EXPECTED_INDEXES)) {
      console.log(`📋 Checking ${tableName} table indexes:`);
      
      const missingIndexes = [];
      const presentIndexes = [];
      
      for (const indexName of expectedIndexes) {
        if (existingIndexes.has(indexName)) {
          presentIndexes.push(indexName);
        } else {
          missingIndexes.push(indexName);
          allIndexesPresent = false;
        }
      }
      
      console.log(`  ✅ Present: ${presentIndexes.length}/${expectedIndexes.length} indexes`);
      
      if (missingIndexes.length > 0) {
        console.log(`  ❌ Missing indexes:`);
        missingIndexes.forEach(idx => console.log(`    - ${idx}`));
      }
      
      console.log('');
    }
    
    return allIndexesPresent;
  } catch (error) {
    console.error('❌ Error verifying indexes:', error.message);
    return false;
  }
}

/**
 * Test query performance with EXPLAIN ANALYZE
 */
async function testQueryPerformance() {
  console.log('⚡ Testing query performance...\n');
  
  for (const testQuery of PERFORMANCE_QUERIES) {
    console.log(`🔍 Testing: ${testQuery.name}`);
    
    try {
      // Run EXPLAIN ANALYZE to get query plan and performance
      const { data, error } = await supabase.rpc('explain_query', {
        query_text: testQuery.query
      });
      
      if (error) {
        console.log(`  ❌ Query failed: ${error.message}`);
        continue;
      }
      
      // Parse execution time from EXPLAIN output
      const executionTime = extractExecutionTime(data);
      const usesIndexes = checkIndexUsage(data, testQuery.expectedIndexes);
      
      console.log(`  ⏱️  Execution time: ${executionTime}ms`);
      console.log(`  📊 Index usage: ${usesIndexes ? '✅ Optimal' : '⚠️  Suboptimal'}`);
      
      if (executionTime > 100) {
        console.log(`  ⚠️  Query is slow (>${100}ms)`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error testing query: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * Extract execution time from EXPLAIN ANALYZE output
 */
function extractExecutionTime(explainOutput) {
  if (!explainOutput || !Array.isArray(explainOutput)) return 'N/A';
  
  const planText = explainOutput.join('\n');
  const timeMatch = planText.match(/Execution Time: ([\d.]+) ms/);
  
  return timeMatch ? parseFloat(timeMatch[1]) : 'N/A';
}

/**
 * Check if query uses expected indexes
 */
function checkIndexUsage(explainOutput, expectedIndexes) {
  if (!explainOutput || !Array.isArray(explainOutput)) return false;
  
  const planText = explainOutput.join('\n').toLowerCase();
  
  // Check if any of the expected indexes are mentioned in the query plan
  return expectedIndexes.some(indexName => 
    planText.includes(indexName.toLowerCase())
  );
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  console.log('📊 Database Statistics:\n');
  
  try {
    // Get table sizes and row counts
    const tables = ['patients', 'providers', 'referrals', 'referral_history'];
    
    for (const tableName of tables) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ❌ ${tableName}: Error getting count`);
        continue;
      }
      
      console.log(`  📋 ${tableName}: ${count?.toLocaleString() || 0} rows`);
    }
    
    // Check materialized view status
    try {
      const { count: cacheCount, error: cacheError } = await supabase
        .from('provider_match_cache')
        .select('*', { count: 'exact', head: true });
      
      if (cacheError) {
        console.log('  ❌ provider_match_cache: Not available');
      } else {
        console.log(`  🚀 provider_match_cache: ${cacheCount?.toLocaleString() || 0} rows (materialized view active)`);
      }
    } catch (error) {
      console.log('  ❌ provider_match_cache: Not available');
    }
    
    console.log('');
  } catch (error) {
    console.error('❌ Error getting database stats:', error.message);
  }
}

/**
 * Suggest additional optimizations
 */
function suggestOptimizations() {
  console.log('💡 Optimization Suggestions:\n');
  
  const suggestions = [
    {
      category: 'Maintenance',
      items: [
        'Run ANALYZE on all tables weekly to update query planner statistics',
        'REINDEX CONCURRENTLY on heavily updated indexes monthly',
        'Monitor slow query log for queries taking >100ms',
        'Refresh materialized views during low-traffic periods'
      ]
    },
    {
      category: 'Performance Monitoring',
      items: [
        'Set up alerts for queries exceeding 500ms execution time',
        'Monitor index usage statistics to identify unused indexes',
        'Track cache hit ratios for materialized views',
        'Monitor connection pool utilization'
      ]
    },
    {
      category: 'Query Optimization',
      items: [
        'Use covering indexes to avoid table lookups where possible',
        'Leverage partial indexes for frequently filtered subsets',
        'Consider BRIN indexes for time-series data with large tables',
        'Use prepared statements for frequently executed queries'
      ]
    },
    {
      category: 'Application-Level',
      items: [
        'Implement query result caching with appropriate TTL',
        'Use pagination for large result sets',
        'Batch multiple related queries when possible',
        'Consider read replicas for reporting queries'
      ]
    }
  ];
  
  suggestions.forEach(({ category, items }) => {
    console.log(`🔧 ${category}:`);
    items.forEach(item => console.log(`  • ${item}`));
    console.log('');
  });
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Healthcare Continuity MVP - Database Index Verification\n');
  console.log('=' .repeat(60) + '\n');
  
  // Verify all expected indexes are present
  const indexesOk = await verifyIndexes();
  
  // Get database statistics
  await getDatabaseStats();
  
  // Test query performance
  await testQueryPerformance();
  
  // Provide optimization suggestions
  suggestOptimizations();
  
  // Summary
  console.log('📋 Summary:\n');
  
  if (indexesOk) {
    console.log('✅ All expected database indexes are present');
    console.log('✅ Database is optimally configured for Healthcare Continuity MVP');
    console.log('✅ Query performance should be excellent');
  } else {
    console.log('⚠️  Some expected indexes are missing');
    console.log('⚠️  Consider running the latest database migrations');
    console.log('⚠️  Query performance may be suboptimal');
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('  1. Run any missing database migrations');
  console.log('  2. Monitor query performance in production');
  console.log('  3. Set up regular maintenance tasks');
  console.log('  4. Consider additional optimizations based on usage patterns');
  
  console.log('\n' + '=' .repeat(60));
  console.log('Database index verification completed! 🎉');
}

// Run the verification
main().catch(console.error);

export {
  verifyIndexes,
  testQueryPerformance,
  getDatabaseStats,
  EXPECTED_INDEXES,
  PERFORMANCE_QUERIES
};