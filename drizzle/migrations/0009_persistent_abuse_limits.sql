CREATE TABLE public.abuse_limits (
  action text NOT NULL,
  subject_hash text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0 CHECK (hits >= 0),
  blocked_until timestamptz,
  PRIMARY KEY (action, subject_hash)
);
GRANT ALL ON public.abuse_limits TO service_role;
ALTER TABLE public.abuse_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX abuse_limits_blocked_until_idx ON public.abuse_limits (blocked_until) WHERE blocked_until IS NOT NULL;

CREATE OR REPLACE FUNCTION public.chess_abuse_limit(
  p_action text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer,
  p_block_seconds integer,
  p_consume boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_row public.abuse_limits%ROWTYPE;
BEGIN
  IF p_action !~ '^[a-z_]{2,40}$' OR length(p_subject) != 64 OR p_limit < 1 OR p_limit > 100000 OR p_window_seconds < 1 OR p_window_seconds > 604800 OR p_block_seconds < 0 OR p_block_seconds > 604800 THEN
    RAISE EXCEPTION 'invalid_abuse_limit';
  END IF;

  INSERT INTO public.abuse_limits (action, subject_hash)
  VALUES (p_action, p_subject)
  ON CONFLICT (action, subject_hash) DO NOTHING;

  SELECT * INTO v_row
  FROM public.abuse_limits
  WHERE action = p_action AND subject_hash = p_subject
  FOR UPDATE;

  IF v_row.blocked_until IS NOT NULL AND v_row.blocked_until > v_now THEN
    RETURN false;
  END IF;

  IF v_row.window_started_at + make_interval(secs => p_window_seconds) <= v_now THEN
    UPDATE public.abuse_limits
    SET window_started_at = v_now,
        hits = CASE WHEN p_consume THEN 1 ELSE 0 END,
        blocked_until = NULL
    WHERE action = p_action AND subject_hash = p_subject;
    RETURN true;
  END IF;

  IF v_row.hits >= p_limit THEN
    UPDATE public.abuse_limits
    SET blocked_until = v_now + make_interval(secs => p_block_seconds)
    WHERE action = p_action AND subject_hash = p_subject;
    RETURN false;
  END IF;

  IF p_consume THEN
    UPDATE public.abuse_limits
    SET hits = hits + 1
    WHERE action = p_action AND subject_hash = p_subject;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.chess_abuse_limit(text, text, integer, integer, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chess_abuse_limit(text, text, integer, integer, integer, boolean) TO service_role;