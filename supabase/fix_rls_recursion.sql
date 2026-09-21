-- Fix infinite recursion in RLS policies
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies on profiles (including the insert one)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
END $$;

-- Create SECURITY DEFINER function to check admin (avoids RLS recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles policies
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Admins can view all profiles" on profiles
  for select using (public.is_admin());

create policy "Admins can update all profiles" on profiles
  for update using (public.is_admin());

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Fix all other tables to use is_admin()
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Admins can manage all scores" ON scores;
  DROP POLICY IF EXISTS "Admins can manage charities" ON charities;
  DROP POLICY IF EXISTS "Admins can view all charity selections" ON user_charities;
  DROP POLICY IF EXISTS "Admins can manage draws" ON draws;
  DROP POLICY IF EXISTS "Admins can manage all draw entries" ON draw_entries;
  DROP POLICY IF EXISTS "Admins can manage all winners" ON winners;
  DROP POLICY IF EXISTS "Admins can view prize pool" ON prize_pool;
END $$;

create policy "Admins can manage all subscriptions" on subscriptions
  for all using (public.is_admin());

create policy "Admins can manage all scores" on scores
  for all using (public.is_admin());

create policy "Admins can manage charities" on charities
  for all using (public.is_admin());

create policy "Admins can view all charity selections" on user_charities
  for all using (public.is_admin());

create policy "Admins can manage draws" on draws
  for all using (public.is_admin());

create policy "Admins can manage all draw entries" on draw_entries
  for all using (public.is_admin());

create policy "Admins can manage all winners" on winners
  for all using (public.is_admin());

create policy "Admins can view prize pool" on prize_pool
  for all using (public.is_admin());
