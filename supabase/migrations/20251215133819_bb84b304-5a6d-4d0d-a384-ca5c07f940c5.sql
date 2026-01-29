-- Create enum types
create type public.friendship_status as enum ('pending', 'accepted', 'declined');
create type public.app_role as enum ('admin', 'moderator', 'user');

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create friendships table (mutual, invite-only)
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status friendship_status default 'pending' not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (requester_id, addressee_id),
  check (requester_id != addressee_id)
);

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role default 'user' not null,
  unique (user_id, role)
);

-- Create calendar_sharing table
create table public.calendar_sharing (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  shared_with_id uuid references public.profiles(id) on delete cascade not null,
  is_enabled boolean default false,
  created_at timestamptz default now(),
  unique (owner_id, shared_with_id)
);

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at triggers
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_friendships_updated_at
  before update on public.friendships
  for each row execute function public.handle_updated_at();

-- Create trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security definer function: check if two users are friends
create or replace function public.are_friends(_user_id_1 uuid, _user_id_2 uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and (
        (requester_id = _user_id_1 and addressee_id = _user_id_2)
        or (requester_id = _user_id_2 and addressee_id = _user_id_1)
      )
  )
$$;

-- Security definer function: check user role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.user_roles enable row level security;
alter table public.calendar_sharing enable row level security;

-- Profiles RLS policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can view profiles of friends"
  on public.profiles for select
  using (public.are_friends(auth.uid(), id));

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Friendships RLS policies
create policy "Users can view their own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can create friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

create policy "Users can update friendships they received"
  on public.friendships for update
  using (auth.uid() = addressee_id);

create policy "Users can delete their own friendships"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- User roles RLS policies
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Calendar sharing RLS policies
create policy "Users can manage their own calendar sharing"
  on public.calendar_sharing for all
  using (auth.uid() = owner_id);

create policy "Users can view if others shared with them"
  on public.calendar_sharing for select
  using (auth.uid() = shared_with_id and is_enabled = true);