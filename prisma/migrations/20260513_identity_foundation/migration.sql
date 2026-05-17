create extension if not exists "pgcrypto";

create type "ProfileStatus" as enum ('ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED');

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists divisions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  full_name text not null,
  email text not null,
  email_norm text not null unique,
  phone text,
  avatar_url text,
  status "ProfileStatus" not null default 'INVITED',
  branch_id uuid references branches(id) on delete set null,
  division_id uuid references divisions(id) on delete set null,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(role_id, permission_id)
);

create table if not exists profile_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(profile_id, role_id)
);

create table if not exists auth_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  event_type text not null,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_branch on profiles(branch_id);
create index if not exists idx_profiles_division on profiles(division_id);
create index if not exists idx_profiles_status on profiles(status);
create index if not exists idx_profiles_deleted_at on profiles(deleted_at);
create index if not exists idx_roles_deleted_at on roles(deleted_at);
create index if not exists idx_permissions_deleted_at on permissions(deleted_at);
create index if not exists idx_role_permissions_deleted_at on role_permissions(deleted_at);
create index if not exists idx_profile_roles_deleted_at on profile_roles(deleted_at);
