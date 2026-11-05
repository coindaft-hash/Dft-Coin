CREATE OR REPLACE FUNCTION public.my_team_withdrawals(_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, member text, team_level integer, network text, amount numeric, status text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    SELECT ic.user_id, 1 AS depth, ARRAY[auth.uid(), ic.user_id] AS visited
    FROM public.invite_codes ic WHERE ic.invited_by = auth.uid() AND ic.user_id <> auth.uid()
    UNION ALL
    SELECT ic.user_id, h.depth + 1, h.visited || ic.user_id
    FROM public.invite_codes ic JOIN hierarchy h ON ic.invited_by = h.user_id
    WHERE h.depth < 4 AND NOT ic.user_id = ANY(h.visited)
  ), members AS (
    SELECT DISTINCT ON (h.user_id) h.user_id, h.depth FROM hierarchy h ORDER BY h.user_id, h.depth
  )
  SELECT w.id,
    CASE WHEN u.email IS NULL THEN 'Member' ELSE left(split_part(u.email, '@', 1), 3) || '***@' || split_part(u.email, '@', 2) END,
    m.depth, w.network, w.amount, w.status, w.created_at
  FROM members m
  JOIN public.withdrawals w ON w.user_id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  ORDER BY w.created_at DESC
  LIMIT least(greatest(coalesce(_limit, 50), 1), 200);
END
$$;
REVOKE ALL ON FUNCTION public.my_team_withdrawals(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_team_withdrawals(integer) TO authenticated, service_role;