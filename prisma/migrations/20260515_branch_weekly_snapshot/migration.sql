create table if not exists branch_weekly_snapshot (
  id uuid primary key default gen_random_uuid(),
  business_unit text not null default 'GADAI_MAS',
  collateral_type "CollateralType" not null,
  period_year integer not null,
  period_month integer not null,
  week_index integer not null,
  period_start date not null,
  period_end date not null,
  published_date date not null,
  outlet_code text not null,
  outlet_name text,
  branch_name text,
  region_name text,
  area_name text,
  booking_event_count integer not null default 0,
  new_booking_count integer not null default 0,
  renewal_booking_count integer not null default 0,
  booking_amount numeric(18,2),
  ovd_booking_count integer not null default 0,
  avg_ltv numeric(10,4),
  settlement_count integer not null default 0,
  settlement_amount numeric(18,2),
  late_settlement_count integer not null default 0,
  interest_income numeric(18,2),
  sale_amount numeric(18,2),
  source_run_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (collateral_type, outlet_code, period_start, period_end)
);

create index if not exists idx_branch_weekly_snapshot_period
  on branch_weekly_snapshot(period_year, period_month, week_index);
create index if not exists idx_branch_weekly_snapshot_publish_outlet
  on branch_weekly_snapshot(published_date, outlet_code);
create index if not exists idx_branch_weekly_snapshot_deleted_at
  on branch_weekly_snapshot(deleted_at);
