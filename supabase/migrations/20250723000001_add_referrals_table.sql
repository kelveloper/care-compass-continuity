-- Create referrals table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'scheduled', 'completed', 'cancelled')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral_history table for tracking status changes
CREATE TABLE referral_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_referrals_patient_id ON referrals(patient_id);
CREATE INDEX idx_referrals_provider_id ON referrals(provider_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referral_history_referral_id ON referral_history(referral_id);

-- Enable Row Level Security (RLS)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo purposes)
CREATE POLICY "Enable read access for all users" ON referrals FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON referrals FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON referral_history FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON referral_history FOR INSERT WITH CHECK (true);

-- Create a function to automatically add history entries when referral status changes
CREATE OR REPLACE FUNCTION add_referral_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS NULL OR NEW.status <> OLD.status THEN
    INSERT INTO referral_history (referral_id, status, notes)
    VALUES (NEW.id, NEW.status, 'Status changed to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function when a referral is updated
CREATE TRIGGER referral_status_change
AFTER INSERT OR UPDATE ON referrals
FOR EACH ROW
EXECUTE FUNCTION add_referral_history();

-- Update the patients table to add a foreign key to the most recent referral
ALTER TABLE patients ADD COLUMN current_referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL;