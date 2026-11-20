CREATE TABLE public.push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text NOT NULL UNIQUE,
  player uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  message_key text NOT NULL, params jsonb NOT NULL DEFAULT '{}'::jsonb, data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
GRANT ALL ON public.push_outbox TO service_role;
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;
CREATE INDEX push_outbox_claim ON public.push_outbox (status, available_at, created_at);
CREATE FUNCTION public.enqueue_push(p_event text, p_player uuid, p_key text, p_params jsonb DEFAULT '{}'::jsonb, p_data jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.push_outbox (event_key, player, message_key, params, data)
  VALUES (p_event, p_player, p_key, p_params, p_data) ON CONFLICT (event_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.enqueue_push(text,uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.record_game_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid; actor uuid; actor_name text; event text; kind text; params jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.kind = 'invite' AND NEW.status = 'waiting' AND NEW.invitee IS NOT NULL THEN
    event := 'invite:' || NEW.id::text; kind := 'pushInvite'; recipient := NEW.invitee; actor := NEW.host;
  ELSIF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') AND NEW.invitee IS NOT NULL THEN
    event := 'joined:' || NEW.id::text; kind := 'pushLobbyJoined'; recipient := NEW.host; actor := NEW.invitee;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'active' AND NEW.pgn IS DISTINCT FROM OLD.pgn THEN
    event := 'turn:' || NEW.id::text || ':' || md5(NEW.fen); kind := 'pushTurn';
    actor := CASE split_part(OLD.fen, ' ', 2) WHEN 'w' THEN OLD.white ELSE OLD.black END;
    recipient := CASE split_part(OLD.fen, ' ', 2) WHEN 'w' THEN OLD.black ELSE OLD.white END;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'active' AND NEW.reminded AND NOT OLD.reminded THEN
    event := 'remind:' || NEW.id::text || ':' || NEW.last_move_at::text; kind := 'pushRemindMove';
    recipient := CASE split_part(NEW.fen, ' ', 2) WHEN 'w' THEN NEW.white ELSE NEW.black END; actor := NULL;
  ELSE RETURN NEW;
  END IF;
  IF actor IS NOT NULL THEN
    SELECT coalesce(name, '#' || player_number::text) INTO actor_name FROM public.players WHERE id = actor;
    params := jsonb_build_object('name', coalesce(actor_name, '?'));
  END IF;
  IF recipient IS NOT NULL THEN PERFORM public.enqueue_push(event, recipient, kind, params, jsonb_build_object('game', NEW.id::text)); END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_game_push() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER chess_game_push AFTER INSERT OR UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.record_game_push();
CREATE FUNCTION public.record_play_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.last_reminder IS NOT NULL AND NEW.last_reminder IS DISTINCT FROM OLD.last_reminder THEN
    PERFORM public.enqueue_push('play:' || NEW.id::text || ':' || NEW.last_reminder::text, NEW.id, 'pushPlayReminder');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_play_push() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER chess_play_push AFTER UPDATE OF last_reminder ON public.players FOR EACH ROW EXECUTE FUNCTION public.record_play_push();
CREATE FUNCTION public.claim_push_deliveries(p_limit integer DEFAULT 25)
RETURNS SETOF public.push_outbox LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH picked AS (
    SELECT id FROM public.push_outbox
    WHERE status IN ('pending','sending') AND available_at <= now() AND attempts < 8
    ORDER BY created_at LIMIT greatest(1, least(p_limit, 100)) FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.push_outbox AS o
    SET status = 'sending', attempts = o.attempts + 1, available_at = now() + interval '5 minutes'
    FROM picked WHERE o.id = picked.id RETURNING o.*
  ) SELECT * FROM claimed;
$$;
REVOKE ALL ON FUNCTION public.claim_push_deliveries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_deliveries(integer) TO service_role;
CREATE FUNCTION public.finish_push_delivery(p_id uuid, p_attempts integer, p_success boolean, p_retry_seconds integer DEFAULT 60)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.push_outbox
  SET status = CASE WHEN p_success THEN 'sent' WHEN attempts >= 8 THEN 'failed' ELSE 'pending' END,
      sent_at = CASE WHEN p_success THEN now() ELSE NULL END,
      available_at = CASE WHEN p_success THEN available_at ELSE now() + make_interval(secs => greatest(5, least(p_retry_seconds, 86400))) END
  WHERE id = p_id AND attempts = p_attempts AND status = 'sending';
$$;
REVOKE ALL ON FUNCTION public.finish_push_delivery(uuid,integer,boolean,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_push_delivery(uuid,integer,boolean,integer) TO service_role;