-- Additional Database Query Optimizations
-- This migration adds more advanced optimizations for better performance

-- 1. Add connection pooling configuration
-- Note: This would typically be configured at the database level, but we can add hints

-- 2. Create additional composite indexes for complex queries
-- Index for patient filtering by multiple criteria (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_patients_complex_filter ON patients(
  leakage_risk_level, 
  referral_status, 
  insurance, 
  leakage_risk_score DESC
) WHERE leakage_risk_level IN ('medium', 'high');

-- Index for provider matching with geographic and rating filters
CREATE INDEX IF NOT EXISTS idx_providers_geo_rating ON providers(
  latitude, 
  longitude, 
  rating DESC, 
  type
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND rating >= 3.0;

-- Index for referral tracking queries
CREATE INDEX IF NOT EXISTS idx_referrals_tracking ON referrals(
  status, 
  created_at DESC, 
  patient_id
) WHERE status IN ('pending', 'sent', 'scheduled');

-- 3. Add partial indexes for frequently accessed subsets
-- Index for active patients (not completed referrals)
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(
  leakage_risk_score DESC, 
  updated_at DESC
) WHERE referral_status != 'completed';

-- Index for available providers (with availability information)
CREATE INDEX IF NOT EXISTS idx_providers_available ON providers(
  availability_next, 
  rating DESC, 
  type
) WHERE availability_next IS NOT NULL AND availability_next != '';

-- Index for recent referrals (last 30 days)
CREATE INDEX IF NOT EXISTS idx_referrals_recent ON referrals(
  created_at DESC, 
  status, 
  patient_id
) WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');

-- 4. Create expression indexes for computed values
-- Index for age calculation (frequently used in risk scoring)
CREATE INDEX IF NOT EXISTS idx_patients_age ON patients(
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))
);

-- Index for days since discharge (frequently used in risk scoring)
CREATE INDEX IF NOT EXISTS idx_patients_days_since_discharge ON patients(
  EXTRACT(DAY FROM (CURRENT_DATE - discharge_date))
);

