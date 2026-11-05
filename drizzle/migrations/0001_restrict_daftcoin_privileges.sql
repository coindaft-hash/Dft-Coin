REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.update_daft_quote(text,numeric,text) FROM anon;
REVOKE ALL ON public.daft_quote FROM anon, authenticated;
GRANT SELECT ON public.daft_quote TO anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
REVOKE ALL ON public.daft_price_events FROM anon, authenticated;
GRANT SELECT ON public.daft_price_events TO authenticated;