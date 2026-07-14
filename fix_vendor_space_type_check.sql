-- ══════════════════════════════════════════════════════════════════════════════
-- India Fest Vendor Space Type Constraint Update
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop the old constraint
ALTER TABLE public.vendor_registrations
  DROP CONSTRAINT IF EXISTS vendor_registrations_space_type_check;

-- Add the updated constraint supporting both old and new space types
ALTER TABLE public.vendor_registrations
  ADD CONSTRAINT vendor_registrations_space_type_check
  CHECK (space_type IN ('small', 'medium', 'large', 'home_business', 'established_business'));

SELECT 'vendor_registrations space_type check constraint updated successfully ✅' AS status;