-- Index for provider distance calculations (using coordinates)
CREATE INDEX IF NOT EXISTS idx_providers_coordinates_hash ON providers(
  (latitude::text || ',' || longitude::text)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 5. Optimize array operations with better GIN indexes
-- Drop existing GIN indexes and recreate with better configuration
DROP INDEX IF EXISTS idx_providers_accepted_insurance_gin;
DROP INDEX IF EXISTS idx_providers_in_network_plans_gin;
DROP INDEX IF EXISTS idx_providers_specialties_gin;

-- Recreate with optimized GIN indexes using specific operators
CREATE INDEX idx_providers_accepted_insurance_gin ON providers 
USING gin(accepted_insurance gin__int_ops);

CREATE INDEX idx_providers_in_network_plans_gin ON providers 
USING gin(in_network_plans gin__int_ops);

CREATE INDEX idx_providers_specialties_gin ON providers 
USING gin(specialties gin__int_ops);

-- 6. Add BRIN indexes for time-series data (more memory efficient)
-- BRIN index for patient creation dates (good for time-based queries)
CREATE INDEX IF NOT EXISTS idx_patients_created_at_brin ON patients 
USING brin(created_at) WITH (pages_per_range = 128);

-- BRIN index for referral dates
CREATE INDEX IF NOT EXISTS idx_referrals_created_at_brin ON referrals 
USING brin(created_at) WITH (pages_per_range = 128);

-- 7. Create covering indexes to avoid table lookups
-- Covering index for patient list queries (includes all commonly accessed columns)
CREATE INDEX IF NOT EXISTS idx_patients_list_covering ON patients(
  leakage_risk_score DESC, 
  leakage_risk_level, 
  referral_status
) INCLUDE (id, name, diagnosis, insurance, discharge_date, required_followup);

-- Covering index for provider search queries
CREATE INDEX IF NOT EXISTS idx_providers_search_covering ON providers(
  rating DESC, 
  type
) INCLUDE (id, name, address, phone, specialties, accepted_insurance, latitude, longitude, availability_next);

-- 8. Add hash indexes for exact match queries
-- Hash index for patient ID lookups (faster than B-tree for equality)
CREATE INDEX IF NOT EXISTS idx_patients_id_hash ON patients USING hash(id);
CREATE INDEX IF NOT EXISTS idx_providers_id_hash ON providers USING hash(id);
CREATE INDEX IF NOT EXISTS idx_referrals_id_hash ON referrals USING hash(id);

-- 9. Optimize the materialized view with better indexing
-- Add more indexes to the materialized view for different query patterns
CREATE INDEX IF NOT EXISTS idx_provider_cache_composite ON provider_match_cache(
  rating_score DESC, 
  availability_score DESC, 
  type
);

CREATE INDEX IF NOT EXISTS idx_provider_cache_geo_rating ON provider_match_cache(
  latitude, 
  longitude, 
  rating_score DESC
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 10. Create a function for efficient distance-based provider search
CREATE OR REPLACE FUNCTION find_providers_within_distance(
  patient_lat DECIMAL(10,8),
  patient_lng DECIMAL(11,8),
  max_distance_miles INTEGER DEFAULT 25,
  min_rating DECIMAL(2,1) DEFAULT 0.0,
  provider_type TEXT DEFAULT NULL,
  insurance_plan TEXT DEFAULT NULL,
  limit_results INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  type TEXT,
  address TEXT,
  phone TEXT,
  rating DECIMAL(2,1),
  distance_miles DECIMAL(5,2),
  specialties TEXT[],
  accepted_insurance TEXT[],
  availability_next TEXT
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
    -- Calculate distance using Haversine formula
    ROUND(
      (3959 * acos(
        cos(radians(patient_lat)) * 
        cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(patient_lng)) + 
        sin(radians(patient_lat)) * 
        sin(radians(p.latitude))
      ))::DECIMAL, 2
    ) as distance_miles,
    p.specialties,
    p.accepted_insurance,
    p.availability_next
  FROM providers p
  WHERE 
    p.latitude IS NOT NULL 
    AND p.longitude IS NOT NULL
    AND p.rating >= min_rating
    AND (provider_type IS NULL OR p.type = provider_type)
    AND (insurance_plan IS NULL OR insurance_plan = ANY(p.accepted_insurance) OR insurance_plan = ANY(p.in_network_plans))
    -- Pre-filter using bounding box for performance
    AND p.latitude BETWEEN (patient_lat - (max_distance_miles / 69.0)) AND (patient_lat + (max_distance_miles / 69.0))
    AND p.longitude BETWEEN (patient_lng - (max_distance_miles / (69.0 * cos(radians(patient_lat))))) AND (patient_lng + (max_distance_miles / (69.0 * cos(radians(patient_lat)))))
  ORDER BY 
    -- Calculate distance for ordering
    (3959 * acos(
      cos(radians(patient_lat)) * 
      cos(radians(p.latitude)) * 
      cos(radians(p.longitude) - radians(patient_lng)) + 
      sin(radians(patient_lat)) * 
      sin(radians(p.latitude))
    )) ASC,
    p.rating DESC
  LIMIT limit_results;
END;
$ LANGUAGE plpgsql STABLE;

-- 11. Create a function for optimized patient risk scoring
CREATE OR REPLACE FUNCTION get_high_risk_patients(
  risk_threshold INTEGER DEFAULT 70,
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
  days_since_discharge INTEGER,
  age INTEGER,
  insurance TEXT,
  required_followup TEXT
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
    EXTRACT(DAY FROM (CURRENT_DATE - p.discharge_date))::INTEGER as days_since_discharge,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::INTEGER as age,
    p.insurance,
    p.required_followup
  FROM patients p
  WHERE 
    p.leakage_risk_score >= risk_threshold
    AND p.referral_status != 'completed'
  ORDER BY 
    p.leakage_risk_score DESC,
    p.discharge_date ASC
  LIMIT limit_results
  OFFSET offset_results;
END;
$ LANGUAGE plpgsql STABLE;

-- 12. Add query hints and configuration
-- Set work_mem for complex queries (this would typically be done at session level)
-- ALTER SYSTEM SET work_mem = '256MB';  -- Commented out as it requires superuser

-- 13. Create indexes for full-text search optimization
-- Better full-text search index for patients
DROP INDEX IF EXISTS idx_patients_search_gin;
CREATE INDEX idx_patients_search_gin ON patients 
USING gin(
  to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(diagnosis, '') || ' ' || 
    COALESCE(required_followup, '') || ' ' ||
    COALESCE(insurance, '')
  )
);

-- Full-text search index for providers
CREATE INDEX IF NOT EXISTS idx_providers_search_gin ON providers 
USING gin(
  to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(type, '') || ' ' || 
    COALESCE(address, '') || ' ' ||
    array_to_string(COALESCE(specialties, ARRAY[]::TEXT[]), ' ')
  )
);

-- 14. Add table statistics and maintenance
-- Update table statistics for better query planning
ALTER TABLE patients ALTER COLUMN leakage_risk_score SET STATISTICS 1000;
ALTER TABLE patients ALTER COLUMN leakage_risk_level SET STATISTICS 1000;
ALTER TABLE patients ALTER COLUMN referral_status SET STATISTICS 1000;
ALTER TABLE patients ALTER COLUMN insurance SET STATISTICS 1000;
ALTER TABLE patients ALTER COLUMN diagnosis SET STATISTICS 1000;

ALTER TABLE providers ALTER COLUMN rating SET STATISTICS 1000;
ALTER TABLE providers ALTER COLUMN type SET STATISTICS 1000;
ALTER TABLE providers ALTER COLUMN specialties SET STATISTICS 1000;
ALTER TABLE providers ALTER COLUMN accepted_insurance SET STATISTICS 1000;
ALTER TABLE providers ALTER COLUMN in_network_plans SET STATISTICS 1000;

-- 15. Create a maintenance function to keep statistics updated
CREATE OR REPLACE FUNCTION maintain_query_performance()
RETURNS void AS $
BEGIN
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW provider_match_cache;
  
  -- Update table statistics
  ANALYZE patients;
  ANALYZE providers;
  ANALYZE referrals;
  ANALYZE referral_history;
  
  -- Log maintenance completion
  RAISE NOTICE 'Query performance maintenance completed at %', NOW();
END;
$ LANGUAGE plpgsql;

-- 16. Add constraints to help query optimizer
-- Add NOT NULL constraints where appropriate to help query planning
ALTER TABLE patients ALTER COLUMN leakage_risk_score SET NOT NULL;
ALTER TABLE patients ALTER COLUMN leakage_risk_level SET NOT NULL;
ALTER TABLE patients ALTER COLUMN referral_status SET NOT NULL;

-- Add foreign key constraints for better join optimization
ALTER TABLE referrals ADD CONSTRAINT fk_referrals_patient 
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE referrals ADD CONSTRAINT fk_referrals_provider 
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;

-- 17. Final analysis to update all statistics
ANALYZE patients;
ANALYZE providers;
ANALYZE referrals;
ANALYZE referral_history;
ANALYZE provider_match_cache;

-- Add comments for documentation
COMMENT ON FUNCTION find_providers_within_distance IS 'Optimized function for geographic provider search with distance calculation';
COMMENT ON FUNCTION get_high_risk_patients IS 'Optimized function for retrieving high-risk patients with computed fields';
COMMENT ON FUNCTION maintain_query_performance IS 'Maintenance function to refresh caches and update statistics';

COMMENT ON INDEX idx_patients_complex_filter IS 'Composite index for complex patient filtering queries';
COMMENT ON INDEX idx_providers_geo_rating IS 'Geographic and rating composite index for provider matching';
COMMENT ON INDEX idx_patients_list_covering IS 'Covering index to avoid table lookups in patient list queries';
COMMENT ON INDEX idx_providers_search_covering IS 'Covering index to avoid table lookups in provider search queries';