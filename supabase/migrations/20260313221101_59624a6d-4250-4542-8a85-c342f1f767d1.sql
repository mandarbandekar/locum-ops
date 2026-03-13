
-- Create required_subscriptions table
CREATE TABLE public.required_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  renewal_date DATE,
  billing_frequency TEXT NOT NULL DEFAULT 'annual',
  cost NUMERIC,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  website_url TEXT,
  notes TEXT DEFAULT '',
  auto_renew BOOLEAN DEFAULT false,
  used_for TEXT,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.required_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can CRUD own subscriptions
CREATE POLICY "Users can CRUD own subscriptions"
  ON public.required_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
