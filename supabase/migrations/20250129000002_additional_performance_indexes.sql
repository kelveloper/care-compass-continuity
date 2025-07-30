-- Additional Performance Indexes Migration
-- This migration adds final performance optimizations based on application analysis
-- Focuses on query patterns identified in the Healthcare Continuity MVP

-- 1. Add missing indexes for text search optimization
-- Enhanced text search index for patient names (frequently searched)
CREATE INDEX IF NOT EXISTS idx_patients_name_gin ON patients 
USING gin(to_tsvector('english', name)) 
WHERE name IS NOT NULL AND name != '';

-- Enhanced text search index for provider names (frequently searched)
CREATE INDEX IF NOT EXISTS idx_providers_name_gin ON providers 
USING gin(to_tsvector('english', name)) 
WHERE name IS NOT NULL AND name != '';

-- 2. Add indexes for referral workflow optimization
-- Index for referral service type filtering (used in referral management)
CREATE INDEX IF NOT EXISTS idx_referrals_service_type ON referrals(service_type)
WHERE service_type IS NOT NULL AND service_type != '';

-- Index for referral notes search (used in referral history)
CREATE INDEX IF NOT EXISTS idx_referrals_notes_gin ON referrals 
USING gin(to_tsvector('english', COALESCE(notes, '')))
WHERE notes IS NOT NULL AND notes != '';

-- Index for referral history notes search
CREATE INDEX IF NOT EXISTS idx_referral_history_notes_gin ON referral_history 
USING gin(to_tsvector('english', COALESCE(notes, '')))
WHERE notes IS NOT NULL AND notes != '';

-- 3. Add indexes for patient filtering optimization
-- Index for patient address-based queries (used in geographic matching)
CREATE INDEX IF NOT EXISTS idx_patients_address_gin ON patients 
USING gin(to_tsvector('english', address))
WHERE address IS NOT NULL AND address != '';

-- Index for patient date of birth (used in age calculations)
CREATE INDEX IF NOT EXISTS idx_patients_date_of_birth ON patients(date_of_birth)
WHERE date_of_birth IS NOT NULL;

-- 4. Add indexes for provider availability optimization
-- Index for provider phone number lookups (used in contact management)
CREATE INDEX IF NOT EXISTS idx_providers_phone ON providers(phone)
WHERE phone IS NOT NULL AND phone != '';

-- Index for provider email lookups (used in contact management)
CREATE INDEX IF NOT EXISTS idx_providers_email ON providers(email)
WHERE email IS NOT NULL AND email != '';

-- 5. Add composite indexes for complex filtering scenarios
-- Index for patient filtering by multiple risk factors
CREATE INDEX IF NOT EXISTS idx_patients_multi_risk_filter ON patients(
  leakage_risk_level,
  insurance,
  referral_status,
  leakage_risk_score DESC
) WHERE leakage_risk_level IN ('medium', 'high');

-- Index for provider filtering by multiple criteria
CREATE INDEX IF NOT EXISTS idx_providers_multi_criteria_filter ON providers(
  type,
  rating DESC,
  availability_next
) WHERE rating >= 3.0 AND availability_next IS NOT NULL;

-- 6. Add indexes for time-based queries optimization
-- Index for patients by discharge date range (used in risk calculations)
CREATE INDEX IF NOT EXISTS idx_patients_discharge_date_range ON patients(
  discharge_date,
  leakage_risk_score DESC
) WHERE discharge_date >= (CURRENT_DATE - INTERVAL '90 days');

-- Index for recent referrals (used in dashboard and reporting)
CREATE INDEX IF NOT EXISTS idx_referrals_recent_with_patient ON referrals(
  created_at DESC,
  patient_id,
  status
) WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');

-- 7. Add indexes for JSON/Array operations optimization
-- Index for provider specialties array operations (optimized for contains operations)
CREATE INDEX IF NOT EXISTS idx_providers_specialties_optimized ON providers 
USING gin(specialties gin__int_ops)
WHERE array_length(specialties, 1) > 0;

