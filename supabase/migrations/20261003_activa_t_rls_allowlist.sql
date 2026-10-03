-- Keep the three-account Google allowlist enforced at the database boundary too.
-- This supplements the UI and API checks for direct Supabase Data API access.

drop policy if exists "activa_t_activities_owner" on public.activa_t_activities;
create policy "activa_t_activities_owner" on public.activa_t_activities
  for all to authenticated
  using (
    (select auth.uid()) = user_id
    and lower(coalesce((select auth.jwt()->>'email'), '')) in (
      'javier.rubio.martinez@gmail.com',
      'anna.batet.soler@gmail.com',
      'eva.rubio.batet@gmail.com'
    )
    and lower(coalesce((select auth.jwt()->'app_metadata'->>'provider'), '')) = 'google'
  )
  with check (
    (select auth.uid()) = user_id
    and lower(coalesce((select auth.jwt()->>'email'), '')) in (
      'javier.rubio.martinez@gmail.com',
      'anna.batet.soler@gmail.com',
      'eva.rubio.batet@gmail.com'
    )
    and lower(coalesce((select auth.jwt()->'app_metadata'->>'provider'), '')) = 'google'
  );

drop policy if exists "activa_t_weights_owner" on public.activa_t_weights;
create policy "activa_t_weights_owner" on public.activa_t_weights
  for all to authenticated
  using (
    (select auth.uid()) = user_id
    and lower(coalesce((select auth.jwt()->>'email'), '')) in (
      'javier.rubio.martinez@gmail.com',
      'anna.batet.soler@gmail.com',
      'eva.rubio.batet@gmail.com'
    )
    and lower(coalesce((select auth.jwt()->'app_metadata'->>'provider'), '')) = 'google'
  )
  with check (
    (select auth.uid()) = user_id
    and lower(coalesce((select auth.jwt()->>'email'), '')) in (
      'javier.rubio.martinez@gmail.com',
      'anna.batet.soler@gmail.com',
      'eva.rubio.batet@gmail.com'
    )
    and lower(coalesce((select auth.jwt()->'app_metadata'->>'provider'), '')) = 'google'
  );

drop policy if exists "activa_t_activity_types_owner" on public.activa_t_activity_types;
create policy "activa_t_activity_types_owner" on public.activa_t_activity_types
  for all to authenticated
  using (
    (select auth.uid()) = user_id
    and lower(coalesce((select auth.jwt()->>'email'), '')) in (
      'javier.rubio.martinez@gmail.com',
      'anna.batet.soler@gmail.com',
      'eva.rubio.batet@gmail.com'
    )
    and lower(coalesce((select auth.jwt()->'app_metadata'->>'provider'), '')) = 'google'
  )
  with check (
    (select auth.uid()) = user_id
    and lower(coalesce((select auth.jwt()->>'email'), '')) in (
      'javier.rubio.martinez@gmail.com',
      'anna.batet.soler@gmail.com',
      'eva.rubio.batet@gmail.com'
    )
    and lower(coalesce((select auth.jwt()->'app_metadata'->>'provider'), '')) = 'google'
  );
