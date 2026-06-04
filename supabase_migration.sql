-- ==========================================
-- SUPABASE FULL SYSTEM RESET & INITIALIZATION
-- ==========================================

-- ==========================================
-- 0. CLEAN SLATE / DATA RESET (CASCADE DROPS)
-- ==========================================
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_user_update() cascade;
drop function if exists public.find_victim_profile(text) cascade;
drop function if exists public.register_victim(text, text, text, text) cascade;
drop function if exists public.process_aid_purchase(uuid, uuid, numeric, uuid) cascade;
drop function if exists public.disburse_aid(uuid[], numeric, uuid, text) cascade;
drop function if exists public.check_is_admin() cascade;
drop function if exists public.check_is_volunteer() cascade;

drop table if exists public.triage_sessions cascade;
drop table if exists public.ledger cascade;
drop table if exists public.campaigns cascade;
drop table if exists public.wallets cascade;
drop table if exists public.profiles cascade;

drop type if exists public.profile_role cascade;
drop type if exists public.transaction_type cascade;

-- ==========================================
-- 1. ENUMS
-- ==========================================
create type public.profile_role as enum ('admin', 'volunteer', 'merchant', 'victim');
create type public.transaction_type as enum ('AID_DISBURSEMENT', 'PURCHASE', 'FUNDS_RETURN');

-- ==========================================
-- 2. TABLES
-- ==========================================

-- Profiles Table (handles auth users and registered offline victims)
create table public.profiles (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    email text,
    full_name text,
    national_id text unique,
    phone_number text unique,
    county text,
    role public.profile_role not null default 'victim',
    status text not null default 'pending' check (status in ('pending', 'active', 'suspended'))
);
alter table public.profiles enable row level security;

-- Wallets Table
create table public.wallets (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    profile_id uuid not null unique references public.profiles(id) on delete cascade,
    balance numeric(10,2) not null default 0 check (balance >= 0)
);
alter table public.wallets enable row level security;

-- Campaigns Table
create table public.campaigns (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    name text not null,
    description text,
    amount numeric(10,2) not null default 0,
    status text check (status in ('active','completed')) default 'active'
);
alter table public.campaigns enable row level security;

-- Ledger Table (Append-only audit trail)
create table public.ledger (
    id bigserial primary key,
    created_at timestamptz not null default now(),
    wallet_id uuid references public.wallets(id) on delete cascade,
    profile_id uuid references public.profiles(id) on delete cascade,
    campaign_id uuid references public.campaigns(id) on delete set null,
    amount numeric(10,2) not null,
    transaction_type public.transaction_type not null,
    idempotency_key uuid unique,
    description text,
    metadata jsonb
);
alter table public.ledger enable row level security;

-- Triage Sessions Table
create table public.triage_sessions (
    id bigserial primary key,
    created_at timestamptz default now(),
    victim_id uuid references public.profiles(id) on delete cascade,
    volunteer_id uuid references public.profiles(id) on delete set null,
    last_message text,
    risk_score float,
    escalated boolean default false,
    notes text,
    status text default 'open'
);
alter table public.triage_sessions enable row level security;

-- ==========================================
-- 3. ROLE CHECK FUNCTIONS (SECURITY DEFINER)
-- ==========================================
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

-- ==========================================
-- 4. RLS POLICIES
-- ==========================================

-- Profiles
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

-- Wallets
drop policy if exists "view own wallet" on public.wallets;
create policy "view own wallet" on public.wallets for select using (profile_id = auth.uid());

drop policy if exists "admin view wallets" on public.wallets;
create policy "admin view wallets" on public.wallets for select using (public.check_is_admin());

-- Campaigns
drop policy if exists "authenticated view campaigns" on public.campaigns;
create policy "authenticated view campaigns" on public.campaigns for select using (auth.role() = 'authenticated');

drop policy if exists "admin manage campaigns" on public.campaigns;
create policy "admin manage campaigns" on public.campaigns for all using (public.check_is_admin());

-- Ledger
drop policy if exists "view own ledger" on public.ledger;
create policy "view own ledger" on public.ledger for select using (profile_id = auth.uid());

drop policy if exists "admin view ledger" on public.ledger;
create policy "admin view ledger" on public.ledger for select using (public.check_is_admin());

-- Triage Sessions
drop policy if exists "admin manage triage" on public.triage_sessions;
create policy "admin manage triage" on public.triage_sessions for all using (public.check_is_admin());

drop policy if exists "volunteers view own triage" on public.triage_sessions;
create policy "volunteers view own triage" on public.triage_sessions for select using (
  public.check_is_volunteer() and (volunteer_id = auth.uid() or volunteer_id is null)
);

drop policy if exists "volunteers update own triage" on public.triage_sessions;
create policy "volunteers update own triage" on public.triage_sessions for update using (
  public.check_is_volunteer() and volunteer_id = auth.uid()
) with check (
  public.check_is_volunteer() and volunteer_id = auth.uid()
);

-- ==========================================
-- 5. AUTH TRIGGERS & TRIGGERS FUNCTIONS
-- ==========================================

-- Trigger to handle user creation on Signup in Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare 
    v_role public.profile_role;
    v_role_text text;
    v_status text;
    v_phone text;
    v_nat_id text;