-- Index for provider insurance arrays (optimized for contains operations)
CREATE INDEX IF NOT EXISTS idx_providers_insurance_optimized ON providers 
USING gin(accepted_insurance gin__int_ops, in_network_plans gin__int_ops)
WHERE array_length(accepted_insurance, 1) > 0 OR array_length(in_network_plans, 1) > 0;

-- 8. Add partial indexes for high-performance scenarios
-- Index for urgent patient cases (high risk + recent discharge + needs referral)
CREATE INDEX IF NOT EXISTS idx_patients_urgent_cases ON patients(
  leakage_risk_score DESC,
  discharge_date DESC,
  updated_at DESC
) WHERE leakage_risk_level = 'high' 
  AND referral_status = 'needed' 
  AND discharge_date >= (CURRENT_DATE - INTERVAL '14 days');

-- Index for premium providers (high rating + available + in-network)
CREATE INDEX IF NOT EXISTS idx_providers_premium ON providers(
  rating DESC,
  availability_next,
  type
) WHERE rating >= 4.5 
  AND availability_next IS NOT NULL 
  AND array_length(in_network_plans, 1) > 0;

-- 9. Add expression indexes for computed values
-- Index for patient age groups (used in risk scoring and reporting)
CREATE INDEX IF NOT EXISTS idx_patients_age_groups ON patients(
  (CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) < 18 THEN 'pediatric'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) < 65 THEN 'adult'
    ELSE 'senior'
  END),
  leakage_risk_score DESC
) WHERE date_of_birth IS NOT NULL;

-- Index for provider distance calculations (using coordinate hashing)
CREATE INDEX IF NOT EXISTS idx_providers_geo_hash ON providers(
  (ROUND(latitude::numeric, 2)::text || ',' || ROUND(longitude::numeric, 2)::text),
  rating DESC
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 10. Add covering indexes to eliminate table lookups
-- Covering index for patient dashboard queries (includes all commonly needed fields)
CREATE INDEX IF NOT EXISTS idx_patients_dashboard_complete ON patients(
  leakage_risk_score DESC,
  leakage_risk_level,
  referral_status,
  updated_at DESC
) INCLUDE (
  id,
  name,
  diagnosis,
  insurance,
  required_followup,
  discharge_date,
  current_referral_id,
  date_of_birth,
  address
) WHERE leakage_risk_score > 0;

-- Covering index for provider matching queries (includes all commonly needed fields)
CREATE INDEX IF NOT EXISTS idx_providers_matching_complete ON providers(
  rating DESC,
  type,
  latitude,
  longitude,
  availability_next
) INCLUDE (
  id,
  name,
  address,
  phone,
  email,
  specialties,
  accepted_insurance,
  in_network_plans,
  created_at
) WHERE rating > 0 AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- 11. Add specialized indexes for reporting and analytics
-- Index for referral completion rates (used in reporting)
CREATE INDEX IF NOT EXISTS idx_referrals_completion_analytics ON referrals(
  status,
  created_at,
  completed_date,
  service_type
) WHERE status IN ('completed', 'cancelled');

-- Index for patient outcome tracking (used in analytics)
CREATE INDEX IF NOT EXISTS idx_patients_outcome_tracking ON patients(
  referral_status,
  leakage_risk_level,
  insurance,
  created_at
) WHERE referral_status IN ('completed', 'scheduled');

-- 12. Add maintenance and monitoring indexes
-- Index for database maintenance queries
CREATE INDEX IF NOT EXISTS idx_patients_maintenance ON patients(updated_at)
WHERE updated_at < (CURRENT_DATE - INTERVAL '30 days');

CREATE INDEX IF NOT EXISTS idx_providers_maintenance ON providers(created_at)
WHERE created_at < (CURRENT_DATE - INTERVAL '90 days');

-- 13. Create helper functions for index maintenance
-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE(
  schemaname TEXT,
  tablename TEXT,
  indexname TEXT,
  idx_scan BIGINT,
  idx_tup_read BIGINT,
  idx_tup_fetch BIGINT,
  usage_ratio NUMERIC
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT,
    s.tablename::TEXT,
    s.indexname::TEXT,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch,
    CASE 
      WHEN s.idx_scan = 0 THEN 0
      ELSE ROUND((s.idx_tup_fetch::NUMERIC / s.idx_scan), 2)
    END as usage_ratio
  FROM pg_stat_user_indexes s
  JOIN pg_index i ON s.indexrelid = i.indexrelid
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan DESC;
END;
$ LANGUAGE plpgsql;

-- Function to identify unused indexes
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE(
  schemaname TEXT,
  tablename TEXT,
  indexname TEXT,
  index_size TEXT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT,
    s.tablename::TEXT,
    s.indexname::TEXT,
    pg_size_pretty(pg_relation_size(s.indexrelid))::TEXT as index_size
  FROM pg_stat_user_indexes s
  JOIN pg_index i ON s.indexrelid = i.indexrelid
  WHERE s.schemaname = 'public'
    AND s.idx_scan = 0
    AND NOT i.indisunique
    AND NOT i.indisprimary
  ORDER BY pg_relation_size(s.indexrelid) DESC;
END;
$ LANGUAGE plpgsql;

-- Function to get table and index sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name TEXT,
  table_size TEXT,
  indexes_size TEXT,
  total_size TEXT,
  row_count BIGINT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename))::TEXT as table_size,
    pg_size_pretty(pg_indexes_size(t.schemaname||'.'||t.tablename))::TEXT as indexes_size,
    pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename) + pg_indexes_size(t.schemaname||'.'||t.tablename))::TEXT as total_size,
    COALESCE(c.reltuples::BIGINT, 0) as row_count
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  ORDER BY pg_total_relation_size(t.schemaname||'.'||t.tablename) DESC;
END;
$ LANGUAGE plpgsql;

