-- Final Performance Indexes Migration
-- This migration adds the remaining performance optimizations for the Healthcare Continuity MVP
-- Based on analysis of application query patterns and usage

-- 1. Add missing indexes for referral workflow optimization
-- Index for referral status transitions (frequently updated)
CREATE INDEX IF NOT EXISTS idx_referrals_status_updated ON referrals(status, updated_at DESC)
WHERE status IN ('pending', 'sent', 'scheduled');

-- Index for referral completion tracking
CREATE INDEX IF NOT EXISTS idx_referrals_completion_tracking ON referrals(
  patient_id, 
  status, 
  completed_date DESC
) WHERE status = 'completed' AND completed_date IS NOT NULL;

-- Index for active referral lookup (used in patient detail views)
CREATE INDEX IF NOT EXISTS idx_referrals_active_lookup ON referrals(
  patient_id, 
  status, 
  created_at DESC
) WHERE status NOT IN ('completed', 'cancelled');

-- 2. Add indexes for patient dashboard optimizations
-- Index for patient risk level filtering with referral status
CREATE INDEX IF NOT EXISTS idx_patients_risk_referral_composite ON patients(
  leakage_risk_level, 
  referral_status, 
  leakage_risk_score DESC, 
  updated_at DESC
) WHERE leakage_risk_level IN ('medium', 'high');

-- Index for patient search with insurance filtering
CREATE INDEX IF NOT EXISTS idx_patients_search_insurance ON patients(
  insurance, 
  leakage_risk_score DESC
) INCLUDE (name, diagnosis, required_followup, referral_status);

-- Index for recent patient activity (last 30 days)
CREATE INDEX IF NOT EXISTS idx_patients_recent_activity ON patients(
  updated_at DESC, 
  leakage_risk_level, 
  referral_status
) WHERE updated_at >= (CURRENT_DATE - INTERVAL '30 days');

-- 3. Add indexes for provider matching optimizations
-- Index for provider availability with rating (critical for matching)
CREATE INDEX IF NOT EXISTS idx_providers_availability_rating ON providers(
  availability_next, 
  rating DESC, 
  type
) WHERE availability_next IS NOT NULL 
  AND availability_next != '' 
  AND rating >= 3.0;

-- Index for provider network matching (insurance-specific)
CREATE INDEX IF NOT EXISTS idx_providers_network_type ON providers(
  type, 
  rating DESC
) WHERE array_length(accepted_insurance, 1) > 0 
  OR array_length(in_network_plans, 1) > 0;

-- Index for geographic provider queries with specialty
CREATE INDEX IF NOT EXISTS idx_providers_geo_specialty ON providers(
  latitude, 
  longitude, 
  rating DESC
) WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND array_length(specialties, 1) > 0;

-- 4. Add indexes for referral history tracking
-- Index for referral history timeline queries
CREATE INDEX IF NOT EXISTS idx_referral_history_timeline ON referral_history(
  referral_id, 
  created_at ASC, 
  status
);

-- Index for referral history by status changes
CREATE INDEX IF NOT EXISTS idx_referral_history_status_changes ON referral_history(
  status, 
  created_at DESC, 
  referral_id
);

-- 5. Add partial indexes for high-performance queries
-- Index for urgent patients (high risk + recent discharge)
CREATE INDEX IF NOT EXISTS idx_patients_urgent ON patients(
  leakage_risk_score DESC, 
  discharge_date DESC, 
  referral_status
) WHERE leakage_risk_level = 'high' 
  AND referral_status IN ('needed', 'sent') 
  AND discharge_date >= (CURRENT_DATE - INTERVAL '7 days');

-- Index for top-rated available providers
CREATE INDEX IF NOT EXISTS idx_providers_top_available ON providers(
  rating DESC, 
  type, 
  availability_next
) WHERE rating >= 4.0 
  AND availability_next IS NOT NULL 
  AND availability_next != '';

-- Index for in-network providers by specialty
CREATE INDEX IF NOT EXISTS idx_providers_in_network_specialty ON providers USING gin(
  specialties, 
  in_network_plans
) WHERE array_length(in_network_plans, 1) > 0;

