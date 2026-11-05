CREATE TABLE public.founder_codes (
  code text PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.founder_codes TO service_role;

ALTER TABLE public.founder_codes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_invite_code(_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.invite_codes WHERE code = trim(_code))
     OR EXISTS (SELECT 1 FROM public.founder_codes WHERE lower(code) = lower(trim(_code)))
$function$;