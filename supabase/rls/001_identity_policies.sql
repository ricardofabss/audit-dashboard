alter table if exists profiles enable row level security;
alter table if exists roles enable row level security;
alter table if exists permissions enable row level security;
alter table if exists role_permissions enable row level security;
alter table if exists profile_roles enable row level security;
alter table if exists branches enable row level security;
alter table if exists divisions enable row level security;

drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin"
on profiles for select
using (
  auth.uid() = auth_user_id
  or exists (
    select 1 from profile_roles pr
    join roles r on r.id = pr.role_id
    where pr.profile_id = profiles.id and r.code in ('OWNER', 'ADMIN')
  )
);

drop policy if exists "profiles_update_own_or_admin" on profiles;
create policy "profiles_update_own_or_admin"
on profiles for update
using (
  auth.uid() = auth_user_id
  or exists (
    select 1 from profile_roles pr
    join roles r on r.id = pr.role_id
    where pr.profile_id = profiles.id and r.code in ('OWNER', 'ADMIN')
  )
)
with check (
  auth.uid() = auth_user_id
  or exists (
    select 1 from profile_roles pr
    join roles r on r.id = pr.role_id
    where pr.profile_id = profiles.id and r.code in ('OWNER', 'ADMIN')
  )
);

drop policy if exists "rbac_read_for_authenticated" on roles;
create policy "rbac_read_for_authenticated"
on roles for select
using (auth.role() = 'authenticated');

drop policy if exists "permissions_read_for_authenticated" on permissions;
create policy "permissions_read_for_authenticated"
on permissions for select
using (auth.role() = 'authenticated');

drop policy if exists "role_permissions_read_for_authenticated" on role_permissions;
create policy "role_permissions_read_for_authenticated"
on role_permissions for select
using (auth.role() = 'authenticated');

drop policy if exists "profile_roles_read_for_authenticated" on profile_roles;
create policy "profile_roles_read_for_authenticated"
on profile_roles for select
using (auth.role() = 'authenticated');

drop policy if exists "branches_read_for_authenticated" on branches;
create policy "branches_read_for_authenticated"
on branches for select
using (auth.role() = 'authenticated');

drop policy if exists "divisions_read_for_authenticated" on divisions;
create policy "divisions_read_for_authenticated"
on divisions for select
using (auth.role() = 'authenticated');
