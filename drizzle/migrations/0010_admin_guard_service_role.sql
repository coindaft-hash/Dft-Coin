CREATE OR REPLACE FUNCTION public.admin_guard() RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'service_role' THEN RETURN; END IF;
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
END $$;