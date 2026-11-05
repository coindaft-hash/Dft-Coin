-- Profile dashboard backing: audit ledger, withdrawal requests, team view, summary.

CREATE TABLE public.wallet_ledger(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('opening_balance','transfer_in','transfer_out','referral_bonus','deposit_credit','withdrawal','withdrawal_refund','adjustment')),
  amount numeric NOT NULL,
  note text NOT NULL DEFAULT '',
  ref_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_owner_read ON public.wallet_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE UNIQUE INDEX ledger_referral_once ON public.wallet_ledger (ref_id) WHERE kind = 'referral_bonus';
CREATE INDEX ledger_user_created ON public.wallet_ledger (user_id, created_at DESC);

CREATE TABLE public.withdrawals(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  network text NOT NULL CHECK (network IN ('bsc','ethereum')),
  address text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected','cancelled')),
  message text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY withdrawals_owner_read ON public.withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX withdrawals_user_created ON public.withdrawals (user_id, created_at DESC);

-- Ledger-aware wallet bootstrap.
CREATE OR REPLACE FUNCTION public.ensure_my_wallet()
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  INSERT INTO public.wallet_balances(user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO public.wallet_ledger(user_id, kind, amount, note)
      VALUES (auth.uid(), 'opening_balance', 10000, 'Account starting balance');
  END IF;
  SELECT balance INTO b FROM public.wallet_balances WHERE user_id = auth.uid();
  RETURN b;
END $function$;

-- Transfers now leave an audit trail for both sides.
CREATE OR REPLACE FUNCTION public.transfer_funds(_recipient_email text, _amount numeric, _note text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE me uuid := auth.uid(); rid uuid; my_email text; r_email text; b numeric;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF _amount IS NULL OR _amount < 1 OR _amount > 1000000 THEN RAISE EXCEPTION 'Amount must be between 1 and 1,000,000'; END IF;
  IF _amount <> round(_amount, 2) THEN RAISE EXCEPTION 'Use at most 2 decimal places'; END IF;
  SELECT id, email INTO rid, r_email FROM auth.users WHERE lower(email) = lower(trim(_recipient_email)) LIMIT 1;
  IF rid IS NULL THEN RAISE EXCEPTION 'No account found with that email'; END IF;
  IF rid = me THEN RAISE EXCEPTION 'You cannot send to yourself'; END IF;
  SELECT email INTO my_email FROM auth.users WHERE id = me;
  INSERT INTO public.wallet_balances(user_id) VALUES (me), (rid) ON CONFLICT DO NOTHING;
  -- lock both rows in a stable order to avoid deadlocks
  PERFORM 1 FROM public.wallet_balances WHERE user_id IN (me, rid) ORDER BY user_id FOR UPDATE;
  SELECT balance INTO b FROM public.wallet_balances WHERE user_id = me;
  IF b < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  UPDATE public.wallet_balances SET balance = balance - _amount, updated_at = now() WHERE user_id = me;
  UPDATE public.wallet_balances SET balance = balance + _amount, updated_at = now() WHERE user_id = rid;
  INSERT INTO public.wallet_transfers(sender_id, recipient_id, sender_email, recipient_email, amount, note)
    VALUES (me, rid, coalesce(my_email,''), coalesce(r_email,''), _amount, left(coalesce(_note,''), 120));
  INSERT INTO public.wallet_ledger(user_id, kind, amount, note)
    VALUES (me, 'transfer_out', -_amount, 'Sent to ' || coalesce(r_email, 'member')),
           (rid, 'transfer_in', _amount, 'Received from ' || coalesce(my_email, 'member'));
  RETURN b - _amount;
END $function$;

-- Invitation code bootstrap now pays the transparent referral bonus once per member.
CREATE OR REPLACE FUNCTION public.ensure_my_invite_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE me uuid := auth.uid(); c text; inv uuid; bonus numeric := 5;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT code INTO c FROM public.invite_codes WHERE user_id = me;
  IF c IS NOT NULL THEN RETURN c; END IF;
  SELECT ic.user_id INTO inv FROM auth.users u JOIN public.invite_codes ic ON ic.code = u.raw_user_meta_data->>'invite_code' WHERE u.id = me;
  IF inv = me THEN inv := NULL; END IF;
  c := public.gen_invite_code();
  INSERT INTO public.invite_codes(user_id, code, invited_by) VALUES (me, c, inv) ON CONFLICT DO NOTHING;
  SELECT code INTO c FROM public.invite_codes WHERE user_id = me;
  IF inv IS NOT NULL THEN
    INSERT INTO public.wallet_balances(user_id) VALUES (inv) ON CONFLICT DO NOTHING;
    BEGIN
      INSERT INTO public.wallet_ledger(user_id, kind, amount, note, ref_id)
        VALUES (inv, 'referral_bonus', bonus, 'Referral bonus · an invited member joined', me);
      UPDATE public.wallet_balances SET balance = balance + bonus, updated_at = now() WHERE user_id = inv;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;
  RETURN c;
END $function$;

-- Withdrawal request: holds funds immediately, queued for manual approval.
CREATE OR REPLACE FUNCTION public.request_withdrawal(_network text, _address text, _amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE me uuid := auth.uid(); b numeric; w uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF _network IS NULL OR _network NOT IN ('bsc','ethereum') THEN RAISE EXCEPTION 'Choose BSC or Ethereum'; END IF;
  IF _address IS NULL OR _address !~ '^0x[0-9a-fA-F]{40}$' THEN RAISE EXCEPTION 'Enter a valid USDT wallet address'; END IF;
  IF _amount IS NULL OR _amount < 10 OR _amount > 1000000 THEN RAISE EXCEPTION 'Amount must be between 10 and 1,000,000'; END IF;
  IF _amount <> round(_amount, 2) THEN RAISE EXCEPTION 'Use at most 2 decimal places'; END IF;
  INSERT INTO public.wallet_balances(user_id) VALUES (me) ON CONFLICT DO NOTHING;
  SELECT balance INTO b FROM public.wallet_balances WHERE user_id = me FOR UPDATE;
  IF b < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  UPDATE public.wallet_balances SET balance = balance - _amount, updated_at = now() WHERE user_id = me;
  INSERT INTO public.withdrawals(user_id, network, address, amount, message)
    VALUES (me, _network, _address, _amount, 'Queued for manual approval') RETURNING id INTO w;
  INSERT INTO public.wallet_ledger(user_id, kind, amount, note, ref_id)
    VALUES (me, 'withdrawal', -_amount, 'Withdrawal to ' || left(_address, 8) || '…', w);
  RETURN w;
END $function$;

-- Pending requests can be cancelled; held funds return to the balance.
CREATE OR REPLACE FUNCTION public.cancel_withdrawal(_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE w public.withdrawals;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id = _id AND user_id = auth.uid() FOR UPDATE;
  IF w.id IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF w.status <> 'pending' THEN RAISE EXCEPTION 'This request can no longer be cancelled'; END IF;
  UPDATE public.withdrawals SET status = 'cancelled', reviewed_at = now(), message = 'Cancelled by account holder' WHERE id = _id;
  UPDATE public.wallet_balances SET balance = balance + w.amount, updated_at = now() WHERE user_id = auth.uid();
  INSERT INTO public.wallet_ledger(user_id, kind, amount, note, ref_id)
    VALUES (auth.uid(), 'withdrawal_refund', w.amount, 'Cancelled withdrawal refunded', _id);
  RETURN true;
END $function$;

-- One round trip for the profile figures. Every number is read from stored rows.
CREATE OR REPLACE FUNCTION public.profile_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE me uuid := auth.uid(); b numeric;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT balance INTO b FROM public.wallet_balances WHERE user_id = me;
  RETURN jsonb_build_object(
    'balance', coalesce(b, 0),
    'earnings', coalesce((SELECT sum(amount) FROM public.wallet_ledger WHERE user_id = me AND kind = 'referral_bonus'), 0),
    'deposited', coalesce((SELECT sum(amount) FROM public.wallet_ledger WHERE user_id = me AND kind = 'deposit_credit'), 0),
    'withdrawn', coalesce((SELECT -sum(amount) FROM public.wallet_ledger WHERE user_id = me AND kind = 'withdrawal'), 0),
    'team_count', coalesce((SELECT count(*) FROM public.invite_codes WHERE invited_by = me), 0),
    'deposit_count', coalesce((SELECT count(*) FROM public.deposit_submissions WHERE user_id = me), 0),
    'withdrawal_count', coalesce((SELECT count(*) FROM public.withdrawals WHERE user_id = me), 0),
    'transfer_count', coalesce((SELECT count(*) FROM public.wallet_transfers WHERE sender_id = me OR recipient_id = me), 0)
  );
END $function$;

-- Members invited by the signed-in user, with the email masked.
CREATE OR REPLACE FUNCTION public.my_team()
 RETURNS TABLE(user_id uuid, member text, joined_at timestamp with time zone, code text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ic.user_id,
         CASE WHEN u.email IS NULL THEN 'member'
              ELSE left(split_part(u.email, '@', 1), 3) || '***@' || split_part(u.email, '@', 2)
         END,
         ic.created_at, ic.code
  FROM public.invite_codes ic
  LEFT JOIN auth.users u ON u.id = ic.user_id
  WHERE ic.invited_by = auth.uid()
  ORDER BY ic.created_at DESC
$function$;