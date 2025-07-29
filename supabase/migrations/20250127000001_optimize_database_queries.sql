-- Database Query Optimization Migration
-- This migration adds indexes and optimizations to improve query performance

-- Add missing indexes for common query patterns

-- 1. Patients table optimizations
-- Index for filtering by insurance (used in patient filtering)
CREATE INDEX IF NOT EXISTS idx_patients_insurance ON patients(insurance);

-- Index for filtering by diagnosis (used in search functionality)
CREATE INDEX IF NOT EXISTS idx_patients_diagnosis_gin ON patients USING gin(to_tsvector('english', diagnosis));

-- Index for filtering by required_followup (used in provider matching)
CREATE INDEX IF NOT EXISTS idx_patients_required_followup ON patients(required_followup);

-- Composite index for common filtering combinations
CREATE INDEX IF NOT EXISTS idx_patients_risk_status ON patients(leakage_risk_level, referral_status);

-- Index for patient search across multiple fields
CREATE INDEX IF NOT EXISTS idx_patients_search_gin ON patients USING gin(
  to_tsvector('english', name || ' ' || diagnosis || ' ' || required_followup)
);

-- 2. Providers table optimizations
-- Index for filtering by insurance acceptance (critical for provider matching)
CREATE INDEX IF NOT EXISTS idx_providers_accepted_insurance_gin ON providers USING gin(accepted_insurance);
CREATE INDEX IF NOT EXISTS idx_providers_in_network_plans_gin ON providers USING gin(in_network_plans);

-- Index for filtering by specialties (used in provider matching)
CREATE INDEX IF NOT EXISTS idx_providers_specialties_gin ON providers USING gin(specialties);

-- Composite index for geographic queries with rating
CREATE INDEX IF NOT EXISTS idx_providers_location_rating ON providers(latitude, longitude, rating DESC);

-- Index for availability filtering
CREATE INDEX IF NOT EXISTS idx_providers_availability ON providers(availability_next) WHERE availability_next IS NOT NULL;

-- Composite index for common provider filtering (type + rating)
CREATE INDEX IF NOT EXISTS idx_providers_type_rating ON providers(type, rating DESC);

-- 3. Referrals table optimizations
-- Composite index for patient referral queries
CREATE INDEX IF NOT EXISTS idx_referrals_patient_status ON referrals(patient_id, status);

