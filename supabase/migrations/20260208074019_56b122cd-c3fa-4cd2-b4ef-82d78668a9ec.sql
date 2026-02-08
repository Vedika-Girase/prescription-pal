
-- Add receptionist role to enum (must be in its own transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'receptionist';
