CREATE TABLE public.invite_codes (
  user_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invite_codes TO authenticated;
GRANT ALL ON public.invite_codes TO service_role;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_invite_code ON public.invite_codes FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.gen_invite_code() RETURNS text LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; c text; i int;
BEGIN
  LOOP
    c := '';
    FOR i IN 1..7 LOOP c := c || substr(chars, 1 + floor(random()*length(chars))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE code = c);
  END LOOP;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.check_invite_code(_code text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.invite_codes WHERE code = trim(_code))
$$;
GRANT EXECUTE ON FUNCTION public.check_invite_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_my_invite_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE me uuid := auth.uid(); c text; inv uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT code INTO c FROM public.invite_codes WHERE user_id = me;
  IF c IS NOT NULL THEN RETURN c; END IF;
  SELECT ic.user_id INTO inv FROM auth.users u JOIN public.invite_codes ic ON ic.code = u.raw_user_meta_data->>'invite_code' WHERE u.id = me;
  c := public.gen_invite_code();
  INSERT INTO public.invite_codes(user_id, code, invited_by) VALUES (me, c, inv) ON CONFLICT DO NOTHING;
  SELECT code INTO c FROM public.invite_codes WHERE user_id = me;
  RETURN c;
END $$;
GRANT EXECUTE ON FUNCTION public.ensure_my_invite_code() TO authenticated;

INSERT INTO public.invite_codes(user_id, code) SELECT id, public.gen_invite_code() FROM auth.users ON CONFLICT DO NOTHING;