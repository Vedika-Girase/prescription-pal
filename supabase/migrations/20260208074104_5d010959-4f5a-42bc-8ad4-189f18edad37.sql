
-- =============================================
-- Create patients table (separate from auth users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  age INTEGER,
  gender TEXT,
  address TEXT,
  blood_group TEXT,
  registered_by UUID,
  user_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Create tokens table (central reference)
-- =============================================
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assigned_doctor_id UUID,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Add token_id to prescriptions, make patient_id nullable
-- =============================================
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS token_id UUID REFERENCES public.tokens(id);
ALTER TABLE public.prescriptions ALTER COLUMN patient_id DROP NOT NULL;

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tokens_code ON public.tokens(code);
CREATE INDEX IF NOT EXISTS idx_tokens_patient ON public.tokens(patient_id);
CREATE INDEX IF NOT EXISTS idx_tokens_doctor ON public.tokens(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_user ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_token ON public.prescriptions(token_id);

-- =============================================
-- Security definer helper functions
-- =============================================
CREATE OR REPLACE FUNCTION public.is_receptionist(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'receptionist') $$;

CREATE OR REPLACE FUNCTION public.is_doctor(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'doctor') $$;

CREATE OR REPLACE FUNCTION public.is_store(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'medical_store') $$;

CREATE OR REPLACE FUNCTION public.doctor_has_patient(_doctor_id UUID, _patient_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM tokens WHERE assigned_doctor_id = _doctor_id AND patient_id = _patient_id) $$;

CREATE OR REPLACE FUNCTION public.patient_owns_record(_user_id UUID, _patient_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM patients WHERE id = _patient_id AND user_id = _user_id) $$;

CREATE OR REPLACE FUNCTION public.user_has_prescription_access(_user_id UUID, _prescription_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM prescriptions WHERE id = _prescription_id AND (doctor_id = _user_id OR patient_id = _user_id)) $$;

CREATE OR REPLACE FUNCTION public.doctor_has_dose_access(_doctor_id UUID, _pm_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM prescription_medicines pm JOIN prescriptions p ON p.id = pm.prescription_id WHERE pm.id = _pm_id AND p.doctor_id = _doctor_id) $$;

-- Token code generation function
CREATE OR REPLACE FUNCTION public.generate_token_code()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'TKN-' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS (SELECT 1 FROM tokens WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- =============================================
-- Patients table RLS policies
-- =============================================
CREATE POLICY "receptionist_select_patients" ON public.patients FOR SELECT
USING (public.is_receptionist(auth.uid()));

CREATE POLICY "receptionist_insert_patients" ON public.patients FOR INSERT
WITH CHECK (public.is_receptionist(auth.uid()));

CREATE POLICY "receptionist_update_patients" ON public.patients FOR UPDATE
USING (public.is_receptionist(auth.uid()));

CREATE POLICY "doctor_select_patients" ON public.patients FOR SELECT
USING (public.doctor_has_patient(auth.uid(), id));

CREATE POLICY "store_select_patients" ON public.patients FOR SELECT
USING (public.is_store(auth.uid()));

CREATE POLICY "patient_select_own" ON public.patients FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "patient_update_own" ON public.patients FOR UPDATE
USING (user_id = auth.uid());

-- =============================================
-- Tokens table RLS policies
-- =============================================
CREATE POLICY "receptionist_select_tokens" ON public.tokens FOR SELECT
USING (public.is_receptionist(auth.uid()));

CREATE POLICY "receptionist_insert_tokens" ON public.tokens FOR INSERT
WITH CHECK (public.is_receptionist(auth.uid()));

CREATE POLICY "receptionist_update_tokens" ON public.tokens FOR UPDATE
USING (public.is_receptionist(auth.uid()));

CREATE POLICY "doctor_select_tokens" ON public.tokens FOR SELECT
USING (assigned_doctor_id = auth.uid());

CREATE POLICY "doctor_update_tokens" ON public.tokens FOR UPDATE
USING (assigned_doctor_id = auth.uid());

CREATE POLICY "store_select_tokens" ON public.tokens FOR SELECT
USING (public.is_store(auth.uid()));

CREATE POLICY "patient_select_own_tokens" ON public.tokens FOR SELECT
USING (public.patient_owns_record(auth.uid(), patient_id));

-- =============================================
-- Fix existing subquery-based RLS policies
-- =============================================

-- prescription_medicines
DROP POLICY IF EXISTS "safe_insert_medicines" ON public.prescription_medicines;
DROP POLICY IF EXISTS "safe_update_medicines" ON public.prescription_medicines;
DROP POLICY IF EXISTS "safe_view_medicines" ON public.prescription_medicines;

CREATE POLICY "view_medicines" ON public.prescription_medicines FOR SELECT
USING (public.user_has_prescription_access(auth.uid(), prescription_id) OR public.is_store(auth.uid()) OR public.is_receptionist(auth.uid()));

CREATE POLICY "insert_medicines" ON public.prescription_medicines FOR INSERT
WITH CHECK (public.user_has_prescription_access(auth.uid(), prescription_id));

CREATE POLICY "update_medicines" ON public.prescription_medicines FOR UPDATE
USING (public.user_has_prescription_access(auth.uid(), prescription_id));

-- store_prescriptions
DROP POLICY IF EXISTS "safe_insert_store_prescriptions" ON public.store_prescriptions;
DROP POLICY IF EXISTS "safe_update_store_prescriptions" ON public.store_prescriptions;
DROP POLICY IF EXISTS "safe_view_store_prescriptions" ON public.store_prescriptions;

CREATE POLICY "insert_store_rx" ON public.store_prescriptions FOR INSERT
WITH CHECK (public.is_store(auth.uid()));

CREATE POLICY "update_store_rx" ON public.store_prescriptions FOR UPDATE
USING (store_id = auth.uid());

CREATE POLICY "view_store_rx" ON public.store_prescriptions FOR SELECT
USING (store_id = auth.uid() OR public.user_has_prescription_access(auth.uid(), prescription_id) OR public.is_receptionist(auth.uid()));

-- dose_tracking
DROP POLICY IF EXISTS "Patients can view own dose tracking " ON public.dose_tracking;
DROP POLICY IF EXISTS "Patients can view own dose tracking" ON public.dose_tracking;

CREATE POLICY "view_dose_tracking" ON public.dose_tracking FOR SELECT
USING (patient_id = auth.uid() OR public.doctor_has_dose_access(auth.uid(), prescription_medicine_id));

-- prescriptions
DROP POLICY IF EXISTS "safe_view_prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "safe_insert_prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "safe_update_prescriptions" ON public.prescriptions;

CREATE POLICY "view_prescriptions" ON public.prescriptions FOR SELECT
USING (doctor_id = auth.uid() OR patient_id = auth.uid() OR public.is_receptionist(auth.uid()) OR public.is_store(auth.uid()));

CREATE POLICY "insert_prescriptions" ON public.prescriptions FOR INSERT
WITH CHECK (doctor_id = auth.uid() OR patient_id = auth.uid());

CREATE POLICY "update_prescriptions" ON public.prescriptions FOR UPDATE
USING (doctor_id = auth.uid() OR patient_id = auth.uid());

-- =============================================
-- Triggers for updated_at on new tables
-- =============================================
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tokens_updated_at
BEFORE UPDATE ON public.tokens FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Enable realtime for new tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