-- 6. Add expression indexes for computed values
-- Index for patient age calculation (frequently used in risk scoring)
CREATE INDEX IF NOT EXISTS idx_patients_computed_age ON patients(
  (EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))), 
  leakage_risk_score DESC
);

-- Index for days since discharge (frequently used in risk scoring)
CREATE INDEX IF NOT EXISTS idx_patients_computed_days_since_discharge ON patients(
  (EXTRACT(DAY FROM (CURRENT_DATE - discharge_date))), 
  leakage_risk_level, 
  referral_status
);

-- Index for provider distance calculations (using string concatenation for coordinates)
CREATE INDEX IF NOT EXISTS idx_providers_coordinate_string ON providers(
  (latitude::text || ',' || longitude::text), 
  rating DESC
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 7. Add covering indexes to reduce table lookups
-- Covering index for patient list with all commonly accessed fields
CREATE INDEX IF NOT EXISTS idx_patients_dashboard_covering ON patients(
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
  current_referral_id
);

-- Covering index for provider matching with all needed fields
CREATE INDEX IF NOT EXISTS idx_providers_matching_covering ON providers(
  rating DESC, 
  type, 
  latitude, 
  longitude
) INCLUDE (
  id, 
  name, 
  address, 
  phone, 
  specialties, 
  accepted_insurance, 
  in_network_plans, 
  availability_next
);

-- 8. Add hash indexes for exact lookups (faster than B-tree for equality)
-- Hash index for current referral lookups
CREATE INDEX IF NOT EXISTS idx_patients_current_referral_hash ON patients USING hash(current_referral_id)
WHERE current_referral_id IS NOT NULL;

-- Hash index for referral patient lookups
CREATE INDEX IF NOT EXISTS idx_referrals_patient_hash ON referrals USING hash(patient_id);

-- Hash index for referral provider lookups
CREATE INDEX IF NOT EXISTS idx_referrals_provider_hash ON referrals USING hash(provider_id);

-- 9. Add BRIN indexes for time-series data (memory efficient for large tables)
-- BRIN index for patient updates (efficient for time-based queries)
CREATE INDEX IF NOT EXISTS idx_patients_updated_at_brin ON patients 
USING brin(updated_at) WITH (pages_per_range = 64);

-- BRIN index for referral creation dates
CREATE INDEX IF NOT EXISTS idx_referrals_created_at_brin ON referrals 
USING brin(created_at) WITH (pages_per_range = 64);

-- BRIN index for referral history timestamps
CREATE INDEX IF NOT EXISTS idx_referral_history_created_at_brin ON referral_history 
USING brin(created_at) WITH (pages_per_range = 64);

-- 10. Optimize existing indexes by adding WHERE clauses for better selectivity
-- Drop and recreate some indexes with better filtering
DROP INDEX IF EXISTS idx_patients_leakage_risk_score_covering;
CREATE INDEX idx_patients_leakage_risk_score_covering ON patients(
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
  discharge_date
) WHERE leakage_risk_score > 0; -- Only index patients with calculated risk scores

-- Recreate provider rating index with better filtering
DROP INDEX IF EXISTS idx_providers_rating_covering;
CREATE INDEX idx_providers_rating_covering ON providers(
  rating DESC, 
  type, 
  availability_next
) INCLUDE (
  id, 
  name, 
  address, 
  phone, 
  specialties, 
  accepted_insurance, 
  in_network_plans, 
  latitude, 
  longitude
) WHERE rating > 0.0; -- Only index providers with ratings

-- 11. Add specialized indexes for full-text search optimization
-- Enhanced full-text search index for patients with better configuration
DROP INDEX IF EXISTS idx_patients_search_gin;
CREATE INDEX idx_patients_search_gin ON patients 
USING gin(
  to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(diagnosis, '') || ' ' || 
    COALESCE(required_followup, '') || ' ' ||
    COALESCE(insurance, '') || ' ' ||
    COALESCE(address, '')
  )
) WITH (fastupdate = on, gin_pending_list_limit = 4096);

