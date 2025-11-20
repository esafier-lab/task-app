-- Stripe integration setup
-- Note: Stripe customer creation/deletion is handled via Edge Functions,
-- not database triggers, as Supabase doesn't support foreign data wrappers
-- for direct Stripe API access from SQL.

-- Security policy: Users can read their own Stripe data
create policy "Users can read own Stripe data"
  on public.profiles
  for select
  using (auth.uid() = user_id);