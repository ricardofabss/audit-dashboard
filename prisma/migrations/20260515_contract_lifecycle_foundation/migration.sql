do $$
begin
  create type "CollateralType" as enum ('EMAS', 'ELEKTRONIK');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type "ContractLifecycleEventType" as enum ('BOOKING_NEW', 'BOOKING_RENEWAL', 'SETTLEMENT');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type "ContractLifecycleStatus" as enum ('ACTIVE', 'OVERDUE_ACTIVE', 'ROLLED_OVER', 'SETTLED', 'CLOSED');
exception
  when duplicate_object then null;
end
$$;

create table if not exists contract_lifecycle_event (
  id uuid primary key default gen_random_uuid(),
  business_unit text not null default 'GADAI_MAS',
  collateral_type "CollateralType" not null,
  contract_no text not null,
  parent_contract_no text,
  root_contract_no text not null,
  customer_id text,
  outlet_code text not null,
  outlet_name text,
  branch_name text,
  region_name text,
  area_name text,
  event_type "ContractLifecycleEventType" not null,
  event_date date not null,
  event_ts timestamptz,
  register_date date,
  disbursement_date date,
  due_date date,
  settlement_date date,
  tenor_days integer,
  overdue_days integer,
  renewal_count integer,
  is_renewal boolean not null default false,
  ltv_ratio numeric(10,4),
  principal_initial numeric(18,2),
  loan_initial numeric(18,2),
  principal_outstanding numeric(18,2),
  interest_outstanding numeric(18,2),
  settlement_amount numeric(18,2),
  sale_amount numeric(18,2),
  interest_income numeric(18,2),
  settlement_status text,
  exit_status text,
  source_system text not null,
  source_sheet text not null,
  source_event_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists contract_lifecycle_current (
  id uuid primary key default gen_random_uuid(),
  business_unit text not null default 'GADAI_MAS',
  collateral_type "CollateralType" not null,
  root_contract_no text not null,
  contract_no_latest text not null,
  customer_id text,
  outlet_code text not null,
  outlet_name text,
  branch_name text,
  region_name text,
  area_name text,
  status_current "ContractLifecycleStatus" not null,
  last_event_type "ContractLifecycleEventType" not null,
  last_event_date date not null,
  last_event_ts timestamptz,
  register_date date,
  disbursement_date date,
  due_date date,
  settlement_date date,
  tenor_days integer,
  overdue_days_current integer,
  renewal_count_current integer,
  is_renewal_current boolean not null default false,
  ltv_ratio_current numeric(10,4),
  principal_initial_current numeric(18,2),
  loan_initial_current numeric(18,2),
  principal_outstanding_current numeric(18,2),
  interest_outstanding_current numeric(18,2),
  settlement_amount_latest numeric(18,2),
  sale_amount_latest numeric(18,2),
  interest_income_cumulative numeric(18,2),
  settlement_status_latest text,
  exit_status_latest text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (root_contract_no, collateral_type)
);

create index if not exists idx_contract_lifecycle_event_contract
  on contract_lifecycle_event(contract_no, collateral_type);
create index if not exists idx_contract_lifecycle_event_root
  on contract_lifecycle_event(root_contract_no, collateral_type);
create index if not exists idx_contract_lifecycle_event_outlet_date
  on contract_lifecycle_event(outlet_code, event_date);
create index if not exists idx_contract_lifecycle_event_type_date
  on contract_lifecycle_event(event_type, event_date);
create index if not exists idx_contract_lifecycle_event_deleted_at
  on contract_lifecycle_event(deleted_at);

create index if not exists idx_contract_lifecycle_current_contract
  on contract_lifecycle_current(contract_no_latest, collateral_type);
create index if not exists idx_contract_lifecycle_current_outlet_date
  on contract_lifecycle_current(outlet_code, last_event_date);
create index if not exists idx_contract_lifecycle_current_status_date
  on contract_lifecycle_current(status_current, last_event_date);
create index if not exists idx_contract_lifecycle_current_deleted_at
  on contract_lifecycle_current(deleted_at);
