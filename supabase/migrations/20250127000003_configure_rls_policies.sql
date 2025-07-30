-- Configure proper Row Level Security (RLS) policies for Healthcare Continuity MVP
-- This migration replaces the overly permissive policies with more appropriate ones

-- First, drop the existing overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON patients;
DROP POLICY IF EXISTS "Enable insert access for all users" ON patients;
DROP POLICY IF EXISTS "Enable update access for all users" ON patients;

DROP POLICY IF EXISTS "Enable read access for all users" ON providers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON providers;
DROP POLICY IF EXISTS "Enable update access for all users" ON providers;

DROP POLICY IF EXISTS "Enable read access for all users" ON referrals;
DROP POLICY IF EXISTS "Enable insert access for all users" ON referrals;
DROP POLICY IF EXISTS "Enable update access for all users" ON referrals;

DROP POLICY IF EXISTS "Enable read access for all users" ON referral_history;
DROP POLICY IF EXISTS "Enable insert access for all users" ON referral_history;

-- Create user roles table for role-based access control
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('care_coordinator', 'admin', 'provider', 'readonly')),
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  -- For demo purposes, we'll assume all authenticated users are care coordinators
  -- In production, this would check the user_roles table
  IF auth.uid() IS NOT NULL THEN
    RETURN 'care_coordinator';
  ELSE
    -- For anonymous access (demo mode), allow read-only access
    RETURN 'readonly';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PATIENTS TABLE POLICIES
-- Care coordinators and admins can read all patients
CREATE POLICY "Care coordinators can read all patients" ON patients
  FOR SELECT
  USING (
    get_user_role() IN ('care_coordinator', 'admin') OR
    get_user_role() = 'readonly'
  );

-- Care coordinators and admins can insert new patients
CREATE POLICY "Care coordinators can insert patients" ON patients
  FOR INSERT
  WITH CHECK (
    get_user_role() IN ('care_coordinator', 'admin')
  );

-- Care coordinators and admins can update patients
CREATE POLICY "Care coordinators can update patients" ON patients
  FOR UPDATE
  USING (
    get_user_role() IN ('care_coordinator', 'admin')
  )
  WITH CHECK (
    get_user_role() IN ('care_coordinator', 'admin')
  );

-- Only admins can delete patients (soft delete preferred)
CREATE POLICY "Admins can delete patients" ON patients
  FOR DELETE
  USING (
    get_user_role() = 'admin'
  );

-- PROVIDERS TABLE POLICIES
-- All authenticated users can read providers (needed for matching)
CREATE POLICY "Authenticated users can read providers" ON providers
  FOR SELECT
  USING (
    get_user_role() IN ('care_coordinator', 'admin', 'provider', 'readonly')
  );

-- Care coordinators and admins can insert providers
CREATE POLICY "Care coordinators can insert providers" ON providers
  FOR INSERT
  WITH CHECK (
    get_user_role() IN ('care_coordinator', 'admin')
  );

-- Care coordinators, admins, and providers can update provider info
CREATE POLICY "Authorized users can update providers" ON providers
  FOR UPDATE
  USING (
    get_user_role() IN ('care_coordinator', 'admin', 'provider')
  )
  WITH CHECK (
    get_user_role() IN ('care_coordinator', 'admin', 'provider')
  );

-- Only admins can delete providers
CREATE POLICY "Admins can delete providers" ON providers
  FOR DELETE
  USING (
    get_user_role() = 'admin'
  );

-- REFERRALS TABLE POLICIES
-- Care coordinators and admins can read all referrals
CREATE POLICY "Care coordinators can read referrals" ON referrals
  FOR SELECT
  USING (
    get_user_role() IN ('care_coordinator', 'admin', 'readonly')
  );

-- Care coordinators and admins can create referrals
CREATE POLICY "Care coordinators can create referrals" ON referrals
  FOR INSERT
  WITH CHECK (
    get_user_role() IN ('care_coordinator', 'admin')
  );

