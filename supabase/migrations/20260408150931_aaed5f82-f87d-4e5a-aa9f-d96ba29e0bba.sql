ALTER TABLE tax_intelligence_profiles
  ADD COLUMN IF NOT EXISTS pte_elected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS spouse_w2_income numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spouse_has_se_income boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS spouse_se_net_income numeric DEFAULT 0;