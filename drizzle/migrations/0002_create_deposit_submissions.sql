CREATE TABLE public.deposit_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 network text NOT NULL CHECK (network IN ('bsc','ethereum')),
 tx_hash text NOT NULL CHECK (tx_hash ~ '^0x[0-9a-f]{64}$'),
 expected_amount numeric(24,8) NOT NULL CHECK (expected_amount > 0 AND expected_amount <= 100000),
 detected_amount numeric(30,18),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirming','review','rejected','unavailable')),
 confirmations integer NOT NULL DEFAULT 0,
 message text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 checked_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id, network, tx_hash)
);
GRANT SELECT ON public.deposit_submissions TO authenticated;
GRANT ALL ON public.deposit_submissions TO service_role;
ALTER TABLE public.deposit_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY deposit_owner_read ON public.deposit_submissions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX deposit_owner_created ON public.deposit_submissions(user_id, created_at DESC);
COMMENT ON TABLE public.deposit_submissions IS 'Authenticated deposit claims. On-chain receipt verification does not prove payer ownership; review never automatically credits a local test balance.';