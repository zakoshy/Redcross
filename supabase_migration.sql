-- =========================
-- 1. ENUMS
-- =========================
do $$
begin
    if not exists (select 1 from pg_type where typname = 'profile_role') then
        create type public.profile_role as enum ('admin', 'volunteer', 'merchant', 'victim');
    end if;
    if not exists (select 1 from pg_type where typname = 'transaction_type') then
        create type public.transaction_type as enum ('AID_DISBURSEMENT', 'PURCHASE', 'FUNDS_RETURN');
    end if;
end $$;

-- =========================
-- 2. TABLES
-- =========================

-- Profiles Table (Flexible: works for auth users and "offline" victims)
create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    email text,
    full_name text,
    national_id text unique,
    phone_number text unique,
    county text,
    role profile_role not null default 'victim',
    status text not null default 'pending' check (status in ('pending', 'active', 'suspended'))
);

alter table public.profiles enable row level security;

-- Wallets Table
create table if not exists public.wallets (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    profile_id uuid not null unique references public.profiles(id) on delete cascade,
    balance numeric(10,2) not null default 0 check (balance >= 0)
);

alter table public.wallets enable row level security;

-- Campaigns Table
create table if not exists public.campaigns (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    name text not null,
    description text,
    amount numeric(10,2) not null default 0,
    status text check (status in ('active','completed')) default 'active'
);

alter table public.campaigns enable row level security;

-- Ledger Table (Append-only audit trail)
create table if not exists public.ledger (
    id bigserial primary key,
    created_at timestamptz not null default now(),
    wallet_id uuid references public.wallets(id),
    campaign_id uuid references public.campaigns(id) on delete set null,
    amount numeric(10,2) not null,
    transaction_type transaction_type not null,
    idempotency_key uuid unique,
    description text,
    metadata jsonb
);

alter table public.ledger enable row level security;

-- Triage Sessions Table
create table if not exists public.triage_sessions (
    id bigserial primary key,
    created_at timestamptz default now(),
    victim_id uuid references public.profiles(id),
    volunteer_id uuid references public.profiles(id), -- Assigned volunteer
    last_message text,
    risk_score float,
    escalated boolean default false,
    notes text,
    status text default 'open'
);

alter table public.triage_sessions enable row level security;

-- =========================
-- 3. ROLE CHECK FUNCTIONS (SECURITY DEFINER to avoid recursion)
-- =========================

create or replace function public.check_is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.check_is_volunteer()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'volunteer'
  );
$$;

-- =========================
-- 4. RLS POLICIES
-- =========================

-- Profiles Policies
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (id = auth.uid());

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (id = auth.uid());

drop policy if exists "admin manage all profiles" on public.profiles;
create policy "admin manage all profiles" on public.profiles for all using (public.check_is_admin());

drop policy if exists "volunteers view victims" on public.profiles;
create policy "volunteers view victims" on public.profiles for select using (public.check_is_volunteer() and role = 'victim');

drop policy if exists "volunteers update victims" on public.profiles;
create policy "volunteers update victims" on public.profiles for update using (public.check_is_volunteer() and role = 'victim') with check (public.check_is_volunteer() and role = 'victim');

-- Wallets Policies
drop policy if exists "view own wallet" on public.wallets;
create policy "view own wallet" on public.wallets for select using (profile_id = auth.uid());

drop policy if exists "admin view wallets" on public.wallets;
create policy "admin view wallets" on public.wallets for select using (public.check_is_admin());

-- Campaigns Policies
drop policy if exists "authenticated view campaigns" on public.campaigns;
create policy "authenticated view campaigns" on public.campaigns for select using (auth.role() = 'authenticated');

drop policy if exists "admin manage campaigns" on public.campaigns;
create policy "admin manage campaigns" on public.campaigns for all using (public.check_is_admin());

-- Ledger Policies
drop policy if exists "view own ledger" on public.ledger;
create policy "view own ledger" on public.ledger for select using (
  wallet_id in (select id from public.wallets where profile_id = auth.uid())
);

drop policy if exists "admin view ledger" on public.ledger;
create policy "admin view ledger" on public.ledger for select using (public.check_is_admin());

-- Triage Policies
drop policy if exists "admin manage triage" on public.triage_sessions;
create policy "admin manage triage" on public.triage_sessions for all using (public.check_is_admin());