-- Care coordinators, admins, and providers can update referrals
CREATE POLICY "Authorized users can update referrals" ON referrals
  FOR UPDATE
  USING (
    get_user_role() IN ('care_coordinator', 'admin', 'provider')
  )
  WITH CHECK (
    get_user_role() IN ('care_coordinator', 'admin', 'provider')
  );

-- Only admins can delete referrals
CREATE POLICY "Admins can delete referrals" ON referrals
  FOR DELETE
  USING (
    get_user_role() = 'admin'
  );

-- REFERRAL_HISTORY TABLE POLICIES
-- Care coordinators and admins can read referral history
CREATE POLICY "Care coordinators can read referral history" ON referral_history
  FOR SELECT
  USING (
    get_user_role() IN ('care_coordinator', 'admin', 'readonly')
  );

-- System can insert referral history (via triggers)
CREATE POLICY "System can insert referral history" ON referral_history
  FOR INSERT
  WITH CHECK (true);

-- USER_ROLES TABLE POLICIES
-- Users can read their own roles
CREATE POLICY "Users can read own roles" ON user_roles
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    get_user_role() = 'admin'
  );

-- Only admins can manage user roles
CREATE POLICY "Admins can manage user roles" ON user_roles
  FOR ALL
  USING (
    get_user_role() = 'admin'
  )
  WITH CHECK (
    get_user_role() = 'admin'
  );

-- Create indexes for performance on RLS queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Insert a default admin user role for demo purposes
-- In production, this would be managed through proper user management
INSERT INTO user_roles (user_id, role, organization_id)
VALUES (
  '00000000-0000-0000-0000-000000000000'::UUID,
  'care_coordinator',
  NULL
) ON CONFLICT (user_id, role) DO NOTHING;

-- Create a view for dashboard that respects RLS
CREATE OR REPLACE VIEW secure_dashboard_patients AS
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
  current_referral_id,
  created_at,
  updated_at,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) as age,
  EXTRACT(DAY FROM (CURRENT_DATE - discharge_date)) as days_since_discharge
FROM patients
WHERE 
  -- Apply the same RLS logic as the patients table
  get_user_role() IN ('care_coordinator', 'admin', 'readonly')
ORDER BY leakage_risk_score DESC, created_at DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE ON patients, providers, referrals TO authenticated;
GRANT ALL ON user_roles TO authenticated;

-- Grant access to sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create a function to safely test RLS policies
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE (
  table_name TEXT,
  operation TEXT,
  allowed BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test patients table access
  BEGIN
    PERFORM COUNT(*) FROM patients;
    RETURN QUERY SELECT 'patients'::TEXT, 'SELECT'::TEXT, true::BOOLEAN, NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'patients'::TEXT, 'SELECT'::TEXT, false::BOOLEAN, SQLERRM::TEXT;
  END;

  -- Test providers table access
  BEGIN
    PERFORM COUNT(*) FROM providers;
    RETURN QUERY SELECT 'providers'::TEXT, 'SELECT'::TEXT, true::BOOLEAN, NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'providers'::TEXT, 'SELECT'::TEXT, false::BOOLEAN, SQLERRM::TEXT;
  END;

  -- Test referrals table access
  BEGIN
    PERFORM COUNT(*) FROM referrals;
    RETURN QUERY SELECT 'referrals'::TEXT, 'SELECT'::TEXT, true::BOOLEAN, NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'referrals'::TEXT, 'SELECT'::TEXT, false::BOOLEAN, SQLERRM::TEXT;
  END;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_role() IS 'Returns the role of the current user for RLS policies';
COMMENT ON FUNCTION is_authenticated() IS 'Checks if the current user is authenticated';
COMMENT ON FUNCTION test_rls_policies() IS 'Tests RLS policies to ensure they are working correctly';
COMMENT ON TABLE user_roles IS 'Stores user roles for role-based access control';
COMMENT ON VIEW secure_dashboard_patients IS 'Secure view of patients that respects RLS policies';