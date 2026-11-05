CREATE TABLE public.wallet_balances (
  user_id uuid PRIMARY KEY,
  balance numeric NOT NULL DEFAULT 10000 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_balances TO authenticated;
GRANT ALL ON public.wallet_balances TO service_role;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_balance ON public.wallet_balances FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.wallet_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  sender_email text NOT NULL DEFAULT '',
  recipient_email text NOT NULL DEFAULT '',
  amount numeric NOT NULL CHECK (amount > 0),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transfers TO authenticated;
GRANT ALL ON public.wallet_transfers TO service_role;
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_transfers ON public.wallet_transfers FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE INDEX wallet_transfers_sender_idx ON public.wallet_transfers(sender_id, created_at DESC);
CREATE INDEX wallet_transfers_recipient_idx ON public.wallet_transfers(recipient_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ensure_my_wallet()
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  INSERT INTO public.wallet_balances(user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  SELECT balance INTO b FROM public.wallet_balances WHERE user_id = auth.uid();
  RETURN b;
END $$;

CREATE OR REPLACE FUNCTION public.transfer_funds(_recipient_email text, _amount numeric, _note text DEFAULT '')
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  RETURN b - _amount;
END $$;

REVOKE ALL ON FUNCTION public.ensure_my_wallet() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_funds(text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_funds(text, numeric, text) TO authenticated;