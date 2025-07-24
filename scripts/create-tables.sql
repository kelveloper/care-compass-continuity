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