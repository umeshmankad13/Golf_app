-- Golf App Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text default 'subscriber' check (role in ('subscriber', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update all profiles" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  plan_type text not null check (plan_type in ('monthly', 'yearly')),
  status text default 'active' check (status in ('active', 'cancelled', 'lapsed', 'past_due')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  charity_percentage decimal(5,2) default 10.00 check (charity_percentage >= 10 and charity_percentage <= 50),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "Users can view own subscription" on subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own subscription" on subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own subscription" on subscriptions for update using (auth.uid() = user_id);
create policy "Admins can manage all subscriptions" on subscriptions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================
-- SCORES TABLE
-- ============================================
create table scores (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  score integer not null check (score between 1 and 45),
  score_date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, score_date)
);

alter table scores enable row level security;
create policy "Users can view own scores" on scores for select using (auth.uid() = user_id);
create policy "Users can insert own scores" on scores for insert with check (auth.uid() = user_id);
create policy "Users can update own scores" on scores for update using (auth.uid() = user_id);
create policy "Users can delete own scores" on scores for delete using (auth.uid() = user_id);
create policy "Admins can manage all scores" on scores for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Function: keep only latest 5 scores per user
create or replace function maintain_latest_5_scores()
returns trigger as $$
begin
  delete from scores
  where user_id = new.user_id
    and id not in (
      select id from scores
      where user_id = new.user_id
      order by score_date desc
      limit 5
    );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_score_inserted
  after insert on scores
  for each row execute function maintain_latest_5_scores();

-- ============================================
-- CHARITIES TABLE
-- ============================================
create table charities (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  image_url text,
  website_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table charities enable row level security;
create policy "Anyone can view active charities" on charities for select using (is_active = true);
create policy "Admins can manage charities" on charities for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================
-- USER CHARITY SELECTION TABLE
-- ============================================
create table user_charities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade unique not null,
  charity_id uuid references charities(id) on delete set null,
  donation_amount decimal(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_charities enable row level security;
create policy "Users can view own charity selection" on user_charities for select using (auth.uid() = user_id);
create policy "Users can insert own charity selection" on user_charities for insert with check (auth.uid() = user_id);
create policy "Users can update own charity selection" on user_charities for update using (auth.uid() = user_id);
create policy "Admins can view all charity selections" on user_charities for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================
-- DRAWS TABLE
-- ============================================
create table draws (
  id uuid default uuid_generate_v4() primary key,
  draw_date date not null unique,
  winning_numbers integer[] not null,
  draw_type text default 'random' check (draw_type in ('random', 'algorithmic')),
  status text default 'pending' check (status in ('pending', 'published', 'completed')),
  prize_pool_total decimal(12,2) default 0,
  published_at timestamptz,
  created_at timestamptz default now()
);

alter table draws enable row level security;
create policy "Anyone can view published draws" on draws for select using (status = 'published' or status = 'completed');
create policy "Admins can manage draws" on draws for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================
-- DRAW ENTRIES TABLE
-- ============================================
create table draw_entries (
  id uuid default uuid_generate_v4() primary key,
  draw_id uuid references draws(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  selected_numbers integer[] not null,
  matched_count integer default 0,
  prize_amount decimal(12,2) default 0,
  created_at timestamptz default now(),
  unique(draw_id, user_id)
);

alter table draw_entries enable row level security;
create policy "Users can view own draw entries" on draw_entries for select using (auth.uid() = user_id);
create policy "Users can insert own draw entries" on draw_entries for insert with check (auth.uid() = user_id);
create policy "Admins can manage all draw entries" on draw_entries for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================
-- WINNERS TABLE
-- ============================================
create table winners (
  id uuid default uuid_generate_v4() primary key,
  draw_id uuid references draws(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  draw_entry_id uuid references draw_entries(id) on delete cascade not null,
  matched_count integer not null,
  prize_amount decimal(12,2) not null,
  proof_url text,
  verification_status text default 'pending' check (verification_status in ('pending', 'approved', 'rejected')),
  payment_status text default 'pending' check (payment_status in ('pending', 'paid')),
  verified_at timestamptz,
  paid_at timestamptz,
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table winners enable row level security;
create policy "Users can view own winning records" on winners for select using (auth.uid() = user_id);
create policy "Users can upload proof for own wins" on winners for update using (auth.uid() = user_id);
create policy "Admins can manage all winners" on winners for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================
-- PRIZE POOL TABLE (tracks pool contributions)
-- ============================================
create table prize_pool (
  id uuid default uuid_generate_v4() primary key,
  subscription_id uuid references subscriptions(id) on delete cascade not null,
  amount decimal(10,2) not null,
  period_start date not null,
  period_end date not null,
  created_at timestamptz default now()
);

alter table prize_pool enable row level security;
create policy "Admins can view prize pool" on prize_pool for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================
-- INDEXES for performance
-- ============================================
create index idx_scores_user_id on scores(user_id);
create index idx_scores_date on scores(score_date desc);
create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_draw_entries_draw_id on draw_entries(draw_id);
create index idx_draw_entries_user_id on draw_entries(user_id);
create index idx_winners_user_id on winners(user_id);
create index idx_winners_draw_id on winners(draw_id);
