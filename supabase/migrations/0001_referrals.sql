-- SolCleanup referrals.
-- Only the Next.js server (secret key) reads or writes these tables. RLS is on
-- with no policies, so the public/publishable key can do nothing.
-- Claimer wallets are never stored: a claim row holds only its signature,
-- the referral code and the amounts read back from the confirmed transaction.

create table public.referrers (
  code        text primary key check (code ~ '^[a-z0-9]{6,12}$'),
  wallet      text not null unique check (char_length(wallet) between 32 and 44),
  created_at  timestamptz not null default now()
);

create table public.referral_claims (
  signature         text primary key check (char_length(signature) between 64 and 100),
  code              text not null references public.referrers (code) on delete cascade,
  fee_lamports      bigint not null check (fee_lamports >= 0),
  referral_lamports bigint not null check (referral_lamports >= 0),
  created_at        timestamptz not null default now()
);

create index referral_claims_code_idx on public.referral_claims (code);

alter table public.referrers enable row level security;
alter table public.referral_claims enable row level security;

-- Totals for one referrer, used by the Rewards page.
create or replace function public.referral_stats(p_code text)
returns table (claims bigint, earned_lamports bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::bigint, coalesce(sum(referral_lamports), 0)::bigint
  from public.referral_claims
  where code = p_code;
$$;

revoke all on function public.referral_stats(text) from public, anon, authenticated;
grant execute on function public.referral_stats(text) to service_role;
