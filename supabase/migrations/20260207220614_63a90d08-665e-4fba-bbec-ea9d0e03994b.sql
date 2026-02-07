
-- 1. Create enums
CREATE TYPE public.app_role AS ENUM ('doctor', 'medical_store', 'patient');
CREATE TYPE public.prescription_status AS ENUM ('pending', 'ready', 'given');
CREATE TYPE public.dose_status AS ENUM ('taken', 'missed');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 4. Prescriptions table
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Prescription medicines
CREATE TABLE public.prescription_medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  timing TEXT NOT NULL DEFAULT 'after_food',
  time_of_day TEXT[] NOT NULL DEFAULT ARRAY['morning'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Store prescriptions (linking prescriptions to medical stores)
CREATE TABLE public.store_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.prescription_status NOT NULL DEFAULT 'pending',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Dose tracking
CREATE TABLE public.dose_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_medicine_id UUID NOT NULL REFERENCES public.prescription_medicines(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status public.dose_status,
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX idx_prescription_medicines_prescription_id ON public.prescription_medicines(prescription_id);
CREATE INDEX idx_store_prescriptions_store_id ON public.store_prescriptions(store_id);
CREATE INDEX idx_store_prescriptions_prescription_id ON public.store_prescriptions(prescription_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_dose_tracking_patient_id ON public.dose_tracking(patient_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);

-- 10. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_tracking ENABLE ROW LEVEL SECURITY;

-- 11. Security definer helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 12. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_prescriptions_updated_at
  BEFORE UPDATE ON public.store_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  -- Auto-assign role from metadata
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. RLS Policies

-- Profiles: authenticated users can read all (needed for lookups), update own
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- User roles: users can read own role, insert own role
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Prescriptions: doctors see own created, patients see own assigned, stores see assigned via store_prescriptions
CREATE POLICY "Doctors can create prescriptions"
  ON public.prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid()
    OR
    public.has_role(auth.uid(), 'patient') AND patient_id = auth.uid() AND doctor_id IS NULL
  );

CREATE POLICY "Users can view relevant prescriptions"
  ON public.prescriptions FOR SELECT
  TO authenticated
  USING (
    doctor_id = auth.uid()
    OR patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.store_prescriptions sp
      WHERE sp.prescription_id = id AND sp.store_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can update own prescriptions"
  ON public.prescriptions FOR UPDATE
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid())
    OR
    (public.has_role(auth.uid(), 'patient') AND patient_id = auth.uid() AND doctor_id IS NULL)
  );

-- Prescription medicines
CREATE POLICY "Users can view prescription medicines"
  ON public.prescription_medicines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_id
      AND (p.doctor_id = auth.uid() OR p.patient_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.store_prescriptions sp WHERE sp.prescription_id = p.id AND sp.store_id = auth.uid()))
    )
  );

CREATE POLICY "Doctors can insert prescription medicines"
  ON public.prescription_medicines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_id
      AND (
        (public.has_role(auth.uid(), 'doctor') AND p.doctor_id = auth.uid())
        OR (public.has_role(auth.uid(), 'patient') AND p.patient_id = auth.uid() AND p.doctor_id IS NULL)
      )
    )
  );

CREATE POLICY "Doctors can update prescription medicines"
  ON public.prescription_medicines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_id
      AND (
        (public.has_role(auth.uid(), 'doctor') AND p.doctor_id = auth.uid())
        OR (public.has_role(auth.uid(), 'patient') AND p.patient_id = auth.uid() AND p.doctor_id IS NULL)
      )
    )
  );

-- Store prescriptions
CREATE POLICY "Doctors can assign to stores"
  ON public.store_prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor')
    AND EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_id AND p.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Users can view store prescriptions"
  ON public.store_prescriptions FOR SELECT
  TO authenticated
  USING (
    store_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = prescription_id
      AND (p.doctor_id = auth.uid() OR p.patient_id = auth.uid())
    )
  );

CREATE POLICY "Stores can update status"
  ON public.store_prescriptions FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'medical_store') AND store_id = auth.uid()
  );

-- Notifications: users can only see own
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Dose tracking
CREATE POLICY "Patients can view own dose tracking"
  ON public.dose_tracking FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.prescription_medicines pm
      JOIN public.prescriptions p ON p.id = pm.prescription_id
      WHERE pm.id = prescription_medicine_id AND p.doctor_id = auth.uid()
    )
  );

CREATE POLICY "Patients can insert dose tracking"
  ON public.dose_tracking FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'patient') AND patient_id = auth.uid());

CREATE POLICY "Patients can update dose tracking"
  ON public.dose_tracking FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'patient') AND patient_id = auth.uid());

-- 15. Storage bucket for prescription attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('prescription-attachments', 'prescription-attachments', false);

CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'prescription-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'prescription-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'prescription-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 16. Notification trigger when store status changes
CREATE OR REPLACE FUNCTION public.notify_prescription_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _patient_id UUID;
  _store_name TEXT;
  _status_text TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT p.patient_id INTO _patient_id
    FROM public.prescriptions p
    WHERE p.id = NEW.prescription_id;

    SELECT pr.full_name INTO _store_name
    FROM public.profiles pr
    WHERE pr.id = NEW.store_id;

    IF NEW.status = 'ready' THEN
      _status_text := 'Your prescription is ready for pickup at ' || COALESCE(_store_name, 'the medical store');
    ELSIF NEW.status = 'given' THEN
      _status_text := 'Your prescription has been handed over at ' || COALESCE(_store_name, 'the medical store');
    END IF;

    IF _status_text IS NOT NULL AND _patient_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (_patient_id, 'Prescription Update', _status_text, 'store_update');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_store_prescription_status_change
  AFTER UPDATE ON public.store_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_prescription_status_change();

-- 17. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
