CREATE OR REPLACE FUNCTION public.chess_game_doorbell() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gid text;
BEGIN
  gid := CASE WHEN TG_TABLE_NAME = 'games' THEN NEW.id::text ELSE to_jsonb(NEW)->>'game_id' END;
  IF gid IS NOT NULL THEN
    BEGIN
      PERFORM realtime.send('{}'::jsonb, 'changed', 'chess-game-' || gid, false);
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chess_game_doorbell() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS chess_chat_doorbell ON public.game_chat;
CREATE TRIGGER chess_chat_doorbell AFTER INSERT ON public.game_chat FOR EACH ROW EXECUTE FUNCTION public.chess_game_doorbell();