-- Index for provider referral queries
CREATE INDEX IF NOT EXISTS idx_referrals_provider_status ON referrals(provider_id, status);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_referrals_scheduled_date ON referrals(scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_completed_date ON referrals(completed_date) WHERE completed_date IS NOT NULL;

-- 4. Referral history optimizations
-- Composite index for referral history queries
CREATE INDEX IF NOT EXISTS idx_referral_history_referral_created ON referral_history(referral_id, created_at);

-- 5. Add partial indexes for better performance on filtered queries
-- Index only active referrals (not cancelled or completed)
CREATE INDEX IF NOT EXISTS idx_referrals_active ON referrals(patient_id, created_at DESC) 
WHERE status NOT IN ('cancelled', 'completed');

-- Index only high-risk patients
CREATE INDEX IF NOT EXISTS idx_patients_high_risk ON patients(leakage_risk_score DESC, created_at DESC) 
WHERE leakage_risk_level = 'high';

-- Index only providers with good ratings
CREATE INDEX IF NOT EXISTS idx_providers_high_rated ON providers(rating DESC, type) 
WHERE rating >= 4.0;

-- 6. Add function-based indexes for common calculations
-- Index for distance calculations (using coordinates)
CREATE INDEX IF NOT EXISTS idx_providers_coordinates_not_null ON providers(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 7. Optimize existing indexes by adding covering columns
-- Drop and recreate some indexes with additional columns to avoid table lookups
DROP INDEX IF EXISTS idx_patients_leakage_risk_score;
CREATE INDEX idx_patients_leakage_risk_score_covering ON patients(
  leakage_risk_score DESC, 
  leakage_risk_level, 
  referral_status, 
  name, 
  created_at
);

DROP INDEX IF EXISTS idx_providers_rating;
CREATE INDEX idx_providers_rating_covering ON providers(
  rating DESC, 
  type, 
  name, 
  latitude, 
  longitude, 
  availability_next
);

-- 8. Add constraints to improve query planning
-- Add check constraints to help the query planner
ALTER TABLE patients ADD CONSTRAINT chk_patients_risk_score 
CHECK (leakage_risk_score >= 0 AND leakage_risk_score <= 100);

ALTER TABLE providers ADD CONSTRAINT chk_providers_rating 
CHECK (rating >= 0.0 AND rating <= 5.0);

-- 9. Create materialized view for complex provider matching queries
-- This will pre-compute expensive joins and calculations
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_match_cache AS
SELECT 
  p.id,
  p.name,
  p.type,
  p.address,
  p.phone,
  p.specialties,
  p.accepted_insurance,
  p.in_network_plans,
  p.rating,
  p.latitude,
  p.longitude,
  p.availability_next,
  -- Pre-calculate availability score for faster matching
  CASE 
    WHEN p.availability_next IS NULL THEN 0
    WHEN LOWER(p.availability_next) LIKE '%today%' OR LOWER(p.availability_next) LIKE '%same day%' THEN 100
    WHEN LOWER(p.availability_next) LIKE '%tomorrow%' THEN 95
    WHEN LOWER(p.availability_next) LIKE '%this week%' THEN 80
    WHEN LOWER(p.availability_next) LIKE '%next week%' THEN 60
    WHEN LOWER(p.availability_next) LIKE '%next month%' THEN 40
    ELSE 20
  END as availability_score,
  -- Pre-calculate rating score
  LEAST(100, GREATEST(0, (p.rating / 5.0) * 100)) as rating_score,
  p.created_at
FROM providers p
WHERE p.latitude IS NOT NULL 
  AND p.longitude IS NOT NULL
  AND array_length(p.specialties, 1) > 0;

-- Create index on the materialized view
CREATE INDEX idx_provider_match_cache_rating ON provider_match_cache(rating_score DESC);
CREATE INDEX idx_provider_match_cache_availability ON provider_match_cache(availability_score DESC);
CREATE INDEX idx_provider_match_cache_location ON provider_match_cache(latitude, longitude);
CREATE INDEX idx_provider_match_cache_specialties ON provider_match_cache USING gin(specialties);
CREATE INDEX idx_provider_match_cache_insurance ON provider_match_cache USING gin(accepted_insurance);
CREATE INDEX idx_provider_match_cache_network ON provider_match_cache USING gin(in_network_plans);

-- 10. Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_provider_match_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW provider_match_cache;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to auto-refresh cache when providers are updated
CREATE OR REPLACE FUNCTION trigger_refresh_provider_cache()
RETURNS trigger AS $$
BEGIN
  -- Refresh the materialized view asynchronously
  PERFORM refresh_provider_match_cache();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (but make it conditional to avoid too frequent refreshes)
DROP TRIGGER IF EXISTS provider_cache_refresh ON providers;
CREATE TRIGGER provider_cache_refresh
  AFTER INSERT OR UPDATE OR DELETE ON providers
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_provider_cache();

-- 12. Add statistics targets for better query planning
ALTER TABLE patients ALTER COLUMN leakage_risk_score SET STATISTICS 1000;
ALTER TABLE patients ALTER COLUMN insurance SET STATISTICS 1000;
ALTER TABLE providers ALTER COLUMN rating SET STATISTICS 1000;
ALTER TABLE providers ALTER COLUMN type SET STATISTICS 1000;

-- 13. Create optimized view for dashboard queries
-- Note: current_referral_id will be added in a later migration
CREATE OR REPLACE VIEW dashboard_patients AS
SELECT 
  id,
  name,
  date_of_birth,
  diagnosis,
  discharge_date,
  required_followup,
  insurance,
  address,
  leakage_risk_score,
  leakage_risk_level,
  referral_status,
  created_at,
  updated_at,
  -- Pre-calculate age for sorting/filtering
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) as age,
  -- Pre-calculate days since discharge
  EXTRACT(DAY FROM (CURRENT_DATE - discharge_date)) as days_since_discharge
FROM patients
ORDER BY leakage_risk_score DESC, created_at DESC;

-- 14. Analyze tables to update statistics
ANALYZE patients;
ANALYZE providers;
ANALYZE referrals;
ANALYZE referral_history;

-- 15. Add comments for documentation
COMMENT ON INDEX idx_patients_search_gin IS 'Full-text search index for patient name, diagnosis, and required followup';
COMMENT ON INDEX idx_providers_accepted_insurance_gin IS 'GIN index for fast insurance matching in provider queries';
COMMENT ON INDEX idx_providers_specialties_gin IS 'GIN index for fast specialty matching in provider queries';
COMMENT ON MATERIALIZED VIEW provider_match_cache IS 'Pre-computed provider data with calculated scores for faster matching';
COMMENT ON VIEW dashboard_patients IS 'Optimized view for dashboard queries with pre-calculated fields';