CREATE OR REPLACE FUNCTION public.my_team_levels(_day_start timestamptz DEFAULT date_trunc('day', now()))
RETURNS TABLE(user_id uuid, member text, joined_at timestamptz, code text, team_level integer, funded boolean, effective_amount numeric, reward numeric, today_reward numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  RETURN QUERY
  WITH RECURSIVE hierarchy AS (
    SELECT ic.user_id, ic.created_at, ic.code, 1 AS depth, ARRAY[auth.uid(), ic.user_id] AS visited
    FROM public.invite_codes ic WHERE ic.invited_by = auth.uid() AND ic.user_id <> auth.uid()
    UNION ALL
    SELECT ic.user_id, ic.created_at, ic.code, h.depth + 1, h.visited || ic.user_id
    FROM public.invite_codes ic JOIN hierarchy h ON ic.invited_by = h.user_id
    WHERE h.depth < 4 AND NOT ic.user_id = ANY(h.visited)
  )
  SELECT h.user_id,
    CASE WHEN u.email IS NULL THEN 'Member' ELSE left(split_part(u.email, '@', 1), 3) || '***@' || split_part(u.email, '@', 2) END,
    h.created_at, h.code, h.depth,
    coalesce(d.amount, 0) > 0, coalesce(d.amount, 0),
    coalesce(r.amount, 0), coalesce(r.today_amount, 0)
  FROM hierarchy h LEFT JOIN auth.users u ON u.id = h.user_id
  LEFT JOIN LATERAL (
    SELECT sum(w.amount) AS amount FROM public.wallet_ledger w WHERE w.user_id = h.user_id AND w.kind = 'deposit_credit'
  ) d ON true
  LEFT JOIN LATERAL (
    SELECT sum(w.amount) AS amount, sum(w.amount) FILTER (WHERE w.created_at >= _day_start AND w.created_at < _day_start + interval '1 day') AS today_amount
    FROM public.wallet_ledger w WHERE w.user_id = auth.uid() AND w.kind = 'referral_bonus' AND w.ref_id = h.user_id
  ) r ON true
  ORDER BY h.depth, h.created_at DESC;
END
$function$;
REVOKE ALL ON FUNCTION public.my_team_levels(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_team_levels(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_team_levels(timestamptz) TO service_role;
COMMENT ON FUNCTION public.my_team_levels(timestamptz) IS 'Owner-scoped four-level referral reporting. Active means credited deposits. Rewards count only ledger rewards credited to the caller; no new multi-level commission rules.';