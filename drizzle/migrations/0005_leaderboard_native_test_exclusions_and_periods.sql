CREATE OR REPLACE FUNCTION public.leaderboard(p_kind text, p_country text)
RETURNS TABLE(player uuid, name text, avatar text, country text, player_number bigint, score bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH rows AS (
 SELECT white AS p, (result='w') AS won,finished_at,counts FROM public.matches
 UNION ALL SELECT black AS p,(result='b') AS won,finished_at,counts FROM public.matches
 ), scored AS (
 SELECT p,CASE WHEN p_kind='month' THEN count(*) ELSE count(*) FILTER(WHERE won) END AS score
 FROM rows WHERE counts AND finished_at >= (CASE p_kind WHEN 'week' THEN date_trunc('week',now() AT TIME ZONE 'Europe/Stockholm') WHEN 'month' THEN date_trunc('month',now() AT TIME ZONE 'Europe/Stockholm') ELSE date_trunc('year',now() AT TIME ZONE 'Europe/Stockholm') END AT TIME ZONE 'Europe/Stockholm') GROUP BY p
 ) SELECT pl.id,pl.name,pl.avatar,pl.country,pl.player_number,s.score FROM scored s JOIN public.players pl ON pl.id=s.p
 WHERE s.score>0 AND NOT pl.is_test AND (p_country IS NULL OR pl.country=p_country)
 ORDER BY s.score DESC,pl.player_number LIMIT CASE WHEN p_kind IN ('week','month') THEN 10 ELSE 50 END
$$;
REVOKE ALL ON FUNCTION public.leaderboard(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard(text,text) TO service_role;