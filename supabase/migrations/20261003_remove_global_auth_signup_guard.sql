-- Supabase Auth is shared by other applications in this project. Do not apply
-- an Activa-t-specific registration trigger to auth.users.
drop trigger if exists activa_t_guard_auth_user on auth.users;
drop function if exists activa_t_private.guard_new_auth_user();