-- Enhanced full-text search index for providers with better configuration
DROP INDEX IF EXISTS idx_providers_search_gin;
CREATE INDEX idx_providers_search_gin ON providers 
USING gin(
  to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(type, '') || ' ' || 
    COALESCE(address, '') || ' ' ||
    array_to_string(COALESCE(specialties, ARRAY[]::TEXT[]), ' ')
  )
) WITH (fastupdate = on, gin_pending_list_limit = 4096);

-- 12. Add constraints to help query optimizer
-- Add check constraints for better query planning
ALTER TABLE patients ADD CONSTRAINT chk_patients_current_referral_valid 
CHECK (current_referral_id IS NULL OR current_referral_id != '00000000-0000-0000-0000-000000000000'::uuid);

ALTER TABLE referrals ADD CONSTRAINT chk_referrals_dates_logical 
CHECK (
  scheduled_date IS NULL OR scheduled_date >= created_at
) NOT VALID; -- NOT VALID to avoid checking existing data

ALTER TABLE referrals ADD CONSTRAINT chk_referrals_completed_date_logical 
CHECK (
  completed_date IS NULL OR 
  (completed_date >= created_at AND (scheduled_date IS NULL OR completed_date >= scheduled_date))
) NOT VALID; -- NOT VALID to avoid checking existing data

-- 13. Update statistics targets for better query planning
-- Increase statistics for frequently queried columns
ALTER TABLE patients ALTER COLUMN name SET STATISTICS 1000;
ALTER TABLE patients ALTER COLUMN diagnosis SET STATISTICS 1000;
ALTER TABLE patients ALTER COLUMN required_followup SET STATISTICS 1000;
ALTER TABLE patients ALTER COLUMN address SET STATISTICS 500;

ALTER TABLE providers ALTER COLUMN name SET STATISTICS 1000;
ALTER TABLE providers ALTER COLUMN address SET STATISTICS 500;
ALTER TABLE providers ALTER COLUMN availability_next SET STATISTICS 1000;

ALTER TABLE referrals ALTER COLUMN service_type SET STATISTICS 1000;
ALTER TABLE referrals ALTER COLUMN notes SET STATISTICS 500;

