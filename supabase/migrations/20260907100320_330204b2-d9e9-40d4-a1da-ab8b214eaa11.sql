-- RLS policies invoke has_role/can_write as the requesting user,
-- so authenticated must be able to execute them (they are SECURITY DEFINER and safe).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write(uuid) TO authenticated;