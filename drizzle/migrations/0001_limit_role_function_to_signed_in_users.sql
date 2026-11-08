REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.set_order_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_order_updated_at() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_order_updated_at() TO service_role;