# Missing Tables Fix

## Issues

### 1. Missing Tables

You're seeing errors like `relation "public.referrals" does not exist` because the Supabase database is missing some required tables.

### 2. Patient Data Error

You might also see errors like `TypeError: Cannot read properties of undefined (reading 'score')` when loading patient data. This has been fixed by using the synchronous version of the risk calculation function.

## Solution

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the SQL from the `scripts/create-tables.sql` file
4. Run the SQL to create the missing tables
5. Refresh your application

## SQL to Create Missing Tables

```sql
-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  provider_id UUID NOT NULL REFERENCES public.providers(id),
  service_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'scheduled', 'completed', 'cancelled')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral_history table
CREATE TABLE IF NOT EXISTS public.referral_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id),
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS referrals_patient_id_idx ON public.referrals (patient_id);
CREATE INDEX IF NOT EXISTS referrals_provider_id_idx ON public.referrals (provider_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON public.referrals (status);
CREATE INDEX IF NOT EXISTS referral_history_referral_id_idx ON public.referral_history (referral_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow full access to all users" ON public.referrals
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to all users" ON public.referral_history
  USING (true)
  WITH CHECK (true);
```

## Alternative Solution

If you don't have access to the Supabase dashboard, the application has been updated to handle the missing tables gracefully. You'll see warnings in the console, but the application will continue to function with limited features.

The patient editing capability that was just added will still work correctly, as it doesn't depend on the missing tables.

## Summary of Fixes

1. **Missing Tables**: Added graceful handling for missing referrals and referral_history tables

   - Created a SQL script to create the missing tables
   - Updated the risk-calculator.ts to handle missing tables
   - Created a safer version of the useReferrals hook

2. **Patient Data Error**: Fixed the error when loading patient data

   - Updated use-patients.ts to use the synchronous version of the risk calculation function
   - This prevents the "Cannot read properties of undefined (reading 'score')" error

3. **Patient Editing Capability**: Added the ability to edit patient information

   - Created a new EditablePatientSummaryPanel component
   - Added a usePatientUpdate hook for updating patient data
   - Integrated the editing capability into the PatientDetailView

4. **White Screen Fix**: Fixed the issue with the "View Plan" button causing a white screen
   - Updated the Provider type to include a distanceText property
   - Fixed the type mismatch between string and number for the distance property
   - Made the components more defensive with type checking:
     - Added safety checks in PatientDetailView's handleProviderSelected function
     - Updated ProviderMatchCards to ensure all provider properties have correct types
     - Updated ReferralManagement to handle missing or incorrect property types
   - These changes prevent type errors that were causing the white screen
5. **Provider Matching Enhancement**: Improved the provider matching functionality
   - Connected ProviderMatchCards to real provider data with proper validation
   - Enhanced the matching algorithm to handle real data with error handling
   - Added validation for provider data to prevent errors with missing properties
   - Improved the distance calculation and insurance verification logic