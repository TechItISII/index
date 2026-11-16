-- ============================================================================
-- TECH IT ISII #25074 — SUPABASE BLOG, RBAC (ADMIN/INSIDER), AUDIT & STORAGE
-- Run this script in your Supabase Project -> SQL Editor
-- ============================================================================

-- 1. PROFILES TABLE (RBAC: 'admin' or 'insider')
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'insider' check (role in ('admin', 'insider')),
  created_at timestamptz not null default now()
);

-- Helper: check if current authenticated user is an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Trigger: auto-create profile when a new Auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count integer;
  assigned_role text;
begin
  select count(*) into user_count from public.profiles;
  -- First user ever created becomes 'admin' automatically; subsequent users default to 'insider'
  assigned_role := case when user_count = 0 then 'admin' else 'insider' end;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    assigned_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill profiles for any existing auth.users (first one becomes admin if no admin exists yet)
insert into public.profiles (id, email, display_name, role)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'display_name', split_part(coalesce(u.email, ''), '@', 1)),
  case
    when not exists (select 1 from public.profiles where role = 'admin')
      and u.created_at = (select min(created_at) from auth.users)
    then 'admin'
    else 'insider'
  end
from auth.users u
on conflict (id) do nothing;

create extension if not exists pgcrypto with schema extensions;

