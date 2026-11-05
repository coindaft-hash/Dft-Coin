CREATE OR REPLACE FUNCTION public.admin_guard() RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF; END $$;

CREATE OR REPLACE FUNCTION public.admin_stats() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.admin_guard();
RETURN jsonb_build_object(
 'users',(SELECT count(*) FROM auth.users),
 'pending_withdrawals',(SELECT count(*) FROM public.withdrawals WHERE status='pending'),
 'pending_withdrawal_amount',coalesce((SELECT sum(amount) FROM public.withdrawals WHERE status='pending'),0),
 'pending_deposits',(SELECT count(*) FROM public.deposit_submissions WHERE status IN ('review','confirming','pending')),
 'total_deposited',coalesce((SELECT sum(amount) FROM public.wallet_ledger WHERE kind='deposit_credit'),0),
 'total_balance',coalesce((SELECT sum(balance) FROM public.wallet_balances),0));
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_users() RETURNS TABLE(user_id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz, balance numeric, invite_code text, team_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.admin_guard();
RETURN QUERY SELECT u.id, u.email::text, coalesce(u.raw_user_meta_data->>'full_name', trim(coalesce(u.raw_user_meta_data->>'first_name','')||' '||coalesce(u.raw_user_meta_data->>'last_name',''))),
 u.created_at, u.last_sign_in_at, coalesce(b.balance,0), ic.code, (SELECT count(*) FROM public.invite_codes x WHERE x.invited_by=u.id)
FROM auth.users u LEFT JOIN public.wallet_balances b ON b.user_id=u.id LEFT JOIN public.invite_codes ic ON ic.user_id=u.id
ORDER BY u.created_at DESC LIMIT 500;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_withdrawals(_status text DEFAULT NULL) RETURNS TABLE(id uuid, user_id uuid, email text, network text, address text, amount numeric, status text, message text, created_at timestamptz, reviewed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.admin_guard();
RETURN QUERY SELECT w.id,w.user_id,u.email::text,w.network,w.address,w.amount,w.status,w.message,w.created_at,w.reviewed_at
FROM public.withdrawals w LEFT JOIN auth.users u ON u.id=w.user_id WHERE _status IS NULL OR w.status=_status ORDER BY w.created_at DESC LIMIT 300;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_deposits(_status text DEFAULT NULL) RETURNS TABLE(id uuid, user_id uuid, email text, network text, tx_hash text, expected_amount numeric, detected_amount numeric, status text, message text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.admin_guard();
RETURN QUERY SELECT d.id,d.user_id,u.email::text,d.network,d.tx_hash,d.expected_amount,d.detected_amount,d.status,d.message,d.created_at
FROM public.deposit_submissions d LEFT JOIN auth.users u ON u.id=d.user_id WHERE _status IS NULL OR d.status=_status ORDER BY d.created_at DESC LIMIT 300;
END $$;

CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_id uuid, _approve boolean, _note text DEFAULT '') RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE w public.withdrawals;
BEGIN PERFORM public.admin_guard();
SELECT * INTO w FROM public.withdrawals WHERE id=_id FOR UPDATE;
IF w.id IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
IF w.status<>'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
IF _approve THEN
 UPDATE public.withdrawals SET status='approved', reviewed_at=now(), message=coalesce(nullif(left(_note,200),''),'Approved and paid') WHERE id=_id;
ELSE
 UPDATE public.withdrawals SET status='rejected', reviewed_at=now(), message=coalesce(nullif(left(_note,200),''),'Rejected by admin') WHERE id=_id;
 INSERT INTO public.wallet_balances(user_id) VALUES (w.user_id) ON CONFLICT DO NOTHING;
 UPDATE public.wallet_balances SET balance=balance+w.amount, updated_at=now() WHERE user_id=w.user_id;
 INSERT INTO public.wallet_ledger(user_id,kind,amount,note,ref_id) VALUES (w.user_id,'withdrawal_refund',w.amount,'Rejected withdrawal refunded',_id);
END IF;
RETURN true; END $$;

CREATE OR REPLACE FUNCTION public.admin_review_deposit(_id uuid, _approve boolean, _amount numeric DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.deposit_submissions; amt numeric;
BEGIN PERFORM public.admin_guard();
SELECT * INTO d FROM public.deposit_submissions WHERE id=_id FOR UPDATE;
IF d.id IS NULL THEN RAISE EXCEPTION 'Deposit not found'; END IF;
IF d.status IN ('credited','rejected') THEN RAISE EXCEPTION 'Already reviewed'; END IF;
IF _approve THEN
 amt := coalesce(_amount, d.detected_amount, d.expected_amount);
 IF amt IS NULL OR amt<=0 OR amt>1000000 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
 IF EXISTS (SELECT 1 FROM public.deposit_submissions x WHERE x.network=d.network AND lower(x.tx_hash)=lower(d.tx_hash) AND x.status='credited') THEN RAISE EXCEPTION 'This TXID was already credited'; END IF;
 UPDATE public.deposit_submissions SET status='credited', detected_amount=coalesce(detected_amount,amt), message='Approved · '||amt||' USDT credited', checked_at=now() WHERE id=_id;
 INSERT INTO public.wallet_balances(user_id) VALUES (d.user_id) ON CONFLICT DO NOTHING;
 UPDATE public.wallet_balances SET balance=balance+amt, updated_at=now() WHERE user_id=d.user_id;
 INSERT INTO public.wallet_ledger(user_id,kind,amount,note,ref_id) VALUES (d.user_id,'deposit_credit',amt,'USDT deposit credited',_id);
ELSE
 UPDATE public.deposit_submissions SET status='rejected', message='Rejected by admin', checked_at=now() WHERE id=_id;
END IF;
RETURN true; END $$;

REVOKE ALL ON FUNCTION public.admin_guard(), public.admin_stats(), public.admin_list_users(), public.admin_list_withdrawals(text), public.admin_list_deposits(text), public.admin_review_withdrawal(uuid,boolean,text), public.admin_review_deposit(uuid,boolean,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_guard(), public.admin_stats(), public.admin_list_users(), public.admin_list_withdrawals(text), public.admin_list_deposits(text), public.admin_review_withdrawal(uuid,boolean,text), public.admin_review_deposit(uuid,boolean,numeric) TO authenticated, service_role;