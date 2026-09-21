-- Run this ONCE in Supabase SQL Editor before using /setup
-- https://supabase.com/dashboard/project/olnsstrzxlpcoqxetogn/sql/new

-- Create a helper function for running SQL from the app (SECURITY DEFINER)
create or replace function public.exec_sql(query text)
returns void
language plpgsql
security definer
as $$
begin
  execute query;
end;
$$;

-- Fix the CHECK constraint on profiles.role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('subscriber', 'admin'));