-- =========================
-- 5. AUTH TRIGGER
-- =========================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare v_role profile_role;
begin
    if new.email = 'edwindezak@gmail.com' then
        v_role := 'admin';
    else
        begin
            v_role := coalesce((new.raw_user_meta_data->>'role')::profile_role, 'volunteer');
        exception when others then
            v_role := 'volunteer';
        end;
    end if;

    insert into public.profiles (id, email, full_name, national_id, phone_number, county, role, status)
    values (
        new.id, 
        new.email, 
        nullif(new.raw_user_meta_data->>'full_name', ''),
        nullif(new.raw_user_meta_data->>'national_id', ''),
        nullif(new.raw_user_meta_data->>'phone_number', ''),
        nullif(new.raw_user_meta_data->>'county', ''),
        v_role,
        case 
            when v_role = 'admin' then 'active'
            when v_role = 'victim' then 'active'
            else 'pending'
        end
    )
    on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, profiles.full_name),
        national_id = coalesce(excluded.national_id, profiles.national_id),
        phone_number = coalesce(excluded.phone_number, profiles.phone_number),
        county = coalesce(excluded.county, profiles.county),
        role = excluded.role;

    insert into public.wallets (profile_id) 
    values (new.id)
    on conflict (profile_id) do nothing;

    return new;
end;
$$;

-- Function to sync email confirmation status
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
as $$
begin
    if new.email_confirmed_at is not null and old.email_confirmed_at is null then
        update public.profiles
        set status = 'active'
        where id = new.id;
    end if;
    return new;
end;
$$;

-- Trigger for user update
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================
-- 6. RPC FUNCTIONS (BUSINESS LOGIC)
-- =========================

-- Register Victim (No Auth Account)
create or replace function public.register_victim(
    p_full_name text,
    p_national_id text,
    p_phone_number text default null,
    p_county text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
    new_profile_id uuid;
begin
    insert into public.profiles (full_name, national_id, phone_number, county, role)
    values (p_full_name, p_national_id, p_phone_number, p_county, 'victim')
    returning id into new_profile_id;

    insert into public.wallets (profile_id, balance)
    values (new_profile_id, 0);

    return new_profile_id;
end;
$$;

-- Process Aid Purchase
create or replace function public.process_aid_purchase(
    victim_profile_id uuid,
    merchant_profile_id uuid,
    purchase_amount numeric,
    idempotency_key uuid
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
    victim_wallet_id uuid;
    victim_balance numeric;
    merchant_wallet_id uuid;
    debit_description text;
    credit_description text;
begin
    if exists (select 1 from public.ledger where idempotency_key = process_aid_purchase.idempotency_key) then
        return 'Transaction already processed.';
    end if;
    
    select id, balance into victim_wallet_id, victim_balance
    from public.wallets where profile_id = victim_profile_id;

    if not found then raise exception 'Victim wallet not found'; end if;
    if victim_balance < purchase_amount then raise exception 'Insufficient balance'; end if;

    select id into merchant_wallet_id
    from public.wallets where profile_id = merchant_profile_id;

    if not found then raise exception 'Merchant wallet not found'; end if;

    debit_description := 'Purchase at ' || (select full_name from profiles where id = merchant_profile_id);
    credit_description := 'Payment from ' || (select full_name from profiles where id = victim_profile_id);

    insert into public.ledger (wallet_id, amount, transaction_type, idempotency_key, description)
    values (victim_wallet_id, -purchase_amount, 'PURCHASE', idempotency_key, debit_description);

    insert into public.ledger (wallet_id, amount, transaction_type, idempotency_key, description)
    values (merchant_wallet_id, purchase_amount, 'PURCHASE', gen_random_uuid(), credit_description);

    update public.wallets set balance = balance - purchase_amount where id = victim_wallet_id;
    update public.wallets set balance = balance + purchase_amount where id = merchant_wallet_id;

    return 'Transaction successful';
end;
$$;

-- Disburse Aid
create or replace function public.disburse_aid(
    victim_profile_ids uuid[],
    disbursement_amount numeric,
    p_campaign_id uuid,
    idempotency_key_prefix text
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
    victim_id uuid;
    victim_wallet_id uuid;
    idem_key uuid;
    campaign_name_text text;
begin
    select name into campaign_name_text from public.campaigns where id = p_campaign_id;
    if not found then raise exception 'Campaign not found'; end if;

    foreach victim_id in array victim_profile_ids
    loop
        select id into victim_wallet_id from public.wallets where profile_id = victim_id;
        if found then
            idem_key := cast(md5(idempotency_key_prefix || victim_id::text) as uuid);
            if not exists (select 1 from public.ledger where idempotency_key = idem_key) then
                insert into public.ledger (wallet_id, campaign_id, amount, transaction_type, idempotency_key, description)
                values (victim_wallet_id, p_campaign_id, disbursement_amount, 'AID_DISBURSEMENT', idem_key, 'Aid disbursement: ' || campaign_name_text);

                update public.wallets set balance = balance + disbursement_amount where id = victim_wallet_id;
            end if;
        end if;
    end loop;

    return 'Disbursement process completed.';
end;
$$;
