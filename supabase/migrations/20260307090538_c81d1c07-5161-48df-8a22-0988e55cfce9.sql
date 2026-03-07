
-- Add user_id to clinic_requirements
ALTER TABLE public.clinic_requirements ADD COLUMN user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Add user_id to clinic_requirement_mappings
ALTER TABLE public.clinic_requirement_mappings ADD COLUMN user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Drop existing permissive policies on clinic_requirements
DROP POLICY IF EXISTS "Authenticated users can manage clinic requirements" ON public.clinic_requirements;
DROP POLICY IF EXISTS "Authenticated users can read clinic requirements" ON public.clinic_requirements;
DROP POLICY IF EXISTS "Authenticated users can update clinic requirements" ON public.clinic_requirements;
DROP POLICY IF EXISTS "Authenticated users can delete clinic requirements" ON public.clinic_requirements;

-- Drop existing permissive policy on clinic_requirement_mappings
DROP POLICY IF EXISTS "Authenticated users can manage mappings" ON public.clinic_requirement_mappings;

-- Create scoped RLS policies for clinic_requirements
CREATE POLICY "Users can CRUD own clinic requirements"
  ON public.clinic_requirements FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create scoped RLS policies for clinic_requirement_mappings
CREATE POLICY "Users can CRUD own clinic mappings"
  ON public.clinic_requirement_mappings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