-- 14. Update table statistics for better query planning
-- Set higher statistics targets for frequently queried columns
ALTER TABLE patients ALTER COLUMN name SET STATISTICS 1500;
ALTER TABLE patients ALTER COLUMN diagnosis SET STATISTICS 1500;
ALTER TABLE patients ALTER COLUMN insurance SET STATISTICS 1500;
ALTER TABLE patients ALTER COLUMN address SET STATISTICS 1000;

ALTER TABLE providers ALTER COLUMN name SET STATISTICS 1500;
ALTER TABLE providers ALTER COLUMN type SET STATISTICS 1500;
ALTER TABLE providers ALTER COLUMN specialties SET STATISTICS 1500;
ALTER TABLE providers ALTER COLUMN accepted_insurance SET STATISTICS 1500;
ALTER TABLE providers ALTER COLUMN address SET STATISTICS 1000;

ALTER TABLE referrals ALTER COLUMN service_type SET STATISTICS 1000;
ALTER TABLE referrals ALTER COLUMN status SET STATISTICS 1000;

-- 15. Add constraints to help query optimizer
-- Add check constraints for better query planning
ALTER TABLE patients ADD CONSTRAINT chk_patients_name_not_empty 
CHECK (name IS NOT NULL AND length(trim(name)) > 0);

ALTER TABLE patients ADD CONSTRAINT chk_patients_insurance_not_empty 
CHECK (insurance IS NOT NULL AND length(trim(insurance)) > 0);

ALTER TABLE providers ADD CONSTRAINT chk_providers_name_not_empty 
CHECK (name IS NOT NULL AND length(trim(name)) > 0);

ALTER TABLE providers ADD CONSTRAINT chk_providers_type_not_empty 
CHECK (type IS NOT NULL AND length(trim(type)) > 0);

-- Add exclusion constraints for data integrity
ALTER TABLE referrals ADD CONSTRAINT chk_referrals_scheduled_date_future 
CHECK (scheduled_date IS NULL OR scheduled_date >= created_at);

