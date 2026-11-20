CREATE OR REPLACE FUNCTION public.quick_match(p_player uuid, p_game uuid DEFAULT NULL)
RETURNS TABLE(id uuid, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_game public.games%ROWTYPE;
  v_other public.games%ROWTYPE;
  v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mrbchess_quick_match_v1'));

  IF p_game IS NOT NULL THEN
    SELECT * INTO v_game FROM public.games
      WHERE games.id = p_game AND games.kind = 'quick' AND games.host = p_player;
    IF NOT FOUND THEN RETURN QUERY SELECT p_game, 'expired'; RETURN; END IF;
    IF v_game.status <> 'waiting' THEN
      RETURN QUERY SELECT v_game.id, v_game.status; RETURN;
    END IF;

    SELECT * INTO v_other FROM public.games
      WHERE games.kind = 'quick' AND games.status = 'waiting' AND games.host <> p_player
        AND games.id <> p_game AND games.expires_at > now()
      ORDER BY games.created_at LIMIT 1;
    IF FOUND THEN
      UPDATE public.games SET status = 'active', white = v_other.host, black = p_player,
        invitee = p_player, last_move_at = now(), expires_at = now() + interval '48 hours', updated_at = now()
        WHERE games.id = v_other.id AND games.status = 'waiting' AND games.expires_at > now()
        RETURNING * INTO v_other;
      IF v_other.id IS NOT NULL THEN
        UPDATE public.games SET status = 'expired', updated_at = now()
          WHERE games.id = v_game.id AND games.status = 'waiting';
        RETURN QUERY SELECT v_other.id, 'active'; RETURN;
      END IF;
    END IF;
    RETURN QUERY SELECT v_game.id, v_game.status; RETURN;
  END IF;

  SELECT * INTO v_other FROM public.games
    WHERE games.kind = 'quick' AND games.status = 'waiting' AND games.host <> p_player AND games.expires_at > now()
    ORDER BY games.created_at LIMIT 1;
  IF FOUND THEN
    UPDATE public.games SET status = 'active', white = v_other.host, black = p_player,
      invitee = p_player, last_move_at = now(), expires_at = now() + interval '48 hours', updated_at = now()
      WHERE games.id = v_other.id AND games.status = 'waiting' AND games.expires_at > now()
      RETURNING * INTO v_other;
    IF v_other.id IS NOT NULL THEN RETURN QUERY SELECT v_other.id, 'active'; RETURN; END IF;
  END IF;

  UPDATE public.games SET status = 'expired', updated_at = now()
    WHERE games.kind = 'quick' AND games.status = 'waiting' AND games.host = p_player;
  INSERT INTO public.games (kind, host, expires_at)
    VALUES ('quick', p_player, now() + interval '25 seconds') RETURNING games.id INTO v_id;
  RETURN QUERY SELECT v_id, 'waiting';
END $$;
REVOKE ALL ON FUNCTION public.quick_match(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quick_match(uuid,uuid) TO service_role;