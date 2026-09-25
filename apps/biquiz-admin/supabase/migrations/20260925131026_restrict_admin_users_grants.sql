-- Keep admin_users out of the anon role; signed-in users can only see their own row (RLS).
REVOKE ALL ON public.admin_users FROM anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;