-- 14. Create optimized functions for common query patterns
-- Function for efficient patient dashboard queries
CREATE OR REPLACE FUNCTION get_dashboard_patients(
  risk_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  insurance_filter TEXT DEFAULT NULL,
  search_term TEXT DEFAULT NULL,
  limit_results INTEGER DEFAULT 50,
  offset_results INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  diagnosis TEXT,
  leakage_risk_score INTEGER,
  leakage_risk_level TEXT,
  referral_status TEXT,
  insurance TEXT,
  required_followup TEXT,
  discharge_date DATE,
  current_referral_id UUID,
  age INTEGER,
  days_since_discharge INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.diagnosis,
    p.leakage_risk_score,
    p.leakage_risk_level,
    p.referral_status,
    p.insurance,
    p.required_followup,
    p.discharge_date,
    p.current_referral_id,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::INTEGER as age,
    EXTRACT(DAY FROM (CURRENT_DATE - p.discharge_date))::INTEGER as days_since_discharge,
    p.updated_at
  FROM patients p
  WHERE 
    (risk_filter IS NULL OR p.leakage_risk_level = risk_filter)
    AND (status_filter IS NULL OR p.referral_status = status_filter)
    AND (insurance_filter IS NULL OR p.insurance = insurance_filter)
    AND (search_term IS NULL OR (
      p.name ILIKE '%' || search_term || '%' OR
      p.diagnosis ILIKE '%' || search_term || '%' OR
      p.required_followup ILIKE '%' || search_term || '%'
    ))
  ORDER BY 
    p.leakage_risk_score DESC,
    p.updated_at DESC
  LIMIT limit_results
  OFFSET offset_results;
END;
$ LANGUAGE plpgsql STABLE;

-- Function for efficient provider search with multiple criteria
CREATE OR REPLACE FUNCTION search_providers_advanced(
  specialty_filter TEXT DEFAULT NULL,
  insurance_filter TEXT DEFAULT NULL,
  min_rating DECIMAL(2,1) DEFAULT 0.0,
  has_availability BOOLEAN DEFAULT NULL,
  patient_lat DECIMAL(10,8) DEFAULT NULL,
  patient_lng DECIMAL(11,8) DEFAULT NULL,
  max_distance_miles INTEGER DEFAULT NULL,
  limit_results INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  type TEXT,
  address TEXT,
  phone TEXT,
  rating DECIMAL(2,1),
  specialties TEXT[],
  accepted_insurance TEXT[],
  in_network_plans TEXT[],
  availability_next TEXT,
  distance_miles DECIMAL(5,2)
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.type,
    p.address,
    p.phone,
    p.rating,
    p.specialties,
    p.accepted_insurance,
    p.in_network_plans,
    p.availability_next,
    CASE 
      WHEN patient_lat IS NOT NULL AND patient_lng IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        ROUND(
          (3959 * acos(
            cos(radians(patient_lat)) * 
            cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(patient_lng)) + 
            sin(radians(patient_lat)) * 
            sin(radians(p.latitude))
          ))::DECIMAL, 2
        )
      ELSE NULL
    END as distance_miles
  FROM providers p
  WHERE 
    p.rating >= min_rating
    AND (specialty_filter IS NULL OR specialty_filter = ANY(p.specialties))
    AND (insurance_filter IS NULL OR (
      insurance_filter = ANY(p.accepted_insurance) OR 
      insurance_filter = ANY(p.in_network_plans)
    ))
    AND (has_availability IS NULL OR (
      has_availability = true AND p.availability_next IS NOT NULL AND p.availability_next != ''
    ) OR (
      has_availability = false
    ))
    -- Geographic filtering using bounding box for performance
    AND (patient_lat IS NULL OR patient_lng IS NULL OR max_distance_miles IS NULL OR (
      p.latitude IS NOT NULL AND p.longitude IS NOT NULL AND
      p.latitude BETWEEN (patient_lat - (max_distance_miles / 69.0)) AND (patient_lat + (max_distance_miles / 69.0)) AND
      p.longitude BETWEEN (patient_lng - (max_distance_miles / (69.0 * cos(radians(patient_lat))))) AND (patient_lng + (max_distance_miles / (69.0 * cos(radians(patient_lat)))))
    ))
  ORDER BY 
    CASE 
      WHEN patient_lat IS NOT NULL AND patient_lng IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        (3959 * acos(
          cos(radians(patient_lat)) * 
          cos(radians(p.latitude)) * 
          cos(radians(p.longitude) - radians(patient_lng)) + 
          sin(radians(patient_lat)) * 
          sin(radians(p.latitude))
        ))
      ELSE 999999
    END ASC,
    p.rating DESC
  LIMIT limit_results;
END;
$ LANGUAGE plpgsql STABLE;

-- 15. Create maintenance function for index optimization
CREATE OR REPLACE FUNCTION optimize_database_indexes()
RETURNS TABLE(
  operation TEXT,
  table_name TEXT,
  index_name TEXT,
  status TEXT,
  details TEXT
) AS $
DECLARE
  rec RECORD;
BEGIN
  -- Reindex all indexes on patients table
  FOR rec IN SELECT indexname FROM pg_indexes WHERE tablename = 'patients' LOOP
    BEGIN
      EXECUTE 'REINDEX INDEX CONCURRENTLY ' || rec.indexname;
      RETURN QUERY SELECT 'REINDEX'::TEXT, 'patients'::TEXT, rec.indexname, 'SUCCESS'::TEXT, 'Index rebuilt successfully'::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'REINDEX'::TEXT, 'patients'::TEXT, rec.indexname, 'ERROR'::TEXT, SQLERRM;
    END;
  END LOOP;

  -- Reindex all indexes on providers table
  FOR rec IN SELECT indexname FROM pg_indexes WHERE tablename = 'providers' LOOP
    BEGIN
      EXECUTE 'REINDEX INDEX CONCURRENTLY ' || rec.indexname;
      RETURN QUERY SELECT 'REINDEX'::TEXT, 'providers'::TEXT, rec.indexname, 'SUCCESS'::TEXT, 'Index rebuilt successfully'::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'REINDEX'::TEXT, 'providers'::TEXT, rec.indexname, 'ERROR'::TEXT, SQLERRM;
    END;
  END LOOP;

  -- Reindex all indexes on referrals table
  FOR rec IN SELECT indexname FROM pg_indexes WHERE tablename = 'referrals' LOOP
    BEGIN
      EXECUTE 'REINDEX INDEX CONCURRENTLY ' || rec.indexname;
      RETURN QUERY SELECT 'REINDEX'::TEXT, 'referrals'::TEXT, rec.indexname, 'SUCCESS'::TEXT, 'Index rebuilt successfully'::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'REINDEX'::TEXT, 'referrals'::TEXT, rec.indexname, 'ERROR'::TEXT, SQLERRM;
    END;
  END LOOP;

  -- Update table statistics
  ANALYZE patients;
  RETURN QUERY SELECT 'ANALYZE'::TEXT, 'patients'::TEXT, ''::TEXT, 'SUCCESS'::TEXT, 'Table statistics updated'::TEXT;

  ANALYZE providers;
  RETURN QUERY SELECT 'ANALYZE'::TEXT, 'providers'::TEXT, ''::TEXT, 'SUCCESS'::TEXT, 'Table statistics updated'::TEXT;

  ANALYZE referrals;
  RETURN QUERY SELECT 'ANALYZE'::TEXT, 'referrals'::TEXT, ''::TEXT, 'SUCCESS'::TEXT, 'Table statistics updated'::TEXT;

  ANALYZE referral_history;
  RETURN QUERY SELECT 'ANALYZE'::TEXT, 'referral_history'::TEXT, ''::TEXT, 'SUCCESS'::TEXT, 'Table statistics updated'::TEXT;

  -- Refresh materialized view if it exists
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY provider_match_cache;
    RETURN QUERY SELECT 'REFRESH_VIEW'::TEXT, 'provider_match_cache'::TEXT, ''::TEXT, 'SUCCESS'::TEXT, 'Materialized view refreshed'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'REFRESH_VIEW'::TEXT, 'provider_match_cache'::TEXT, ''::TEXT, 'ERROR'::TEXT, SQLERRM;
  END;

  RETURN QUERY SELECT 'COMPLETE'::TEXT, ''::TEXT, ''::TEXT, 'SUCCESS'::TEXT, 'Database optimization completed'::TEXT;
END;
$ LANGUAGE plpgsql;

-- 16. Final analysis to update all statistics with new indexes
ANALYZE patients;
ANALYZE providers;
ANALYZE referrals;
ANALYZE referral_history;

-- Try to analyze materialized view if it exists
DO $
BEGIN
  BEGIN
    ANALYZE provider_match_cache;
  EXCEPTION WHEN undefined_table THEN
    -- Materialized view doesn't exist, skip
    NULL;
  END;
END;
$;

-- 17. Add comments for documentation
COMMENT ON INDEX idx_referrals_status_updated IS 'Optimized index for referral status transitions and updates';
COMMENT ON INDEX idx_patients_risk_referral_composite IS 'Composite index for patient dashboard filtering by risk and referral status';
COMMENT ON INDEX idx_providers_availability_rating IS 'Critical index for provider matching by availability and rating';
COMMENT ON INDEX idx_patients_dashboard_covering IS 'Covering index to avoid table lookups in patient dashboard queries';
COMMENT ON INDEX idx_providers_matching_covering IS 'Covering index to avoid table lookups in provider matching queries';

COMMENT ON FUNCTION get_dashboard_patients IS 'Optimized function for patient dashboard queries with filtering and pagination';
COMMENT ON FUNCTION search_providers_advanced IS 'Advanced provider search function with multiple criteria and geographic filtering';
COMMENT ON FUNCTION optimize_database_indexes IS 'Maintenance function to rebuild indexes and update statistics for optimal performance';

-- Log completion
DO $
BEGIN
  RAISE NOTICE 'Final performance indexes migration completed successfully at %', NOW();
  RAISE NOTICE 'Added % new indexes for optimal query performance', 25;
  RAISE NOTICE 'Created % optimized database functions', 3;
  RAISE NOTICE 'Database is now fully optimized for Healthcare Continuity MVP workload';
END;
$;