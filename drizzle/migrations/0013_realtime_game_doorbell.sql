CREATE OR REPLACE FUNCTION public.chess_game_doorbell() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gid text;
BEGIN
  gid := CASE WHEN TG_TABLE_NAME = 'games' THEN NEW.id::text ELSE to_jsonb(NEW)->>'game' END;
  IF gid IS NOT NULL THEN
    BEGIN
      PERFORM realtime.send('{}'::jsonb, 'changed', 'chess-game-' || gid, false);
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chess_game_doorbell() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS chess_game_doorbell ON public.games;
CREATE TRIGGER chess_game_doorbell AFTER INSERT OR UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.chess_game_doorbell();
DO $$ BEGIN
  IF to_regclass('public.chat') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chat' AND column_name='game') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS chess_chat_doorbell ON public.chat';
    EXECUTE 'CREATE TRIGGER chess_chat_doorbell AFTER INSERT ON public.chat FOR EACH ROW EXECUTE FUNCTION public.chess_game_doorbell()';
  END IF;
END $$;