ALTER TABLE public.games
  ADD COLUMN draw_offers_w smallint NOT NULL DEFAULT 0,
  ADD COLUMN draw_offers_b smallint NOT NULL DEFAULT 0;

ALTER TABLE public.games
  ADD CONSTRAINT games_draw_offers_w_limit CHECK (draw_offers_w BETWEEN 0 AND 2),
  ADD CONSTRAINT games_draw_offers_b_limit CHECK (draw_offers_b BETWEEN 0 AND 2);