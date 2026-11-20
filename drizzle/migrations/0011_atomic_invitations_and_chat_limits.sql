CREATE UNIQUE INDEX games_waiting_invite_pair_once ON public.games (least(host, invitee), greatest(host, invitee)) WHERE kind = 'invite' AND status = 'waiting' AND invitee IS NOT NULL;
CREATE FUNCTION public.invite_chess_friend(p_player uuid, p_friend uuid)
RETURNS TABLE(id uuid, event text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_game public.games%ROWTYPE; v_now timestamptz;
BEGIN
  IF p_player IS NULL OR p_friend IS NULL OR p_player = p_friend THEN RAISE EXCEPTION 'not_friends'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('mrbchess_invite_v1:' || least(p_player, p_friend)::text || ':' || greatest(p_player, p_friend)::text, 0));
  IF NOT EXISTS (SELECT 1 FROM public.friendships AS f WHERE f.status = 'accepted' AND least(f.requester, f.addressee) = least(p_player, p_friend) AND greatest(f.requester, f.addressee) = greatest(p_player, p_friend)) THEN RAISE EXCEPTION 'not_friends'; END IF;
  SELECT g.* INTO v_game FROM public.games AS g WHERE g.kind = 'invite' AND g.status = 'active' AND least(g.host, g.invitee) = least(p_player, p_friend) AND greatest(g.host, g.invitee) = greatest(p_player, p_friend) AND g.expires_at > clock_timestamp() ORDER BY g.created_at, g.id LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN QUERY SELECT v_game.id, 'reused'::text; RETURN; END IF;
  SELECT g.* INTO v_game FROM public.games AS g WHERE g.kind = 'invite' AND g.status = 'waiting' AND least(g.host, g.invitee) = least(p_player, p_friend) AND greatest(g.host, g.invitee) = greatest(p_player, p_friend) ORDER BY g.created_at, g.id LIMIT 1 FOR UPDATE;
  v_now := clock_timestamp();
  IF FOUND THEN
    IF v_game.expires_at <= v_now THEN
      UPDATE public.games AS g SET status = 'expired', updated_at = v_now WHERE g.id = v_game.id;
    ELSIF v_game.host = p_player THEN
      RETURN QUERY SELECT v_game.id, 'reused'::text; RETURN;
    ELSE
      UPDATE public.games AS g SET status = 'active', white = v_game.host, black = p_player, invitee = p_player, last_move_at = v_now, expires_at = v_now + interval '48 hours', updated_at = v_now WHERE g.id = v_game.id;
      RETURN QUERY SELECT v_game.id, 'started'::text; RETURN;
    END IF;
  END IF;
  INSERT INTO public.games(kind, host, invitee, expires_at) VALUES ('invite', p_player, p_friend, v_now + interval '24 hours') RETURNING * INTO v_game;
  RETURN QUERY SELECT v_game.id, 'created'::text;
END;
$$;
REVOKE ALL ON FUNCTION public.invite_chess_friend(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invite_chess_friend(uuid,uuid) TO service_role;
CREATE INDEX game_chat_player_window ON public.game_chat(game_id, player, created_at);
CREATE FUNCTION public.enforce_chess_chat_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_game public.games%ROWTYPE; v_now timestamptz;
BEGIN
  SELECT g.* INTO v_game FROM public.games AS g WHERE g.id = NEW.game_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_active'; END IF;
  v_now := clock_timestamp();
  IF v_game.status <> 'active' OR v_game.expires_at <= v_now OR NEW.player IS NULL OR (NEW.player IS DISTINCT FROM v_game.white AND NEW.player IS DISTINCT FROM v_game.black) THEN RAISE EXCEPTION 'not_active'; END IF;
  IF NEW.phrase IS NULL OR NEW.phrase NOT BETWEEN 0 AND 11 THEN RAISE EXCEPTION 'invalid_phrase'; END IF;
  IF (SELECT count(*) FROM public.game_chat AS c WHERE c.game_id = NEW.game_id AND c.player = NEW.player AND c.created_at > v_now - interval '10 seconds') >= 3 THEN RAISE EXCEPTION 'chat_rate_limit'; END IF;
  NEW.created_at := v_now;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_chess_chat_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER chess_chat_insert_guard BEFORE INSERT ON public.game_chat FOR EACH ROW EXECUTE FUNCTION public.enforce_chess_chat_insert();