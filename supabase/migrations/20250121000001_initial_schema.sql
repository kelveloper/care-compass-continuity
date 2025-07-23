-- Create patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  diagnosis TEXT NOT NULL,
  discharge_date DATE NOT NULL,
  required_followup TEXT NOT NULL,
  insurance TEXT NOT NULL,
  address TEXT NOT NULL,
  leakage_risk_score INTEGER NOT NULL,
  leakage_risk_level TEXT NOT NULL CHECK (leakage_risk_level IN ('low', 'medium', 'high')),
  referral_status TEXT NOT NULL DEFAULT 'needed' CHECK (referral_status IN ('needed', 'sent', 'scheduled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create providers table
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  specialties TEXT[] NOT NULL,
  accepted_insurance TEXT[] NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  availability_next TEXT,
  in_network_plans TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_patients_leakage_risk_score ON patients(leakage_risk_score DESC);
CREATE INDEX idx_patients_referral_status ON patients(referral_status);
CREATE INDEX idx_patients_discharge_date ON patients(discharge_date);
CREATE INDEX idx_providers_type ON providers(type);
CREATE INDEX idx_providers_rating ON providers(rating DESC);
CREATE INDEX idx_providers_location ON providers(latitude, longitude);

-- Enable Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo purposes)
-- In production, you'd want more restrictive policies
CREATE POLICY "Enable read access for all users" ON patients FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON patients FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON providers FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON providers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON providers FOR UPDATE USING (true);