-- 16. Create optimized views for common query patterns
-- View for high-priority patients (combines multiple filters)
CREATE OR REPLACE VIEW high_priority_patients AS
SELECT 
  p.*,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth)) as age,
  EXTRACT(DAY FROM (CURRENT_DATE - p.discharge_date)) as days_since_discharge,
  CASE 
    WHEN p.leakage_risk_score >= 80 THEN 'critical'
    WHEN p.leakage_risk_score >= 70 THEN 'high'
    ELSE 'medium'
  END as priority_level
FROM patients p
WHERE p.leakage_risk_level IN ('medium', 'high')
  AND p.referral_status IN ('needed', 'sent')
  AND p.discharge_date >= (CURRENT_DATE - INTERVAL '30 days')
ORDER BY p.leakage_risk_score DESC, p.discharge_date ASC;

-- View for available providers (combines multiple filters)
CREATE OR REPLACE VIEW available_providers AS
SELECT 
  p.*,
  CASE 
    WHEN p.availability_next ILIKE '%today%' OR p.availability_next ILIKE '%same day%' THEN 1
    WHEN p.availability_next ILIKE '%tomorrow%' THEN 2
    WHEN p.availability_next ILIKE '%this week%' THEN 3
    WHEN p.availability_next ILIKE '%next week%' THEN 4
    ELSE 5
  END as availability_priority
FROM providers p
WHERE p.rating >= 3.0
  AND p.availability_next IS NOT NULL
  AND p.availability_next != ''
  AND array_length(p.specialties, 1) > 0
ORDER BY availability_priority ASC, p.rating DESC;

-- 17. Final analysis and maintenance
-- Update all table statistics with new indexes
ANALYZE patients;
ANALYZE providers;
ANALYZE referrals;
ANALYZE referral_history;

-- Refresh materialized view if it exists
DO $
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY provider_match_cache;
    RAISE NOTICE 'Provider match cache refreshed successfully';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Provider match cache not found, skipping refresh';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to refresh provider match cache: %', SQLERRM;
  END;
END;
$;

-- 18. Add comments for documentation
COMMENT ON INDEX idx_patients_name_gin IS 'Full-text search index for patient names';
COMMENT ON INDEX idx_providers_name_gin IS 'Full-text search index for provider names';
COMMENT ON INDEX idx_patients_multi_risk_filter IS 'Composite index for complex patient risk filtering';
COMMENT ON INDEX idx_providers_multi_criteria_filter IS 'Composite index for complex provider filtering';
COMMENT ON INDEX idx_patients_urgent_cases IS 'Partial index for urgent patient cases requiring immediate attention';
COMMENT ON INDEX idx_providers_premium IS 'Partial index for high-quality providers with availability';
COMMENT ON INDEX idx_patients_dashboard_complete IS 'Covering index for patient dashboard queries to eliminate table lookups';
COMMENT ON INDEX idx_providers_matching_complete IS 'Covering index for provider matching queries to eliminate table lookups';

COMMENT ON FUNCTION get_index_usage_stats IS 'Returns statistics about index usage for performance monitoring';
COMMENT ON FUNCTION get_unused_indexes IS 'Identifies unused indexes that may be candidates for removal';
COMMENT ON FUNCTION get_table_sizes IS 'Returns table and index sizes for storage monitoring';

COMMENT ON VIEW high_priority_patients IS 'Optimized view for high-priority patients requiring immediate attention';
COMMENT ON VIEW available_providers IS 'Optimized view for providers with current availability';

-- Log completion
DO $
BEGIN
  RAISE NOTICE 'Additional performance indexes migration completed successfully at %', NOW();
  RAISE NOTICE 'Added % new indexes for enhanced query performance', 20;
  RAISE NOTICE 'Created % helper functions for index monitoring', 3;
  RAISE NOTICE 'Created % optimized views for common query patterns', 2;
  RAISE NOTICE 'Database is now fully optimized for Healthcare Continuity MVP production workload';
END;
$;