begin
    -- If signing up with the master email, they become admin immediately
    if new.email = 'edwindezak@gmail.com' then
        v_role := 'admin';
        if new.email_confirmed_at is not null then
            v_status := 'active';
        else
            v_status := 'pending';
        end if;
    else
        -- Safely extract and check role to assign
        v_role_text := coalesce(new.raw_user_meta_data->>'role', 'volunteer');
        if v_role_text = 'admin' then
            v_role := 'admin';
        elsif v_role_text = 'merchant' then
            v_role := 'merchant';
        elsif v_role_text = 'victim' then
            v_role := 'victim';
        else
            v_role := 'volunteer';
        end if;

        -- Set active status directly if already confirmed, or if they are merchants/victims (no verification needed)
        if new.email_confirmed_at is not null or v_role = 'merchant' or v_role = 'victim' then
            v_status := 'active';
        else
            v_status := 'pending';
        end if;
    end if;

    -- Normalize and handle unique constraint safe parameters
    v_phone := nullif(trim(new.raw_user_meta_data->>'phone_number'), '');
    if v_phone = '+254' or v_phone = '254' or v_phone = '' then
        v_phone := null;
    end if;

    if v_phone is not null and exists (select 1 from public.profiles where phone_number = v_phone and id != new.id) then
        v_phone := null;
    end if;

    v_nat_id := nullif(trim(new.raw_user_meta_data->>'national_id'), '');
    if v_nat_id is not null and exists (select 1 from public.profiles where national_id = v_nat_id and id != new.id) then
        v_nat_id := null;
    end if;

    insert into public.profiles (id, email, full_name, national_id, phone_number, county, role, status)
    values (
        new.id, 
        new.email, 
        nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
        v_nat_id,
        v_phone,
        nullif(trim(new.raw_user_meta_data->>'county'), ''),
        v_role,
        v_status
    )
    on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, profiles.full_name),
        national_id = coalesce(excluded.national_id, profiles.national_id),
        phone_number = coalesce(excluded.phone_number, profiles.phone_number),
        county = coalesce(excluded.county, profiles.county),
        role = excluded.role,
        status = excluded.status;

    -- Initialize standard empty Wallet for the profile
    insert into public.wallets (profile_id, balance) 
    values (new.id, 0)
    on conflict (profile_id) do nothing;

    return new;
end;
$$;

-- Trigger to handle user update (upon email confirmation)
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
as $$
begin
    -- Check if email_confirmed_at transitioned from null to verified
    if new.email_confirmed_at is not null and old.email_confirmed_at is null then
        if new.email = 'edwindezak@gmail.com' then
            update public.profiles
            set status = 'active', role = 'admin'
            where id = new.id;
        else
            update public.profiles
            set status = 'active'
            where id = new.id;
        end if;
    end if;
    return new;
end;
$$;

-- Connect Triggers on auth.users
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create trigger on_auth_user_updated
after update on auth.users
for each row execute procedure public.handle_user_update();

-- ==========================================
-- 6. SECURE RPC FUNCTIONS (BUSINESS LOGIC)
-- ==========================================

-- Secure finder of victim profile by varying ID parameters
create or replace function public.find_victim_profile(p_identifier text)
returns table (
    id uuid,
    full_name text,
    national_id text,
    phone_number text,
    county text,
    role public.profile_role
)
language plpgsql
security definer set search_path = public
as $$
begin
    if auth.role() != 'authenticated' then
        raise exception 'Not authorized';
    end if;

    return query
    select p.id, p.full_name, p.national_id, p.phone_number, p.county, p.role
    from public.profiles p
    where p.role = 'victim'
      and (
        p.national_id = trim(p_identifier)
        or p.phone_number = trim(p_identifier)
        or upper(right(p.id::text, 6)) = upper(trim(p_identifier))
        or p.id::text = trim(p_identifier)
      )
    limit 1;
end;
$$;

-- Register Custom Victim profile (No explicit Auth Account needed)
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
    insert into public.profiles (full_name, national_id, phone_number, county, role, status)
    values (
        p_full_name, 
        nullif(trim(p_national_id), ''), 
        nullif(trim(p_phone_number), ''), 
        nullif(trim(p_county), ''), 
        'victim'::public.profile_role, 
        'active'
    )
    returning id into new_profile_id;

    insert into public.wallets (profile_id, balance)
    values (new_profile_id, 0);

    return new_profile_id;
end;
$$;

-- Process Aid Purchase securely on DB side (Atomicity & Thread-safe)
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
    -- Protect against double clicks and network double-posts
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

    debit_description := 'Purchase at ' || (select coalesce(full_name, 'Merchant') from profiles where id = merchant_profile_id);
    credit_description := 'Payment from ' || (select coalesce(full_name, 'Beneficiary') from profiles where id = victim_profile_id);

    -- Insert into debit ledger row
    insert into public.ledger (wallet_id, profile_id, amount, transaction_type, idempotency_key, description)
    values (victim_wallet_id, victim_profile_id, -purchase_amount, 'PURCHASE', idempotency_key, debit_description);

    -- Insert into credit ledger row (generated UUID for other side)
    insert into public.ledger (wallet_id, profile_id, amount, transaction_type, idempotency_key, description)
    values (merchant_wallet_id, merchant_profile_id, purchase_amount, 'PURCHASE', gen_random_uuid(), credit_description);

    -- Update balances in single thread-safe step
    update public.wallets set balance = balance - purchase_amount where id = victim_wallet_id;
    update public.wallets set balance = balance + purchase_amount where id = merchant_wallet_id;

    return 'Transaction successful';
end;
$$;

-- Securely Disburse Campaign Aid
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
                insert into public.ledger (wallet_id, profile_id, campaign_id, amount, transaction_type, idempotency_key, description)
                values (victim_wallet_id, victim_id, p_campaign_id, disbursement_amount, 'AID_DISBURSEMENT', idem_key, 'Aid disbursement: ' || campaign_name_text);

                update public.wallets set balance = balance + disbursement_amount where id = victim_wallet_id;
            end if;
        end if;
    end loop;

    return 'Disbursement process completed.';
end;
$$;
