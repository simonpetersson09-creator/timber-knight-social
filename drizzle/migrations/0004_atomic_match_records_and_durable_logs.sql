ALTER TABLE public.matches ADD COLUMN game_id uuid REFERENCES public.games(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX matches_game_once ON public.matches(game_id) WHERE game_id IS NOT NULL;
ALTER TABLE public.client_events ADD COLUMN event_id uuid;
CREATE UNIQUE INDEX client_events_delivery_once ON public.client_events(event_id) WHERE event_id IS NOT NULL;
ALTER TABLE public.client_events DROP CONSTRAINT client_events_kind_check;
ALTER TABLE public.client_events ADD CONSTRAINT client_events_kind_check CHECK(kind IN ('error','ad','play'));
CREATE OR REPLACE FUNCTION public.record_chess_completion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.status = 'finished' AND OLD.status = 'active' AND NEW.white IS NOT NULL AND NEW.black IS NOT NULL THEN
  INSERT INTO public.matches(game_id,white,black,result,counts) VALUES(NEW.id,NEW.white,NEW.black,NEW.result,NEW.end_reason <> 'resign');
  UPDATE public.players SET last_played=now() WHERE id IN (NEW.white,NEW.black);
 END IF;
 IF (NEW.pgn IS DISTINCT FROM OLD.pgn) OR (NEW.status IS DISTINCT FROM OLD.status) THEN
  INSERT INTO public.client_events(player,platform,kind,name,detail,event_id)
  SELECT NEW.host,p.platform,'play',CASE WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'game_' || NEW.status ELSE 'move_committed' END,
   json_build_object('game',NEW.id,'kind',NEW.kind,'reason',NEW.end_reason,'move',split_part(NEW.fen,' ',6))::text,gen_random_uuid()
  FROM public.players p WHERE p.id=NEW.host;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_chess_completion() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER chess_completion_and_log AFTER UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.record_chess_completion();
CREATE INDEX matches_stats_order ON public.matches(finished_at DESC,id) WHERE counts;
CREATE INDEX client_events_player_time ON public.client_events(player,created_at DESC);
CREATE OR REPLACE FUNCTION public.ingest_chess_event(p_player uuid,p_event uuid,p_kind text,p_name text,p_detail text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_platform text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_player::text,0));
 IF EXISTS(SELECT 1 FROM public.client_events WHERE event_id=p_event) THEN RETURN true; END IF;
 SELECT platform INTO v_platform FROM public.players WHERE id=p_player;
 IF v_platform IS NULL THEN RETURN false; END IF;
 IF (SELECT count(*) FROM public.client_events WHERE player=p_player AND created_at > now()-interval '1 minute') >= 120 THEN RETURN false; END IF;
 INSERT INTO public.client_events(player,platform,kind,name,detail,event_id) VALUES(p_player,v_platform,p_kind,left(p_name,80),left(p_detail,2000),p_event);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.ingest_chess_event(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_chess_event(uuid,uuid,text,text,text) TO service_role;