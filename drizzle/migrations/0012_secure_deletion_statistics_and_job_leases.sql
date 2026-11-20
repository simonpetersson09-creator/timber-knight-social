ALTER TABLE public.players ADD COLUMN deleted_at timestamptz;

CREATE INDEX friendships_addressee_idx ON public.friendships (addressee);
CREATE INDEX games_host_idx ON public.games (host);
CREATE INDEX game_chat_player_idx ON public.game_chat (player);
CREATE INDEX push_outbox_player_idx ON public.push_outbox (player);

CREATE TABLE public.job_leases (
  name text PRIMARY KEY,
  owner uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.job_leases TO service_role;
ALTER TABLE public.job_leases ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.anonymize_chess_player(p_player uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_player IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('delete:' || p_player::text, 0));
  IF NOT EXISTS (SELECT 1 FROM public.players WHERE id = p_player AND deleted_at IS NULL) THEN
    RETURN false;
  END IF;

  DELETE FROM public.friendships WHERE requester = p_player OR addressee = p_player;
  DELETE FROM public.games
    WHERE status IN ('waiting', 'active')
      AND p_player IN (host, invitee, white, black);
  DELETE FROM public.game_chat WHERE player = p_player;
  DELETE FROM public.app_days WHERE player = p_player;
  DELETE FROM public.client_events WHERE player = p_player;
  DELETE FROM public.push_outbox WHERE player = p_player;

  UPDATE public.players SET
    secret_hash = md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text),
    name = NULL,
    avatar = '♞',
    country = NULL,
    friend_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    tz = NULL,
    push_token = NULL,
    notify = false,
    notify_turn = false,
    notify_reminders = false,
    notify_play = false,
    last_played = NULL,
    last_reminder = NULL,
    lang = 'en',
    deleted_at = now()
  WHERE id = p_player AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.anonymize_chess_player(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_chess_player(uuid) TO service_role;

CREATE FUNCTION public.claim_chess_job(p_job text, p_owner uuid, p_lease_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_claimed boolean;
BEGIN
  IF p_job !~ '^[a-z_]{2,40}$' OR p_owner IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'invalid_job_lease';
  END IF;
  INSERT INTO public.job_leases (name, owner, expires_at, updated_at)
  VALUES (p_job, p_owner, now() + make_interval(secs => p_lease_seconds), now())
  ON CONFLICT (name) DO UPDATE SET
    owner = EXCLUDED.owner,
    expires_at = EXCLUDED.expires_at,
    updated_at = EXCLUDED.updated_at
  WHERE job_leases.expires_at <= now()
  RETURNING true INTO v_claimed;
  RETURN coalesce(v_claimed, false);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_chess_job(text,uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_chess_job(text,uuid,integer) TO service_role;

CREATE FUNCTION public.release_chess_job(p_job text, p_owner uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.job_leases WHERE name = p_job AND owner = p_owner;
$$;
REVOKE ALL ON FUNCTION public.release_chess_job(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_chess_job(text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.leaderboard(p_kind text, p_country text)
RETURNS TABLE(player uuid, name text, avatar text, country text, player_number bigint, score bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH rows AS (
   SELECT m.white AS p, m.black AS opponent, (m.result='w') AS won, m.finished_at, m.counts FROM public.matches AS m
   UNION ALL
   SELECT m.black AS p, m.white AS opponent, (m.result='b') AS won, m.finished_at, m.counts FROM public.matches AS m
 ), scored AS (
   SELECT r.p, CASE WHEN p_kind='month' THEN count(*) ELSE count(*) FILTER(WHERE r.won) END AS score
   FROM rows AS r
   JOIN public.players AS self ON self.id = r.p
     AND self.platform IN ('ios','android') AND NOT self.is_test AND self.deleted_at IS NULL
   JOIN public.players AS other ON other.id = r.opponent
     AND other.platform IN ('ios','android') AND NOT other.is_test
   WHERE r.counts AND r.finished_at >= (CASE p_kind
     WHEN 'week' THEN date_trunc('week',now() AT TIME ZONE 'Europe/Stockholm')
     WHEN 'month' THEN date_trunc('month',now() AT TIME ZONE 'Europe/Stockholm')
     ELSE date_trunc('year',now() AT TIME ZONE 'Europe/Stockholm') END AT TIME ZONE 'Europe/Stockholm')
   GROUP BY r.p
 )
 SELECT pl.id, pl.name, pl.avatar, pl.country, pl.player_number, s.score
 FROM scored AS s JOIN public.players AS pl ON pl.id=s.p
 WHERE s.score>0 AND (p_country IS NULL OR pl.country=p_country)
 ORDER BY s.score DESC, pl.player_number
 LIMIT CASE WHEN p_kind IN ('week','month') THEN 10 ELSE 50 END
$$;
REVOKE ALL ON FUNCTION public.leaderboard(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard(text,text) TO service_role;