-- Admin RPC: create a new user account (Admin or Insider) directly from the Admin Console
create or replace function public.admin_create_user(
  user_email text,
  user_password text,
  user_display_name text default null,
  user_role text default 'insider'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_id uuid := gen_random_uuid();
  clean_email text := lower(trim(user_email));
  clean_name text := coalesce(nullif(trim(user_display_name), ''), split_part(lower(trim(user_email)), '@', 1));
  clean_role text := case when user_role = 'admin' then 'admin' else 'insider' end;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create accounts';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception '2FA (AAL2) verification is required to create accounts';
  end if;
  if clean_email = '' or clean_email not like '%@%' then
    raise exception 'Invalid email address';
  end if;
  if length(coalesce(user_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;
  if exists (select 1 from auth.users where email = clean_email) then
    raise exception 'An account with this email already exists';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    clean_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', clean_name, 'must_change_password', true),
    now(),
    now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', clean_email),
    'email',
    new_id::text,
    now(),
    now(),
    now()
  );

  insert into public.profiles (id, email, display_name, role)
  values (new_id, clean_email, clean_name, clean_role)
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = excluded.role;

  return new_id;
end;
$$;

-- Admin RPC: update any user's display_name, role, or password
create or replace function public.admin_update_user(
  target_user_id uuid,
  new_display_name text,
  new_role text,
  new_password text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  clean_name text := trim(coalesce(new_display_name, ''));
  clean_role text := case when new_role = 'admin' then 'admin' else 'insider' end;
begin
  if not public.is_admin() then
    raise exception 'Only admins can update accounts';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception '2FA (AAL2) verification is required to update accounts';
  end if;
  if target_user_id = auth.uid() and clean_role <> 'admin' then
    raise exception 'You cannot demote your own active admin account';
  end if;

  update public.profiles
  set display_name = case when clean_name <> '' then clean_name else display_name end,
      role = clean_role
  where id = target_user_id;

  update auth.users
  set raw_user_meta_data = case
        when clean_name <> '' then coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', clean_name)
        else raw_user_meta_data
      end,
      encrypted_password = case
        when new_password is not null and length(trim(new_password)) >= 8
        then crypt(trim(new_password), gen_salt('bf'))
        else encrypted_password
      end,
      updated_at = now()
  where id = target_user_id;
end;
$$;

-- Admin RPC: safely delete a user account from auth.users (cascades to profiles)
create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete accounts';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception '2FA (AAL2) verification is required to delete accounts';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot delete your own active admin account';
  end if;
  delete from auth.users where id = target_user_id;
end;
$$;

-- 2. NEWS TABLE
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tag text not null default 'TEAM NEWS',
  summary text not null,
  content text not null,
  image_url text,
  social_url text,
  published boolean not null default true,
  author_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. AUDIT HISTORY TABLE
create table if not exists public.news_history (
  id uuid primary key default gen_random_uuid(),
  news_id uuid,
  action text not null check (action in ('CREATE', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by text,
  changed_at timestamptz not null default now()
);

-- 4. AUTOMATIC updated_at TRIGGER
create or replace function public.handle_news_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_news_updated_at on public.news;
create trigger trg_news_updated_at
  before update on public.news
  for each row
  execute function public.handle_news_updated_at();

-- 5. AUTOMATIC AUDIT HISTORY TRIGGER
create or replace function public.log_news_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_email text;
begin
  actor_email := coalesce(auth.jwt() ->> 'email', 'system');

  if (tg_op = 'INSERT') then
    insert into public.news_history (news_id, action, old_data, new_data, changed_by)
    values (new.id, 'CREATE', null, to_jsonb(new), actor_email);
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.news_history (news_id, action, old_data, new_data, changed_by)
    values (new.id, 'UPDATE', to_jsonb(old), to_jsonb(new), actor_email);
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.news_history (news_id, action, old_data, new_data, changed_by)
    values (old.id, 'DELETE', to_jsonb(old), null, actor_email);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_news_audit on public.news;
create trigger trg_news_audit
  after insert or update or delete on public.news
  for each row
  execute function public.log_news_history();

-- 6. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.news enable row level security;
alter table public.news_history enable row level security;

-- Profiles RLS
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Users can update own display_name" on public.profiles;
create policy "Users can update own display_name"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()))
  );

-- News RLS (public reads published; admins & insiders manage posts)
drop policy if exists "Public can read published news" on public.news;
create policy "Public can read published news"
  on public.news
  for select
  to anon
  using (published = true);

drop policy if exists "Authenticated can read all news" on public.news;
create policy "Authenticated can read all news"
  on public.news
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can insert news" on public.news;
create policy "Authenticated can insert news"
  on public.news
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated can update news" on public.news;
create policy "Authenticated can update news"
  on public.news
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated can delete news" on public.news;
create policy "Authenticated can delete news"
  on public.news
  for delete
  to authenticated
  using (true);

-- Audit History RLS (ONLY ADMINS can read audit history)
drop policy if exists "Authenticated can read news history" on public.news_history;
drop policy if exists "Admins can read news history" on public.news_history;
create policy "Admins can read news history"
  on public.news_history
  for select
  to authenticated
  using (public.is_admin());

-- 7. STORAGE BUCKET FOR NEWS IMAGES
insert into storage.buckets (id, name, public)
values ('news-media', 'news-media', true)
on conflict (id) do nothing;

drop policy if exists "Public can view news media" on storage.objects;
create policy "Public can view news media"
  on storage.objects
  for select
  to public
  using (bucket_id = 'news-media');

drop policy if exists "Authenticated can upload news media" on storage.objects;
create policy "Authenticated can upload news media"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'news-media');

drop policy if exists "Authenticated can delete news media" on storage.objects;
drop policy if exists "Admins can delete news media" on storage.objects;
create policy "Admins can delete news media"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'news-media' and public.is_admin());

-- 8. INITIAL SEED POST
insert into public.news (title, tag, summary, content, image_url, published, author_email)
select
  'Tech It ISII Unveils New Cyber-Lupa Rebrand',
  'REBRAND 2026–27',
  'Piacenza White & Red meets Esports Robotics for the 2026–27 BIOBUZZ season.',
  E'For the 2026–27 BIOBUZZ™ season, Team #25074 introduces a complete visual rebrand designed to unite our local roots with a modern, high-impact esports aesthetic.\n\nThe new crest reimagines the Lupa — historic symbol of Piacenza — fused with cybernetic circuit traces and glowing red optical sensors, framed in Piacenza’s iconic White & Red colors alongside the Italian tricolore.\n\nRepresenting ISII "Guglielmo Marconi", this new identity marks a sharper, more professional chapter for our engineering, outreach, and competition presence.',
  'IMG/logo-esports-banner.jpg',
  true,
  'Tech It ISII'
where not exists (select 1 from public.news);
