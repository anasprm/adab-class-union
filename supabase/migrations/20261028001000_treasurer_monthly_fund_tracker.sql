-- ============================================================================
-- ADAB CLASS UNION — TREASURER MONTHLY FUND TRACKER SQL MIGRATION
-- ============================================================================

create table if not exists public.monthly_fund_settings (
  id uuid primary key default gen_random_uuid(),
  month_year text not null unique check (month_year ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  fixed_amount numeric(10, 2) not null default 100.00 check (fixed_amount >= 0),
  set_by_treasurer_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_fund_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  month_year text not null check (month_year ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  due_amount numeric(10, 2) not null default 100.00 check (due_amount >= 0),
  amount_paid numeric(10, 2) not null default 0.00 check (amount_paid >= 0),
  payment_status text not null default 'PENDING' check (payment_status in ('PAID', 'PARTIAL', 'PENDING')),
  payment_date timestamptz,
  remarks text check (remarks is null or char_length(remarks) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_month_unique unique (student_id, month_year)
);

alter table public.monthly_fund_settings enable row level security;
alter table public.student_fund_records enable row level security;

revoke all on public.monthly_fund_settings from anon, authenticated;
revoke all on public.student_fund_records from anon, authenticated;

grant select on public.monthly_fund_settings to authenticated;
grant insert, update on public.monthly_fund_settings to authenticated;

grant select on public.student_fund_records to authenticated;
grant insert, update on public.student_fund_records to authenticated;

drop policy if exists "Approved members can view monthly fund settings" on public.monthly_fund_settings;
create policy "Approved members can view monthly fund settings"
  on public.monthly_fund_settings for select to authenticated
  using ((select public.is_portal_member()));

drop policy if exists "Treasurers and developers can manage monthly fund settings" on public.monthly_fund_settings;
create policy "Treasurers and developers can manage monthly fund settings"
  on public.monthly_fund_settings for all to authenticated
  using ((select public.has_portal_role(array['developer', 'treasurer'])))
  with check ((select public.has_portal_role(array['developer', 'treasurer'])));

drop policy if exists "Approved members can view student fund records" on public.student_fund_records;
create policy "Approved members can view student fund records"
  on public.student_fund_records for select to authenticated
  using ((select public.is_portal_member()));

drop policy if exists "Treasurers and developers can manage student fund records" on public.student_fund_records;
create policy "Treasurers and developers can manage student fund records"
  on public.student_fund_records for all to authenticated
  using ((select public.has_portal_role(array['developer', 'treasurer'])))
  with check ((select public.has_portal_role(array['developer', 'treasurer'])));
