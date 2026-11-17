-- Users can pick their own code (3–16 chars: a–z, 0–9, _ and -).
-- Renaming a code carries its claim history along (on update cascade).
alter table public.referrers drop constraint if exists referrers_code_check;
alter table public.referrers add constraint referrers_code_check check (code ~ '^[a-z0-9_-]{3,16}$');
alter table public.referral_claims drop constraint if exists referral_claims_code_fkey;
alter table public.referral_claims
  add constraint referral_claims_code_fkey foreign key (code)
  references public.referrers (code) on update cascade on delete cascade;
